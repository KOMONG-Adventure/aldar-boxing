alter table public.students
  add column sibling_student_id text unique references public.students(id) on delete set null,
  add constraint students_no_self_sibling check (sibling_student_id is distinct from id);

create table public.payments (
  id uuid primary key,
  student_id text references public.students(id) on delete set null,
  student_name text not null,
  amount integer not null check (amount > 0),
  monthly_fee integer not null check (monthly_fee in (50000, 100000)),
  period_months integer not null check (period_months in (1,2,3,6)),
  start_date date not null,
  expire_date date not null check (expire_date > start_date),
  method text not null,
  note text not null default '',
  sibling_name text,
  created_at timestamptz not null default now()
);
create index payments_student_history_idx on public.payments(student_id, created_at desc);
create index payments_created_at_idx on public.payments(created_at desc, id);
alter table public.payments enable row level security;
revoke all on table public.payments from anon, authenticated;
grant select, insert, update, delete on table public.payments to service_role;

create function public.set_student_sibling(p_student_id text, p_sibling_id text)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_current public.students;
  v_other public.students;
begin
  perform pg_catalog.pg_advisory_xact_lock(82531001);
  select * into v_current from public.students where id=p_student_id for update;
  if not found then raise exception 'Сурагч олдсонгүй'; end if;
  if p_sibling_id is null then
    update public.students set sibling_student_id=null, updated_at=now()
      where id=p_student_id or (id=v_current.sibling_student_id and sibling_student_id=p_student_id);
    return;
  end if;
  if p_sibling_id=p_student_id then raise exception 'Өөрийг нь сонгох боломжгүй'; end if;
  select * into v_other from public.students where id=p_sibling_id for update;
  if not found then raise exception 'Сонгосон хүүхэд олдсонгүй'; end if;
  if v_current.sibling_student_id is not null and v_current.sibling_student_id <> p_sibling_id then
    raise exception 'Одоогийн холбоосыг эхлээд салгана уу';
  end if;
  if v_other.sibling_student_id is not null and v_other.sibling_student_id <> p_student_id then
    raise exception 'Сонгосон хүүхэд өөр сурагчтай холбогдсон байна';
  end if;
  update public.students set sibling_student_id=p_sibling_id, updated_at=now() where id=p_student_id;
  update public.students set sibling_student_id=p_student_id, updated_at=now() where id=p_sibling_id;
end;
$$;
revoke execute on function public.set_student_sibling(text,text) from public, anon, authenticated;
grant execute on function public.set_student_sibling(text,text) to service_role;

create function public.record_student_payment(
  p_id uuid, p_student_id text, p_period_months integer,
  p_start_date date, p_method text, p_note text, p_expected_fee integer
)
returns public.payments language plpgsql security invoker set search_path = '' as $$
declare
  v_student public.students;
  v_sibling public.students;
  v_payment public.payments;
  v_fee integer := 100000;
  v_expiry date;
begin
  perform pg_catalog.pg_advisory_xact_lock(82531001);
  select * into v_payment from public.payments where id=p_id;
  if found then
    if v_payment.student_id is distinct from p_student_id
      or v_payment.period_months is distinct from p_period_months
      or v_payment.start_date is distinct from p_start_date
      or v_payment.method is distinct from p_method
      or v_payment.note is distinct from coalesce(p_note,'') then
      raise exception 'Давтан хүсэлтийн мэдээлэл зөрүүтэй байна';
    end if;
    return v_payment;
  end if;
  if p_period_months is null or p_period_months not in (1,2,3,6)
    or p_start_date is null or p_method is null or length(trim(p_method))=0 then
    raise exception 'Төлбөрийн хугацаа, огноо, хэлбэрийг зөв оруулна уу';
  end if;
  select * into v_student from public.students where id=p_student_id for update;
  if not found then raise exception 'Сурагч олдсонгүй'; end if;
  if v_student.sibling_student_id is not null then
    select * into v_sibling from public.students
      where id=v_student.sibling_student_id and sibling_student_id=p_student_id;
    if found then v_fee := 50000; end if;
  end if;
  if p_expected_fee is distinct from v_fee then
    raise exception 'Сарын тариф өөрчлөгдсөн байна. Мэдээллээ шинэчилж дахин оролдоно уу';
  end if;
  v_expiry := (p_start_date + pg_catalog.make_interval(months => p_period_months))::date;
  insert into public.payments(id,student_id,student_name,amount,monthly_fee,period_months,start_date,expire_date,method,note,sibling_name)
    values(p_id,p_student_id,trim(v_student.last_name || ' ' || v_student.name),
      v_fee*p_period_months,v_fee,p_period_months,p_start_date,v_expiry,p_method,coalesce(p_note,''),
      case when v_fee=50000 then trim(v_sibling.last_name || ' ' || v_sibling.name) else null end)
    returning * into v_payment;
  update public.students set status='PAID', payment_date=p_start_date::text,
    expire_date=v_expiry::text, updated_at=now() where id=p_student_id;
  return v_payment;
end;
$$;
revoke execute on function public.record_student_payment(uuid,text,integer,date,text,text,integer) from public, anon, authenticated;
grant execute on function public.record_student_payment(uuid,text,integer,date,text,text,integer) to service_role;

create function public.delete_student_registration(p_student_id text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(82531001);
  delete from public.students where id=p_student_id;
end;
$$;
revoke execute on function public.delete_student_registration(text) from public, anon, authenticated;
grant execute on function public.delete_student_registration(text) to service_role;

create or replace function public.record_student_payment(
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
  v_due_day integer := 20;
  v_due_month date;
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
  select case when value->>'paymentDueDay' ~ '^([1-9]|[12][0-9]|3[01])$'
    then (value->>'paymentDueDay')::integer else 20 end
    into v_due_day from public.app_settings where id=true;
  v_due_month := (date_trunc('month', p_start_date::timestamp) + make_interval(months => p_period_months))::date;
  v_expiry := least(v_due_month + (coalesce(v_due_day, 20) - 1), (v_due_month + interval '1 month - 1 day')::date);
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

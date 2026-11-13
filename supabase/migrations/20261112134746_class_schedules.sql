create table public.sessions (
  id text primary key,
  title text not null check(length(trim(title)) between 1 and 150),
  coach text not null default '',
  capacity smallint not null check(capacity between 1 and 100),
  schedule_type text not null check(schedule_type in ('recurring','single')),
  specific_date date,
  start_date date,
  end_date date,
  creation_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((schedule_type='single' and specific_date is not null) or (schedule_type='recurring' and specific_date is null)),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create table public.session_time_slots (
  session_id text not null references public.sessions(id) on delete cascade,
  day_of_week smallint not null check(day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  primary key(session_id, day_of_week, start_time),
  check(end_time > start_time)
);
create table public.session_enrollments (
  session_id text not null references public.sessions(id) on delete cascade,
  student_id text not null references public.students(id) on delete cascade,
  primary key(session_id,student_id)
);
create index session_enrollments_student_idx on public.session_enrollments(student_id);
create index sessions_created_at_idx on public.sessions(created_at desc,id);
alter table public.sessions enable row level security;
alter table public.session_time_slots enable row level security;
alter table public.session_enrollments enable row level security;
revoke all on table public.sessions, public.session_time_slots, public.session_enrollments from anon, authenticated;
grant select,insert,update,delete on table public.sessions, public.session_time_slots, public.session_enrollments to service_role;

create function public.save_training_session(p_id text,p_payload jsonb,p_create boolean)
returns void language plpgsql security invoker set search_path='' as $$
declare
  v_existing public.sessions;
  v_fingerprint text := md5(p_payload::text);
  v_capacity integer := (p_payload->>'capacity')::integer;
  v_type text := p_payload->>'scheduleType';
  v_specific date := nullif(p_payload->>'specificDate','')::date;
  v_member_ids text[];
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('training_session:' || p_id,0));
  select * into v_existing from public.sessions where id=p_id for update;
  if found then
    if p_create then
      if v_existing.creation_fingerprint=v_fingerprint then return; end if;
      raise exception 'Энэ ангийг өмнө үүсгэсэн байна. Мэдээллээ шинэчилнэ үү';
    end if;
  elsif not p_create then
    raise exception 'Анги олдсонгүй';
  end if;
  if v_capacity is null or v_capacity < 1 or v_capacity > 100 then
    raise exception 'Багтаамж 1–100 хүн байна';
  end if;
  if jsonb_typeof(p_payload->'timeSlots') is distinct from 'array'
    or jsonb_array_length(p_payload->'timeSlots') not between 1 and 49 then
    raise exception 'Бэлтгэлийн өдөр, цагийг сонгоно уу';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_payload->'timeSlots') a
    where (a->>'dayOfWeek')::integer not between 1 and 7
      or (a->>'startTime')::time >= (a->>'endTime')::time
  ) then raise exception 'Өдөр, эхлэх болон дуусах цагийг шалгана уу'; end if;
  if exists (
    select 1
    from jsonb_array_elements(p_payload->'timeSlots') with ordinality a(slot,ord)
    join jsonb_array_elements(p_payload->'timeSlots') with ordinality b(slot,ord) on a.ord < b.ord
    where a.slot->>'dayOfWeek'=b.slot->>'dayOfWeek'
      and (a.slot->>'startTime')::time < (b.slot->>'endTime')::time
      and (b.slot->>'startTime')::time < (a.slot->>'endTime')::time
  ) then raise exception 'Сонгосон өдөр, цаг давхцаж байна'; end if;
  if v_type='single' and (v_specific is null or exists (
    select 1 from jsonb_array_elements(p_payload->'timeSlots') a
    where (a->>'dayOfWeek')::integer <> extract(isodow from v_specific)::integer
  )) then raise exception 'Бэлтгэлийн өдөр сонгосон огноотой таарахгүй байна'; end if;
  select coalesce(array_agg(distinct value order by value),'{}'::text[]) into v_member_ids
    from jsonb_array_elements_text(coalesce(p_payload->'enrolledMemberIds','[]'::jsonb));
  if cardinality(v_member_ids)>v_capacity then raise exception 'Сонгосон сурагчдын тоо багтаамжаас хэтэрсэн байна'; end if;
  if p_create then
    insert into public.sessions(id,title,coach,capacity,schedule_type,specific_date,start_date,end_date,creation_fingerprint)
    values(p_id,trim(p_payload->>'title'),coalesce(p_payload->>'coach',''),v_capacity,v_type,v_specific,
      nullif(p_payload->>'startDate','')::date,nullif(p_payload->>'endDate','')::date,v_fingerprint);
  else
    update public.sessions set title=trim(p_payload->>'title'),coach=coalesce(p_payload->>'coach',''),
      capacity=v_capacity,schedule_type=v_type,specific_date=v_specific,
      start_date=nullif(p_payload->>'startDate','')::date,end_date=nullif(p_payload->>'endDate','')::date,
      updated_at=now() where id=p_id;
  end if;
  delete from public.session_time_slots where session_id=p_id;
  insert into public.session_time_slots(session_id,day_of_week,start_time,end_time)
    select p_id,(slot->>'dayOfWeek')::smallint,(slot->>'startTime')::time,(slot->>'endTime')::time
    from jsonb_array_elements(p_payload->'timeSlots') slot;
  delete from public.session_enrollments where session_id=p_id;
  insert into public.session_enrollments(session_id,student_id) select p_id,unnest(v_member_ids);
end;
$$;
revoke execute on function public.save_training_session(text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.save_training_session(text,jsonb,boolean) to service_role;

create function public.set_session_enrollment(p_id text,p_student_id text,p_action text,p_member_ids text[] default null)
returns void language plpgsql security invoker set search_path='' as $$
declare
  v_capacity integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('training_session:' || p_id,0));
  select capacity into v_capacity from public.sessions where id=p_id for update;
  if not found then raise exception 'Анги олдсонгүй'; end if;
  if p_member_ids is not null then
    if cardinality(array(select distinct unnest(p_member_ids)))>v_capacity then
      raise exception 'Сурагчдын тоо багтаамжаас хэтэрсэн байна';
    end if;
    delete from public.session_enrollments where session_id=p_id;
    insert into public.session_enrollments(session_id,student_id)
      select distinct p_id,unnest(p_member_ids);
  elsif p_action='ENROLL' and p_student_id is not null then
    if not exists(select 1 from public.session_enrollments where session_id=p_id and student_id=p_student_id) then
      if (select count(*) from public.session_enrollments where session_id=p_id)>=v_capacity then
        raise exception 'Ангийн багтаамж дүүрсэн байна';
      end if;
      insert into public.session_enrollments(session_id,student_id) values(p_id,p_student_id);
    end if;
  elsif p_action='UNENROLL' and p_student_id is not null then
    delete from public.session_enrollments where session_id=p_id and student_id=p_student_id;
  else raise exception 'Сурагчийн сонголтыг шалгана уу';
  end if;
end;
$$;
revoke execute on function public.set_session_enrollment(text,text,text,text[]) from public,anon,authenticated;
grant execute on function public.set_session_enrollment(text,text,text,text[]) to service_role;

create function public.delete_training_session(p_id text)
returns void language plpgsql security invoker set search_path='' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('training_session:' || p_id,0));
  delete from public.sessions where id=p_id;
end;
$$;
revoke execute on function public.delete_training_session(text) from public,anon,authenticated;
grant execute on function public.delete_training_session(text) to service_role;

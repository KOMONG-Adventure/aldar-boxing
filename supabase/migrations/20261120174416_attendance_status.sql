alter table public.attendance_records add column status text not null default 'present' check (status in ('present','sick','absent'));
create function public.set_training_attendance_status(p_session text,p_students text[],p_date date,p_status text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_session,0));
 if not exists(select 1 from public.sessions s where s.id=p_session
   and (s.start_date is null or s.start_date<=p_date) and (s.end_date is null or s.end_date>=p_date)
   and (s.schedule_type<>'single' or s.specific_date=p_date)
   and exists(select 1 from public.session_time_slots t where t.session_id=s.id and t.day_of_week=extract(isodow from p_date)))
 then raise exception 'This class does not occur on this date'; end if;
 if cardinality(p_students)>100 or cardinality(p_students)=0 then raise exception 'Invalid students'; end if;
 if exists(select 1 from unnest(p_students) id where not exists(select 1 from public.students where students.id=id))
 then raise exception 'Student not found'; end if;
 if p_status is not null and p_status not in ('present','sick','absent') then raise exception 'Invalid status'; end if;
 if p_status is not null then
   insert into public.attendance_records(session_id,student_id,date,check_in_time,status)
   select p_session,id,p_date,to_char(now() at time zone 'Asia/Ulaanbaatar','HH24:MI'),p_status from unnest(p_students) id
   on conflict(session_id,student_id,date) do update set status=excluded.status, check_in_time=case when attendance_records.status=excluded.status then attendance_records.check_in_time else excluded.check_in_time end;
 else
   delete from public.attendance_records where session_id=p_session and student_id=any(p_students) and date=p_date;
 end if;
end;
$$;
revoke all on function public.set_training_attendance_status(text,text[],date,text) from public,anon,authenticated;
grant execute on function public.set_training_attendance_status(text,text[],date,text) to service_role;

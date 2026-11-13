create table public.teacher_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null check (username ~ '^[a-z0-9._-]{3,40}$'),
 name text not null, login_email text unique not null, enabled boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.teacher_invitations (
 token_hash text primary key,
 expires_at timestamptz not null default now() + interval '48 hours',
 used_at timestamptz
);
create function public.accept_teacher_invitation(p_hash text, p_user uuid, p_username text, p_name text, p_email text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
 perform 1 from public.teacher_invitations where token_hash=p_hash and used_at is null and expires_at>now() for update;
 if not found then raise exception 'Invitation expired'; end if;
 insert into public.teacher_profiles(user_id,username,name,login_email) values(p_user,p_username,p_name,p_email);
 update public.teacher_invitations set used_at=now() where token_hash=p_hash;
end;
$$;
create table public.attendance_records (
 id uuid primary key default gen_random_uuid(),
 session_id text not null references public.sessions(id) on delete cascade,
 student_id text not null references public.students(id) on delete cascade,
 date date not null, check_in_time text not null,
 unique(session_id,student_id,date)
);
create index attendance_student_idx on public.attendance_records(student_id,date);
create index attendance_date_idx on public.attendance_records(date,session_id);
create table public.financial_logs (
 id uuid primary key default gen_random_uuid(), type text not null check(type in ('INCOME','EXPENSE')),
 title text not null, amount integer not null check(amount>0), category text not null, date date not null,
 created_at timestamptz not null default now()
);
create table public.student_fights (
 id uuid primary key default gen_random_uuid(), student_id text not null references public.students(id) on delete cascade,
 date date not null, opponent text not null, result text not null check(result in ('WIN','LOSS','DRAW')),
 tournament text not null, method text not null, weight_category text not null,
 created_at timestamptz not null default now()
);
create index fights_student_idx on public.student_fights(student_id,date desc);
create table public.app_settings (id boolean primary key default true check(id), value jsonb not null);
create table public.app_notifications (
 id uuid primary key default gen_random_uuid(), title text not null, message text not null,
 time timestamptz not null default now(), type text not null default 'info', read boolean not null default false
);
create function public.set_training_attendance(p_session text,p_students text[],p_date date,p_present boolean)
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
 if p_present then
   insert into public.attendance_records(session_id,student_id,date,check_in_time)
   select p_session,id,p_date,to_char(now() at time zone 'Asia/Ulaanbaatar','HH24:MI') from unnest(p_students) id
   on conflict(session_id,student_id,date) do nothing;
 else
   delete from public.attendance_records where session_id=p_session and student_id=any(p_students) and date=p_date;
 end if;
end;
$$;
alter table public.teacher_profiles enable row level security;
alter table public.teacher_invitations enable row level security;
alter table public.attendance_records enable row level security;
alter table public.financial_logs enable row level security;
alter table public.student_fights enable row level security;
alter table public.app_settings enable row level security;
alter table public.app_notifications enable row level security;
revoke all on public.teacher_profiles,public.teacher_invitations,public.attendance_records,public.financial_logs,public.student_fights,public.app_settings,public.app_notifications from anon,authenticated;
grant all on public.teacher_profiles,public.teacher_invitations,public.attendance_records,public.financial_logs,public.student_fights,public.app_settings,public.app_notifications to service_role;
revoke all on function public.accept_teacher_invitation(text,uuid,text,text,text), public.set_training_attendance(text,text[],date,boolean) from public,anon,authenticated;
grant execute on function public.accept_teacher_invitation(text,uuid,text,text,text), public.set_training_attendance(text,text[],date,boolean) to service_role;

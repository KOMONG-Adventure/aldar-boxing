alter table public.teacher_profiles add column role text not null default 'teacher' check (role in ('teacher','super_admin'));
update public.teacher_profiles set role='super_admin' where username='angrg' and enabled;
update public.teacher_invitations set expires_at=least(expires_at,now()) where used_at is null;

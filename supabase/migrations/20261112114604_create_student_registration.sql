create table public.students (
  id text primary key,
  last_name text not null default '',
  name text not null check (length(trim(name)) between 1 and 120),
  phone text not null check (length(trim(phone)) between 1 and 30),
  birth_date text not null default '',
  register_number text not null default '',
  gender text not null default '',
  level text not null default 'Beginner',
  joined_date text not null default '',
  weight text not null default '',
  height text not null default '',
  family_count text not null default '',
  blood_type text not null default '',
  district text not null default '',
  address_detail text not null default '',
  guardians jsonb not null default '[]'::jsonb check (jsonb_typeof(guardians) = 'array'),
  status text not null default 'UNPAID' check (status in ('PAID', 'UNPAID')),
  payment_date text not null default '',
  expire_date text not null default '',
  notes text not null default '',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index students_created_at_id_idx on public.students (created_at desc, id desc);
alter table public.students enable row level security;
revoke all on table public.students from anon, authenticated;
grant select, insert, update, delete on table public.students to service_role;
comment on table public.students is 'ALDAR student registration. Server-only access; attendance, sessions, financial ledger remain local.';
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-photos', 'student-photos', false, 5242880, array['image/jpeg','image/png','image/webp']);

alter table public.app_notifications add column student_id text references public.students(id) on delete cascade;
alter table public.app_notifications add column context text unique;
create index notification_student_idx on public.app_notifications(student_id);
create function public.notify_student_registration() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.app_notifications(title,message,type,student_id,context)
 values('Шинэ сурагч бүртгэгдлээ',concat_ws(' ',new.last_name,new.name)||' сурагчийн бүртгэл үүслээ.','success',new.id,'registration:'||new.id);
 return new;
end;
$$;
revoke all on function public.notify_student_registration() from public,anon,authenticated;
create trigger student_registration_notification after insert on public.students for each row execute function public.notify_student_registration();
create function public.refresh_payment_reminders() returns void language plpgsql security invoker set search_path='' as $$
begin
 if coalesce((select (value->>'smsNotification')::boolean from public.app_settings where id=true),false) then
  insert into public.app_notifications(title,message,type,student_id,context)
  select 'Төлбөрийн сануулга',concat_ws(' ',s.last_name,s.name)||' сурагчийн төлбөрийн хугацаа дууссан.','alert',s.id,'expiry:'||s.id||':'||coalesce(s.expire_date::text,'unpaid')
  from public.students s
  where s.status='UNPAID' or s.expire_date < (now() at time zone 'Asia/Ulaanbaatar')::date
  on conflict(context) do nothing;
 end if;
end;
$$;
revoke all on function public.refresh_payment_reminders() from public,anon,authenticated;
grant execute on function public.refresh_payment_reminders() to service_role;

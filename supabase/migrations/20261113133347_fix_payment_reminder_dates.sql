create or replace function public.refresh_payment_reminders() returns void language plpgsql security invoker set search_path='' as $$
begin
 if coalesce((select (value->>'smsNotification')::boolean from public.app_settings where id=true),false) then
  insert into public.app_notifications(title,message,type,student_id,context)
  select 'Төлбөрийн сануулга',concat_ws(' ',s.last_name,s.name)||' сурагчийн төлбөрийн хугацаа дууссан.','alert',s.id,'expiry:'||s.id||':'||coalesce(nullif(s.expire_date,''),'unpaid')
  from public.students s
  where s.status='UNPAID' or (s.expire_date <> '' and s.expire_date < to_char(now() at time zone 'Asia/Ulaanbaatar','YYYY-MM-DD'))
  on conflict(context) do nothing;
 end if;
end;
$$;
revoke all on function public.refresh_payment_reminders() from public,anon,authenticated;
grant execute on function public.refresh_payment_reminders() to service_role;

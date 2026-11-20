alter table public.payments add column receipt_path text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts', 'payment-receipts', false, 4194304, array['image/png','image/jpeg','image/webp']);

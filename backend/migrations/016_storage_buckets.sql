begin;

insert into storage.buckets (id, name, public)
values
  ('brand', 'brand', true),
  ('wines', 'wines', true),
  ('events', 'events', true),
  ('experiences', 'experiences', true),
  ('promotions', 'promotions', true),
  ('avatars', 'avatars', false),
  ('documents', 'documents', false),
  ('campaigns', 'campaigns', false),
  ('delivery-evidence', 'delivery-evidence', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists public_bucket_read on storage.objects;
create policy public_bucket_read on storage.objects
for select to anon, authenticated
using (bucket_id in ('brand', 'wines', 'events', 'experiences', 'promotions'));

drop policy if exists admin_storage_all on storage.objects;
create policy admin_storage_all on storage.objects
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists avatar_owner_read on storage.objects;
create policy avatar_owner_read on storage.objects
for select to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and name like auth.uid()::text || '/%'
);

drop policy if exists avatar_owner_write on storage.objects;
create policy avatar_owner_write on storage.objects
for insert to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and name like auth.uid()::text || '/%'
);

drop policy if exists avatar_owner_update on storage.objects;
create policy avatar_owner_update on storage.objects
for update to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and name like auth.uid()::text || '/%'
)
with check (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and name like auth.uid()::text || '/%'
);

drop policy if exists avatar_owner_delete on storage.objects;
create policy avatar_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid() is not null
  and name like auth.uid()::text || '/%'
);

commit;

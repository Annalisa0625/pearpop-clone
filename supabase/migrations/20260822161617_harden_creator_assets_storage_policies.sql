-- Restrict Creator asset writes to the authenticated owner's UUID-prefixed path.
-- The bucket remains public for reads; only its three write policies change here.

drop policy if exists "creator_assets_authenticated_insert" on storage.objects;
drop policy if exists "creator_assets_authenticated_update" on storage.objects;
drop policy if exists "creator_assets_authenticated_delete" on storage.objects;

create policy "creator_assets_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'creator-assets'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and owner_id = (select auth.uid()::text)
);

create policy "creator_assets_authenticated_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'creator-assets'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'creator-assets'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and owner_id = (select auth.uid()::text)
);

create policy "creator_assets_authenticated_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'creator-assets'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and owner_id = (select auth.uid()::text)
);

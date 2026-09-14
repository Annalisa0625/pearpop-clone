drop policy if exists creator_menus_insert_own on public.creator_menus;

create policy creator_menus_insert_own
  on public.creator_menus
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.creators as c
      where c.id = creator_menus.creator_id
        and c.user_id = auth.uid()
        and c.country = '日本'
    )
  );

drop policy if exists creator_menus_update_own on public.creator_menus;

create policy creator_menus_update_own
  on public.creator_menus
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.creators as c
      where c.id = creator_menus.creator_id
        and c.user_id = auth.uid()
        and c.country = '日本'
    )
  )
  with check (
    exists (
      select 1
      from public.creators as c
      where c.id = creator_menus.creator_id
        and c.user_id = auth.uid()
        and c.country = '日本'
    )
  );

drop policy if exists creator_menus_delete_own on public.creator_menus;

create policy creator_menus_delete_own
  on public.creator_menus
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.creators as c
      where c.id = creator_menus.creator_id
        and c.user_id = auth.uid()
        and c.country = '日本'
    )
  );

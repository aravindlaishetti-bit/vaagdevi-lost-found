-- ============================================================================
-- Storage: bucket for item photos
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

create policy "anyone authenticated can view item images"
  on storage.objects for select
  using (bucket_id = 'item-images' and auth.role() = 'authenticated');

create policy "authenticated users can upload item images"
  on storage.objects for insert
  with check (bucket_id = 'item-images' and auth.role() = 'authenticated');

create policy "owners can delete their item images"
  on storage.objects for delete
  using (bucket_id = 'item-images' and owner = auth.uid());

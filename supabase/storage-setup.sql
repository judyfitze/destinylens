-- Create storage bucket for dashboard images
-- Run this in Supabase SQL Editor

-- Create the bucket
insert into storage.buckets (id, name, public)
values ('dashboard-images', 'dashboard-images', true)
on conflict (id) do nothing;

-- Allow public access to the bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'dashboard-images' );

-- Allow authenticated users to upload
create policy "Authenticated users can upload images"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'dashboard-images' );

-- Allow users to update their own images
create policy "Users can update own images"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'dashboard-images' and auth.uid()::text = (storage.foldername(name))[1] );

-- Allow users to delete their own images  
create policy "Users can delete own images"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'dashboard-images' and auth.uid()::text = (storage.foldername(name))[1] );

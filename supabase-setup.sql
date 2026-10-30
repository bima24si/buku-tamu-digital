-- Buku Tamu Digital Supabase setup.
-- These anon policies are for a private development/test project only:
-- anyone with the app URL can read, add, edit, and delete guest records/photos.
-- Before public deployment, add staff login and replace "anon" policies with
-- equivalent policies for "authenticated".

create table if not exists public.guest_visits (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  organization text not null,
  visit_purpose text not null,
  people_count integer not null check (people_count >= 1),
  visit_date date not null,
  arrival_time time not null,
  departure_time time not null,
  arrived_at timestamptz,
  departed_at timestamptz,
  photo_path text not null,
  created_at timestamptz not null default now()
);

alter table public.guest_visits enable row level security;
grant usage on schema public to anon;
grant select, insert, update, delete on table public.guest_visits to anon;

drop policy if exists "guest visits anon select" on public.guest_visits;
create policy "guest visits anon select"
on public.guest_visits for select to anon
using (true);

drop policy if exists "guest visits anon insert" on public.guest_visits;
create policy "guest visits anon insert"
on public.guest_visits for insert to anon
with check (true);

drop policy if exists "guest visits anon update" on public.guest_visits;
create policy "guest visits anon update"
on public.guest_visits for update to anon
using (true) with check (true);

drop policy if exists "guest visits anon delete" on public.guest_visits;
create policy "guest visits anon delete"
on public.guest_visits for delete to anon
using (true);

insert into storage.buckets (id, name, public)
values ('guest-photos', 'guest-photos', false)
on conflict (id) do update set public = false;

grant select, insert, update, delete on storage.objects to anon;

drop policy if exists "guest photos anon select" on storage.objects;
create policy "guest photos anon select"
on storage.objects for select to anon
using (bucket_id = 'guest-photos');

drop policy if exists "guest photos anon insert" on storage.objects;
create policy "guest photos anon insert"
on storage.objects for insert to anon
with check (bucket_id = 'guest-photos');

drop policy if exists "guest photos anon update" on storage.objects;
create policy "guest photos anon update"
on storage.objects for update to anon
using (bucket_id = 'guest-photos')
with check (bucket_id = 'guest-photos');

drop policy if exists "guest photos anon delete" on storage.objects;
create policy "guest photos anon delete"
on storage.objects for delete to anon
using (bucket_id = 'guest-photos');

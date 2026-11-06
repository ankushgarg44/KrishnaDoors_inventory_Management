-- Run once in Supabase SQL Editor to let the app work without login.
drop policy if exists "auth all companies" on public.companies;
drop policy if exists "auth all items" on public.items;
drop policy if exists "auth all stock" on public.stock;

create policy "auth all companies" on public.companies
  for all to anon, authenticated using (true) with check (true);
create policy "auth all items" on public.items
  for all to anon, authenticated using (true) with check (true);
create policy "auth all stock" on public.stock
  for all to anon, authenticated using (true) with check (true);

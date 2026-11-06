-- Inventory schema: run this once in Supabase Dashboard → SQL Editor.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- One row per (item, company): the quantity on hand.
create table if not exists public.stock (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  unique (item_id, company_id)
);

create index if not exists stock_item_idx on public.stock(item_id);
create index if not exists stock_company_idx on public.stock(company_id);

-- Atomic +/- so two phones tapping at once never lose an update.
create or replace function public.adjust_stock(p_stock_id uuid, p_delta integer)
returns integer
language sql
security invoker
as $$
  update public.stock
     set quantity = greatest(quantity + p_delta, 0),
         updated_at = now()
   where id = p_stock_id
  returning quantity;
$$;

-- No login: the app uses the public (anon) key, so anon can read and write.
alter table public.companies enable row level security;
alter table public.items enable row level security;
alter table public.stock enable row level security;

drop policy if exists "auth all companies" on public.companies;
drop policy if exists "auth all items" on public.items;
drop policy if exists "auth all stock" on public.stock;

create policy "auth all companies" on public.companies
  for all to anon, authenticated using (true) with check (true);
create policy "auth all items" on public.items
  for all to anon, authenticated using (true) with check (true);
create policy "auth all stock" on public.stock
  for all to anon, authenticated using (true) with check (true);

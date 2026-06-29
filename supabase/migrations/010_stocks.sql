create table if not exists stocks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users not null,
  nom             text not null,
  reference       text,
  unite           text not null default 'g',
  quantite        numeric not null default 0,
  seuil_alerte    numeric not null default 0,
  biocide_product_id uuid references biocide_products(id) on delete set null,
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

alter table stocks enable row level security;
create policy "stocks_owner" on stocks for all using (auth.uid() = user_id);

create table if not exists stock_mouvements (
  id              uuid primary key default gen_random_uuid(),
  stock_id        uuid references stocks(id) on delete cascade not null,
  type            text not null check (type in ('entree', 'sortie')),
  quantite        numeric not null,
  note            text,
  intervention_id uuid references interventions(id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table stock_mouvements enable row level security;
create policy "mouvements_owner" on stock_mouvements for all
  using (exists (select 1 from stocks s where s.id = stock_id and s.user_id = auth.uid()));

create index if not exists stocks_user_id_idx on stocks (user_id);
create index if not exists mouvements_stock_id_idx on stock_mouvements (stock_id);

create table if not exists contrats (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references auth.users not null,
  dolibarr_tiers_id     integer not null,
  dolibarr_contract_id  integer,
  dolibarr_contract_ref text,
  client_name           text not null,
  client_address        text,
  intervention_type     text not null default 'rats',
  frequence             text not null default 'trimestriel',
  date_debut            date not null,
  date_fin              date,
  actif                 boolean not null default true,
  notes                 text,
  created_at            timestamptz default now()
);

alter table contrats enable row level security;

create policy "contrats_owner" on contrats
  for all using (auth.uid() = user_id);

create index if not exists contrats_user_id_idx on contrats (user_id);
create index if not exists contrats_tiers_id_idx on contrats (dolibarr_tiers_id);

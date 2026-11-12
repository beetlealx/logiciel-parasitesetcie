-- ============================================================
-- Migration 021 — Devis signés Dolibarr → interventions (V2 lot 1)
--   * devis_signes : un devis signé = un dossier (référence unique)
--   * typage_regles : mots-clés et calendrier des passages par type
--   * typage_produits : référence produit Dolibarr → type d'intervention
--   * devis_sync_log : journal des échanges avec Dolibarr
--   * interventions : lien vers le devis signé + n° de passage
--   * photos : phase avant / après
-- Idempotente. RLS « équipe » comme les migrations 016 / 018.
-- ============================================================

create table if not exists devis_signes (
  id                  uuid primary key default gen_random_uuid(),
  dolibarr_propal_id  int  not null unique,
  dolibarr_propal_ref text not null unique,
  dolibarr_tiers_id   int,
  client_name         text not null,
  client_address      text not null default '',
  client_email        text,
  ref_client          text,
  note_public         text,
  total_ht            numeric(12,2),
  lignes              jsonb not null default '[]',
  mode_facturation    text not null default 'par_passage'
    check (mode_facturation in ('par_passage', 'par_contrat')),
  statut              text not null default 'a_typer'
    check (statut in ('a_typer', 'actif', 'termine', 'annule')),
  alerte              text,
  source              text not null default 'webhook'
    check (source in ('webhook', 'cron', 'manuel')),
  signed_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists devis_signes_statut_idx on devis_signes (statut);
create index if not exists devis_signes_tiers_idx  on devis_signes (dolibarr_tiers_id);

drop trigger if exists devis_signes_updated_at on devis_signes;
create trigger devis_signes_updated_at
  before update on devis_signes
  for each row execute function set_updated_at();

create table if not exists typage_regles (
  intervention_type text primary key
    check (intervention_type in ('rats', 'frelons_guepes', 'punaises_lit', 'fourmis', 'cafards', 'moustiques')),
  keywords          text[] not null default '{}',
  schedule_offsets  int[]  not null default '{0}',   -- jours après la signature
  default_billing   text   not null default 'par_passage'
    check (default_billing in ('par_passage', 'par_contrat')),
  ordre             int    not null default 0
);

insert into typage_regles (intervention_type, keywords, schedule_offsets, default_billing, ordre) values
  ('rats',           '{rat,rats,souris,rongeur,rongeurs,deratisation,surmulot,surmulots,mulot,mulots}', '{0,15,30}', 'par_passage', 1),
  ('moustiques',     '{moustique,moustiques,demoustication,biogents,geyser,brumisation,"moustique tigre"}', '{0}', 'par_contrat', 2),
  ('cafards',        '{blatte,blattes,cafard,cafards,blattella}', '{0,15}', 'par_passage', 3),
  ('punaises_lit',   '{punaise,punaises,"punaises de lit"}', '{0,15}', 'par_passage', 4),
  ('fourmis',        '{fourmi,fourmis}', '{0}', 'par_passage', 5),
  ('frelons_guepes', '{frelon,frelons,guepe,guepes}', '{0}', 'par_passage', 6)
on conflict (intervention_type) do nothing;

create table if not exists typage_produits (
  dolibarr_product_ref text primary key,
  intervention_type    text not null references typage_regles (intervention_type) on delete cascade,
  created_at           timestamptz not null default now()
);

create table if not exists devis_sync_log (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  source      text not null,
  propal_id   int,
  propal_ref  text,
  ok          boolean not null,
  message     text
);
create index if not exists devis_sync_log_created_idx on devis_sync_log (created_at desc);

alter table interventions
  add column if not exists devis_signe_id uuid references devis_signes on delete set null,
  add column if not exists passage_numero int;
create index if not exists interventions_devis_signe_idx on interventions (devis_signe_id);

alter table photos add column if not exists phase text;
alter table photos drop constraint if exists photos_phase_check;
alter table photos add constraint photos_phase_check check (phase is null or phase in ('avant', 'apres'));

-- RLS : toute personne connectée (même modèle que 016 / 018)
alter table devis_signes    enable row level security;
alter table typage_regles   enable row level security;
alter table typage_produits enable row level security;
alter table devis_sync_log  enable row level security;

drop policy if exists devis_signes_team on devis_signes;
create policy devis_signes_team on devis_signes for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists typage_regles_team on typage_regles;
create policy typage_regles_team on typage_regles for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists typage_produits_team on typage_produits;
create policy typage_produits_team on typage_produits for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists devis_sync_log_read on devis_sync_log;
create policy devis_sync_log_read on devis_sync_log for select using (auth.uid() is not null);

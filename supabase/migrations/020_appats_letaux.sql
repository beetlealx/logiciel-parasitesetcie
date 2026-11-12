-- ============================================================
-- Migration 020 — Appâts létaux rongeurs
-- Règle légale : relevé obligatoire dans les 35 jours après pose
-- ============================================================

create table if not exists appats_letaux (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references auth.users not null,
  dolibarr_tiers_id      int,
  client_name            text not null,
  client_address         text,
  emplacement            text not null,               -- ex : "Cave Nord", "Local poubelles"
  intervention_pose_id   uuid references interventions(id) on delete set null,
  date_pose              date not null,
  date_releve_prevue     date not null,               -- date_pose + 35 jours
  date_releve_effective  date,
  intervention_releve_id uuid references interventions(id) on delete set null,
  indice_presence        text
    check (indice_presence in ('positif', 'negatif')),
  statut                 text not null default 'en_attente'
    check (statut in ('en_attente', 'relevé', 'archivé')),
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table appats_letaux enable row level security;

create policy "appats_letaux_owner" on appats_letaux
  for all using (auth.uid() = user_id);

create index if not exists appats_letaux_tiers_idx  on appats_letaux (dolibarr_tiers_id);
create index if not exists appats_letaux_statut_idx on appats_letaux (statut);
create index if not exists appats_letaux_user_idx   on appats_letaux (user_id);

create trigger appats_letaux_updated_at
  before update on appats_letaux
  for each row execute function set_updated_at();

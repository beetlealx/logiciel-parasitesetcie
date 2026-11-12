-- ============================================================
-- Migration 019 — Pièges anti-moustiques
-- BG-Gat, BG-Protector, BG-Counter
-- Suivi : gaz (mensuel mai–oct), attractifs (2 mois), plaques collantes
-- ============================================================

create table if not exists pieges_moustiques (
  id                           uuid primary key default gen_random_uuid(),
  user_id                      uuid references auth.users not null,
  dolibarr_tiers_id            int,
  client_name                  text not null,
  client_address               text,
  type_piege                   text not null
    check (type_piege in ('bg-gat', 'bg-protector', 'bg-counter')),
  numero                       text not null,          -- label libre, ex : "P1", "Terrasse"
  installation_intervention_id uuid references interventions(id) on delete set null,
  date_installation            date not null,
  date_dernier_gaz             date,                   -- mensuel mai–oct
  date_dernier_attractif       date,                   -- tous les 2 mois
  date_derniere_plaque         date,                   -- vérif plaque collante pondoir
  actif                        boolean not null default true,
  notes                        text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

alter table pieges_moustiques enable row level security;

create policy "pieges_moustiques_owner" on pieges_moustiques
  for all using (auth.uid() = user_id);

create index if not exists pieges_moustiques_tiers_idx on pieges_moustiques (dolibarr_tiers_id);
create index if not exists pieges_moustiques_user_idx  on pieges_moustiques (user_id);
create index if not exists pieges_moustiques_actif_idx on pieges_moustiques (actif);

create trigger pieges_moustiques_updated_at
  before update on pieges_moustiques
  for each row execute function set_updated_at();

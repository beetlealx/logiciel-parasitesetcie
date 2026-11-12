-- ============================================================
-- Migration 017 — Intégration Google Calendar
-- ============================================================

-- Colonne pour stocker l'ID de l'événement Google Calendar
alter table interventions add column if not exists google_event_id text;
create index if not exists interventions_google_event_id_idx on interventions (google_event_id);

-- Table de paramètres applicatifs (sync token, channel ID...)
create table if not exists app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table app_settings enable row level security;
-- Pas de politique RLS : accès uniquement via service role (côté serveur)

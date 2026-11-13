-- Migration 022 — Fiche de préparation (protocole) envoyée au client avant l'intervention
alter table interventions add column if not exists protocole_envoye_at timestamptz;
create index if not exists interventions_protocole_idx on interventions (intervention_date) where protocole_envoye_at is null and status = 'draft';

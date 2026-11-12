-- ============================================================
-- Migration 018 — Fix RLS policies (idempotent)
-- Ensures all team policies exist even if 016 was partially applied.
-- ============================================================

-- interventions
drop policy if exists "interventions_owner" on interventions;
drop policy if exists "interventions_team" on interventions;
create policy "interventions_team" on interventions
  for all using (auth.uid() is not null);

-- articles
drop policy if exists "articles_owner" on articles;
drop policy if exists "articles_team" on articles;
create policy "articles_team" on articles
  for all using (auth.uid() is not null);

-- intervention_prestations
drop policy if exists "intervention_prestations_owner" on intervention_prestations;
drop policy if exists "intervention_prestations_team" on intervention_prestations;
create policy "intervention_prestations_team" on intervention_prestations
  for all using (auth.uid() is not null);

-- photos
drop policy if exists "photos_owner" on photos;
drop policy if exists "photos_team" on photos;
create policy "photos_team" on photos
  for all using (auth.uid() is not null);

-- contrats
drop policy if exists "contrats_owner" on contrats;
drop policy if exists "contrats_team" on contrats;
create policy "contrats_team" on contrats
  for all using (auth.uid() is not null);

-- techniciens
drop policy if exists "Users manage own techniciens" on techniciens;
drop policy if exists "techniciens_team" on techniciens;
create policy "techniciens_team" on techniciens
  for all using (auth.uid() is not null);

-- site_infos
drop policy if exists "Users manage own site_infos" on site_infos;
drop policy if exists "site_infos_select" on site_infos;
drop policy if exists "site_infos_insert" on site_infos;
drop policy if exists "site_infos_update" on site_infos;
drop policy if exists "site_infos_delete" on site_infos;
create policy "site_infos_select" on site_infos
  for select using (auth.uid() is not null);
create policy "site_infos_insert" on site_infos
  for insert with check (auth.uid() = user_id);
create policy "site_infos_update" on site_infos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "site_infos_delete" on site_infos
  for delete using (auth.uid() = user_id);

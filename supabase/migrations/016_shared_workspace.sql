-- ============================================================
-- Migration 016 — Espace de travail partagé
-- Tous les utilisateurs authentifiés voient et gèrent toutes
-- les données métier (interventions, contrats, techniciens…).
-- Le champ user_id est conservé pour la traçabilité (qui a créé).
-- ============================================================

-- interventions
drop policy if exists "interventions_owner" on interventions;
create policy "interventions_team" on interventions
  for all using (auth.uid() is not null);

-- articles (anciennement postes)
drop policy if exists "articles_owner" on articles;
create policy "articles_team" on articles
  for all using (auth.uid() is not null);

-- intervention_prestations
drop policy if exists "intervention_prestations_owner" on intervention_prestations;
create policy "intervention_prestations_team" on intervention_prestations
  for all using (auth.uid() is not null);

-- photos
drop policy if exists "photos_owner" on photos;
create policy "photos_team" on photos
  for all using (auth.uid() is not null);

-- contrats
drop policy if exists "contrats_owner" on contrats;
create policy "contrats_team" on contrats
  for all using (auth.uid() is not null);

-- techniciens
drop policy if exists "Users manage own techniciens" on techniciens;
create policy "techniciens_team" on techniciens
  for all using (auth.uid() is not null);

-- site_infos : lecture partagée, chaque utilisateur gère ses propres fiches
drop policy if exists "Users manage own site_infos" on site_infos;
create policy "site_infos_select" on site_infos
  for select using (auth.uid() is not null);
create policy "site_infos_insert" on site_infos
  for insert with check (auth.uid() = user_id);
create policy "site_infos_update" on site_infos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "site_infos_delete" on site_infos
  for delete using (auth.uid() = user_id);

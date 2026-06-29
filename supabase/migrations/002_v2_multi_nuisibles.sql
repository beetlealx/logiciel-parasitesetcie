-- ============================================================
-- Migration 002 — Chantier A v2 Multi-nuisibles
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- Dump SQL avant exécution recommandé.
-- ============================================================


-- ------------------------------------------------------------
-- interventions : colonnes additionnelles
-- ------------------------------------------------------------

-- biocides existe déjà en prod (ajouté manuellement) — on aligne le schéma
alter table interventions add column if not exists biocides jsonb;

-- Type d'intervention (détermine templates, champs, prestations)
alter table interventions add column if not exists intervention_type text not null default 'rats'
  check (intervention_type in ('rats', 'frelons_guepes', 'punaises_lit', 'fourmis', 'cafards', 'moustiques', 'mixte'));

-- Les interventions v1 existantes sont toutes de type 'rats' (seule dératisation en v1)
-- Le DEFAULT 'rats' les remplit automatiquement à l'ajout de colonne.

-- Liens Dolibarr (workflow facturation complet — utilisés en chantier B)
alter table interventions add column if not exists dolibarr_devis_id int;
alter table interventions add column if not exists dolibarr_devis_ref text;
alter table interventions add column if not exists dolibarr_devis_statut text;
alter table interventions add column if not exists dolibarr_facture_id int;
alter table interventions add column if not exists dolibarr_facture_ref text;
alter table interventions add column if not exists dolibarr_facture_statut text;

-- Snapshot montants à la signature (remplis en chantier B)
alter table interventions add column if not exists montant_total_ht numeric(10,2);
alter table interventions add column if not exists montant_total_ttc numeric(10,2);


-- ------------------------------------------------------------
-- phrase_templates : scope par type d'intervention
-- ------------------------------------------------------------

-- Tableau vide = phrase universelle (toujours visible)
alter table phrase_templates add column if not exists intervention_types text[] default '{}';


-- ------------------------------------------------------------
-- postes → articles (renommage physique)
-- ------------------------------------------------------------

alter table postes rename to articles;


-- ------------------------------------------------------------
-- articles : nouvelles colonnes v2
-- ------------------------------------------------------------

-- Type d'article lié au type d'intervention courant
alter table articles add column if not exists article_type text not null default 'poste_appatage';
-- Valeurs : 'poste_appatage' (rats), 'nid_frelons', 'zone_punaises',
--           'point_fourmis', 'zone_cafards', 'zone_moustiques'

-- Champs de relevé génériques (structure variable selon article_type)
alter table articles add column if not exists releves jsonb default '{}'::jsonb;

-- Migration des données v1 : copie etat/consommation/traces/action → releves jsonb
-- Les colonnes sources sont conservées pour compatibilité (suppression en v3).
update articles
set releves = jsonb_strip_nulls(jsonb_build_object(
  'etat',         etat,
  'consommation', consommation,
  'traces',       traces,
  'action',       action
))
where etat is not null
   or consommation is not null
   or traces is not null
   or action is not null;


-- ------------------------------------------------------------
-- Mise à jour de la politique RLS articles (était postes_owner)
-- Le renommage de table conserve les policies existantes sous leur nom d'origine.
-- On recrée une policy nommée articles_owner pour la clarté.
-- ------------------------------------------------------------

drop policy if exists "postes_owner" on articles;

create policy "articles_owner" on articles
  for all using (
    exists (
      select 1 from interventions
      where interventions.id = articles.intervention_id
        and interventions.user_id = auth.uid()
    )
  );


-- ------------------------------------------------------------
-- TABLE : intervention_prestations
-- Stocke les prestations sélectionnées sur une intervention.
-- Le catalogue reste dans Dolibarr — pas de duplication côté Supabase.
-- ------------------------------------------------------------

create table if not exists intervention_prestations (
  id                        uuid primary key default gen_random_uuid(),
  intervention_id           uuid references interventions on delete cascade not null,
  dolibarr_product_id       int not null,
  libelle                   text not null,
  description               text,
  quantite                  numeric(10,2) not null default 1,
  prix_unitaire_ht          numeric(10,2) not null,
  prix_unitaire_ht_default  numeric(10,2) not null,
  taux_tva                  numeric(5,2) not null default 20.00,
  ordre                     int not null default 0
);

create index if not exists intervention_prestations_intervention_id_idx
  on intervention_prestations (intervention_id);

alter table intervention_prestations enable row level security;

create policy "intervention_prestations_owner" on intervention_prestations
  for all using (
    exists (
      select 1 from interventions
      where interventions.id = intervention_prestations.intervention_id
        and interventions.user_id = auth.uid()
    )
  );

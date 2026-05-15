-- ============================================================
-- Migration 001 — Schéma initial Parasites Compagnie
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================


-- ------------------------------------------------------------
-- TABLE : interventions
-- ------------------------------------------------------------
create table interventions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users not null,
  reference           text unique not null,           -- ex: INT-2026-0142
  -- Lien Dolibarr
  dolibarr_tiers_id   int,                            -- null si client hors Dolibarr
  dolibarr_action_id  int,                            -- ID action CRM créée après envoi
  -- Snapshot client au moment de l'intervention
  client_name         text not null,
  client_address      text not null,
  client_email        text,
  -- Intervention
  intervention_date   timestamptz not null default now(),
  technician_name     text not null default 'Alex M.',
  type_intervention   text,                           -- 'Contrôle mensuel', 'Dératisation', etc.
  plan_image_path     text,                           -- chemin Supabase Storage bucket 'plans'
  synthese            text,
  signature_data_url  text,                           -- base64 PNG de la signature
  signataire_nom      text,
  status              text not null default 'draft'   -- 'draft' | 'signed' | 'sent'
    check (status in ('draft', 'signed', 'sent')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index on interventions (user_id);
create index on interventions (dolibarr_tiers_id);
create index on interventions (status);


-- ------------------------------------------------------------
-- TABLE : postes
-- ------------------------------------------------------------
create table postes (
  id              uuid primary key default gen_random_uuid(),
  intervention_id uuid references interventions on delete cascade not null,
  label           text not null,       -- 'P1', 'P2', etc.
  x               numeric not null,    -- coordonnée dans le viewBox SVG
  y               numeric not null,
  etat            text check (etat in ('Intact', 'Dégradé', 'Manquant')),
  consommation    text check (consommation in ('Nulle', 'Partielle', 'Totale')),
  traces          text check (traces in ('Aucune', 'Déjections', 'Rongeurs')),
  action          text check (action in ('RAS', 'Renouvellement', 'Repositionnement')),
  ordre           int not null default 0
);

create index on postes (intervention_id);


-- ------------------------------------------------------------
-- TABLE : photos
-- ------------------------------------------------------------
create table photos (
  id              uuid primary key default gen_random_uuid(),
  intervention_id uuid references interventions on delete cascade not null,
  poste_id        uuid references postes on delete set null,
  storage_path    text not null,       -- chemin Supabase Storage bucket 'photos'
  caption         text,
  created_at      timestamptz not null default now()
);

create index on photos (intervention_id);


-- ------------------------------------------------------------
-- TABLE : phrase_templates
-- ------------------------------------------------------------
create table phrase_templates (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  label   text not null,    -- titre court affiché sur la puce
  content text not null,    -- phrase complète à insérer dans la synthèse
  ordre   int not null default 0
);

create index on phrase_templates (user_id);


-- ------------------------------------------------------------
-- FONCTION : mise à jour automatique de updated_at
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger interventions_updated_at
  before update on interventions
  for each row execute function set_updated_at();


-- ------------------------------------------------------------
-- STORAGE : création des buckets privés
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('plans',    'plans',    false),
  ('photos',   'photos',   false),
  ('rapports', 'rapports', false)
on conflict (id) do nothing;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table interventions    enable row level security;
alter table postes           enable row level security;
alter table photos           enable row level security;
alter table phrase_templates enable row level security;


-- interventions : l'utilisateur ne voit que ses propres interventions
create policy "interventions_owner" on interventions
  for all using (user_id = auth.uid());

-- postes : accessible si l'intervention appartient à l'utilisateur
create policy "postes_owner" on postes
  for all using (
    exists (
      select 1 from interventions
      where interventions.id = postes.intervention_id
        and interventions.user_id = auth.uid()
    )
  );

-- photos : même logique
create policy "photos_owner" on photos
  for all using (
    exists (
      select 1 from interventions
      where interventions.id = photos.intervention_id
        and interventions.user_id = auth.uid()
    )
  );

-- phrase_templates : l'utilisateur ne voit que ses propres phrases
create policy "phrase_templates_owner" on phrase_templates
  for all using (user_id = auth.uid());


-- Storage RLS : accès aux buckets privés pour l'utilisateur connecté
create policy "plans_owner" on storage.objects
  for all using (
    bucket_id = 'plans' and auth.uid() is not null
  );

create policy "photos_owner" on storage.objects
  for all using (
    bucket_id = 'photos' and auth.uid() is not null
  );

create policy "rapports_owner" on storage.objects
  for all using (
    bucket_id = 'rapports' and auth.uid() is not null
  );


-- ============================================================
-- DONNÉES DE TEST (3 phrases pré-enregistrées par défaut)
-- À insérer APRÈS avoir créé le compte utilisateur dans Supabase Auth.
-- Remplace 'TON-USER-ID' par l'UUID affiché dans Authentication → Users.
-- ============================================================

-- insert into phrase_templates (user_id, label, content, ordre) values
--   ('TON-USER-ID', 'Aucune trace',        'Aucune trace de nuisible observée lors de cette visite. ', 0),
--   ('TON-USER-ID', 'Renouvellement appâts','Renouvellement de l''appât effectué sur l''ensemble des postes. ', 1),
--   ('TON-USER-ID', 'Recommandation hygiène','Recommandation : nettoyage approfondi et obturation des points d''entrée. ', 2),
--   ('TON-USER-ID', 'Déjections réserve',  'Présence de déjections constatée au niveau de la réserve sèche. ', 3),
--   ('TON-USER-ID', 'Prochaine visite',    'Prochaine visite préconisée sous 4 semaines. ', 4),
--   ('TON-USER-ID', 'Pas de biocide',      'Aucun produit biocide appliqué lors de cette visite de contrôle. ', 5);

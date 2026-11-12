-- ============================================================
-- Migration 002 — V2 lot 1
--   * Profils et rôles (multi-utilisateur, comptes @parasites-compagnie.fr)
--   * Types de prestation + correspondances produits Dolibarr
--   * Dossiers (1 devis signé = 1 dossier) et prestations
--   * Passages = lignes de la table interventions existante (champs ajoutés)
--   * Zones et photos avant / après (moteur de rapport photo)
--   * Journal de synchronisation Dolibarr
--   * RLS : passage d'un modèle « propriétaire » à un modèle « équipe »
-- À exécuter dans : Supabase Dashboard → SQL Editor (en une fois).
-- Idempotente autant que possible (if not exists / on conflict).
-- ============================================================


-- ------------------------------------------------------------
-- 1. PROFILS
-- ------------------------------------------------------------
create table if not exists profiles (
  id                 uuid primary key references auth.users on delete cascade,
  email              text not null unique,
  full_name          text,
  role               text not null default 'technicien'
    check (role in ('gerant', 'technicien')),
  certibiocide       text,
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);

-- Comptes déjà existants (V1) : gérants, pour ne perdre aucun accès.
insert into profiles (id, email, full_name, role)
select u.id, u.email,
       coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
       'gerant'
from auth.users u
where u.email is not null
on conflict (id) do nothing;

-- Nouveau compte : profil créé uniquement pour le domaine de l'entreprise.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) like '%@parasites-compagnie.fr' then
    insert into profiles (id, email, full_name, role)
    values (
      new.id,
      lower(new.email),
      coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      case when lower(new.email) = 'alex@parasites-compagnie.fr' then 'gerant' else 'technicien' end
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active)
$$;

create or replace function public.is_gerant()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and active and role = 'gerant')
$$;


-- ------------------------------------------------------------
-- 2. TYPES DE PRESTATION + CORRESPONDANCES
-- ------------------------------------------------------------
create table if not exists prestation_types (
  code                 text primary key,
  label                text not null,
  module               text not null check (module in ('rongeurs', 'moustiques', 'photo')),
  keywords             text[] not null default '{}',
  schedule_offsets     int[]  not null default '{0}',   -- jours après la signature
  default_duration_min int    not null default 60,
  default_billing      text   not null default 'par_passage'
    check (default_billing in ('par_passage', 'par_contrat')),
  ordre                int    not null default 0
);

insert into prestation_types (code, label, module, keywords, schedule_offsets, default_duration_min, default_billing, ordre) values
  ('rongeurs',   'Rongeurs',                'rongeurs',   '{rat,rats,souris,rongeur,rongeurs,deratisation,surmulot,surmulots,mulot,mulots}', '{0,15,30}', 60,  'par_passage', 1),
  ('moustiques', 'Moustiques',              'moustiques', '{moustique,moustiques,demoustication,biogents,geyser,brumisation,"moustique tigre"}', '{0}', 150, 'par_contrat', 2),
  ('blattes',    'Blattes',                 'photo',      '{blatte,blattes,cafard,cafards,blattella}', '{0,15}', 60, 'par_passage', 3),
  ('punaises',   'Punaises de lit',         'photo',      '{punaise,punaises,"punaises de lit"}', '{0,15}', 120, 'par_passage', 4),
  ('fourmis',    'Fourmis',                 'photo',      '{fourmi,fourmis}', '{0}', 60, 'par_passage', 5),
  ('fouines',    'Fouines (piégeage)',      'photo',      '{fouine,fouines,piegeage}', '{0}', 60, 'par_passage', 6),
  ('frelons',    'Frelons / guêpes',        'photo',      '{frelon,frelons,guepe,guepes}', '{0}', 60, 'par_passage', 7),
  ('diogene',    'Débarrassage (Diogène)',  'photo',      '{diogene,debarras,debarrassage,encombrant,encombrants}', '{0}', 480, 'par_contrat', 8),
  ('generique',  'Autre (rapport photo)',   'photo',      '{}', '{0}', 60, 'par_passage', 99)
on conflict (code) do nothing;

create table if not exists product_mappings (
  dolibarr_product_ref text primary key,
  prestation_code      text not null references prestation_types (code) on update cascade on delete cascade,
  created_at           timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 3. DOSSIERS ET PRESTATIONS
-- ------------------------------------------------------------
create table if not exists dossiers (
  id                  uuid primary key default gen_random_uuid(),
  dolibarr_propal_id  int  not null unique,
  dolibarr_propal_ref text not null unique,       -- PR{YYMM}-NNNN
  dolibarr_tiers_id   int,
  client_name         text not null,
  client_address      text not null default '',
  client_email        text,
  ref_client          text,                       -- réf. de commande du client / de la régie
  note_public         text,
  total_ht            numeric,
  lignes              jsonb not null default '[]', -- lignes du devis + type détecté
  mode_facturation    text not null default 'par_passage'
    check (mode_facturation in ('par_passage', 'par_contrat')),
  statut              text not null default 'a_typer'
    check (statut in ('a_typer', 'actif', 'termine', 'annule')),
  alerte              text,                       -- ex. devis repassé à « non signé »
  source              text not null default 'webhook'
    check (source in ('webhook', 'cron', 'manuel')),
  signed_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists dossiers_statut_idx on dossiers (statut);
create index if not exists dossiers_tiers_idx on dossiers (dolibarr_tiers_id);

drop trigger if exists dossiers_updated_at on dossiers;
create trigger dossiers_updated_at
  before update on dossiers
  for each row execute function set_updated_at();

create table if not exists prestations (
  id          uuid primary key default gen_random_uuid(),
  dossier_id  uuid not null references dossiers on delete cascade,
  type_code   text not null references prestation_types (code),
  created_at  timestamptz not null default now(),
  unique (dossier_id, type_code)
);


-- ------------------------------------------------------------
-- 4. PASSAGES (= table interventions de la V1, enrichie)
-- ------------------------------------------------------------
alter table interventions
  add column if not exists biocides         jsonb not null default '[]',
  add column if not exists dossier_id       uuid references dossiers on delete set null,
  add column if not exists prestation_id    uuid references prestations on delete set null,
  add column if not exists prestation_type  text references prestation_types (code),
  add column if not exists passage_numero   int,
  add column if not exists date_prevue      date,
  add column if not exists technician_id    uuid references profiles (id) on delete set null,
  add column if not exists planning_status  text not null default 'a_planifier';

alter table interventions drop constraint if exists interventions_planning_status_check;
alter table interventions add constraint interventions_planning_status_check
  check (planning_status in ('a_planifier', 'planifie', 'confirme', 'en_cours', 'realise', 'reporte', 'absent', 'annule'));

-- Interventions V1 existantes : déjà réalisées ou en cours.
update interventions set planning_status = 'realise'  where dossier_id is null and status in ('signed', 'sent');
update interventions set planning_status = 'planifie' where dossier_id is null and status = 'draft';

create index if not exists interventions_dossier_idx on interventions (dossier_id);
create index if not exists interventions_planning_idx on interventions (planning_status, date_prevue);
create index if not exists interventions_technician_idx on interventions (technician_id);


-- ------------------------------------------------------------
-- 5. ZONES ET PHOTOS AVANT / APRÈS
-- ------------------------------------------------------------
create table if not exists zones (
  id               uuid primary key default gen_random_uuid(),
  intervention_id  uuid not null references interventions on delete cascade,
  label            text not null,
  niveau           text check (niveau in ('nul', 'faible', 'moyen', 'fort')),
  traitement       text,
  constat          text,
  ordre            int not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists zones_intervention_idx on zones (intervention_id);

alter table photos
  add column if not exists zone_id uuid references zones on delete cascade,
  add column if not exists phase   text check (phase in ('avant', 'apres'));


-- ------------------------------------------------------------
-- 6. JOURNAL DE SYNCHRONISATION
-- ------------------------------------------------------------
create table if not exists sync_log (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  source      text not null,           -- webhook | cron | manuel
  propal_id   int,
  propal_ref  text,
  ok          boolean not null,
  message     text
);

create index if not exists sync_log_created_idx on sync_log (created_at desc);


-- ------------------------------------------------------------
-- 7. RLS — modèle « équipe »
-- ------------------------------------------------------------
alter table profiles          enable row level security;
alter table prestation_types  enable row level security;
alter table product_mappings  enable row level security;
alter table dossiers          enable row level security;
alter table prestations       enable row level security;
alter table zones             enable row level security;
alter table sync_log          enable row level security;

-- profils
drop policy if exists profiles_read  on profiles;
drop policy if exists profiles_write on profiles;
create policy profiles_read  on profiles for select using (is_staff());
create policy profiles_write on profiles for update using (is_gerant());

-- référentiels
drop policy if exists prestation_types_read  on prestation_types;
drop policy if exists prestation_types_write on prestation_types;
create policy prestation_types_read  on prestation_types for select using (is_staff());
create policy prestation_types_write on prestation_types for all    using (is_gerant()) with check (is_gerant());

drop policy if exists product_mappings_read  on product_mappings;
drop policy if exists product_mappings_write on product_mappings;
create policy product_mappings_read  on product_mappings for select using (is_staff());
create policy product_mappings_write on product_mappings for all    using (is_gerant()) with check (is_gerant());

-- dossiers / prestations : lecture équipe, écriture gérant
drop policy if exists dossiers_read  on dossiers;
drop policy if exists dossiers_write on dossiers;
create policy dossiers_read  on dossiers for select using (is_staff());
create policy dossiers_write on dossiers for all    using (is_gerant()) with check (is_gerant());

drop policy if exists prestations_read  on prestations;
drop policy if exists prestations_write on prestations;
create policy prestations_read  on prestations for select using (is_staff());
create policy prestations_write on prestations for all    using (is_gerant()) with check (is_gerant());

-- journal : gérant uniquement (écrit par le serveur avec la clé service)
drop policy if exists sync_log_read on sync_log;
create policy sync_log_read on sync_log for select using (is_gerant());

-- interventions / passages
drop policy if exists "interventions_owner" on interventions;
drop policy if exists interventions_read   on interventions;
drop policy if exists interventions_insert on interventions;
drop policy if exists interventions_update on interventions;
drop policy if exists interventions_delete on interventions;
create policy interventions_read   on interventions for select using (is_staff());
create policy interventions_insert on interventions for insert with check (is_staff());
create policy interventions_update on interventions for update
  using (is_gerant() or technician_id = auth.uid() or user_id = auth.uid() or technician_id is null);
create policy interventions_delete on interventions for delete
  using (is_gerant() or user_id = auth.uid());

-- tables enfants : toute l'équipe
drop policy if exists "postes_owner" on postes;
drop policy if exists postes_team on postes;
create policy postes_team on postes for all using (is_staff()) with check (is_staff());

drop policy if exists "photos_owner" on photos;
drop policy if exists photos_team on photos;
create policy photos_team on photos for all using (is_staff()) with check (is_staff());

drop policy if exists zones_team on zones;
create policy zones_team on zones for all using (is_staff()) with check (is_staff());

-- phrases types : bibliothèque partagée, chacun modifie les siennes (le gérant toutes)
drop policy if exists "phrase_templates_owner" on phrase_templates;
drop policy if exists phrase_templates_read  on phrase_templates;
drop policy if exists phrase_templates_write on phrase_templates;
create policy phrase_templates_read  on phrase_templates for select using (is_staff());
create policy phrase_templates_write on phrase_templates for all
  using (user_id = auth.uid() or is_gerant()) with check (user_id = auth.uid() or is_gerant());

-- ============================================================
-- 001a — Tables + RLS (sans storage)
-- ============================================================

create table interventions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users not null,
  reference           text unique not null,
  dolibarr_tiers_id   int,
  dolibarr_action_id  int,
  client_name         text not null,
  client_address      text not null,
  client_email        text,
  intervention_date   timestamptz not null default now(),
  technician_name     text not null default 'Alex M.',
  type_intervention   text,
  plan_image_path     text,
  synthese            text,
  signature_data_url  text,
  signataire_nom      text,
  status              text not null default 'draft'
    check (status in ('draft', 'signed', 'sent')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index on interventions (user_id);
create index on interventions (dolibarr_tiers_id);
create index on interventions (status);

create table postes (
  id              uuid primary key default gen_random_uuid(),
  intervention_id uuid references interventions on delete cascade not null,
  label           text not null,
  x               numeric not null,
  y               numeric not null,
  etat            text check (etat in ('Intact', 'Dégradé', 'Manquant')),
  consommation    text check (consommation in ('Nulle', 'Partielle', 'Totale')),
  traces          text check (traces in ('Aucune', 'Déjections', 'Rongeurs')),
  action          text check (action in ('RAS', 'Renouvellement', 'Repositionnement')),
  ordre           int not null default 0
);

create index on postes (intervention_id);

create table photos (
  id              uuid primary key default gen_random_uuid(),
  intervention_id uuid references interventions on delete cascade not null,
  poste_id        uuid references postes on delete set null,
  storage_path    text not null,
  caption         text,
  created_at      timestamptz not null default now()
);

create index on photos (intervention_id);

create table phrase_templates (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  label   text not null,
  content text not null,
  ordre   int not null default 0
);

create index on phrase_templates (user_id);

-- Trigger updated_at
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

-- RLS
alter table interventions    enable row level security;
alter table postes           enable row level security;
alter table photos           enable row level security;
alter table phrase_templates enable row level security;

create policy "interventions_owner" on interventions
  for all using (user_id = auth.uid());

create policy "postes_owner" on postes
  for all using (
    exists (
      select 1 from interventions
      where interventions.id = postes.intervention_id
        and interventions.user_id = auth.uid()
    )
  );

create policy "photos_owner" on photos
  for all using (
    exists (
      select 1 from interventions
      where interventions.id = photos.intervention_id
        and interventions.user_id = auth.uid()
    )
  );

create policy "phrase_templates_owner" on phrase_templates
  for all using (user_id = auth.uid());

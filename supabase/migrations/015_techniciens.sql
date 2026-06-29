create table techniciens (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  nom                  text not null,
  telephone            text,
  email                text,
  numero_certibiocide  text,
  certibiocide_expire  date,
  actif                boolean not null default true,
  created_at           timestamptz not null default now()
);

alter table techniciens enable row level security;

create policy "Users manage own techniciens"
  on techniciens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Données initiales (migrées depuis le hardcode)
-- À adapter selon les vrais techniciens

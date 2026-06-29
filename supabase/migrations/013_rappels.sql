create table if not exists rappel_settings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null unique,
  email_dest    text not null,
  jours_avant   integer[] not null default '{7, 1}',
  actif         boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table rappel_settings enable row level security;
create policy "rappel_owner" on rappel_settings for all using (auth.uid() = user_id);

create table if not exists rappel_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  contrat_id    uuid references contrats(id) on delete cascade,
  jours_avant   integer not null,
  sent_at       timestamptz not null default now()
);

alter table rappel_log enable row level security;
create policy "rappel_log_owner" on rappel_log for all using (auth.uid() = user_id);
create index if not exists rappel_log_contrat_idx on rappel_log (contrat_id, jours_avant, sent_at);

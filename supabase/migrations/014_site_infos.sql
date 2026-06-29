create table site_infos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  tiers_id     integer not null,
  code_acces   text,
  interlocuteur text,
  telephone_site text,
  instructions text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(user_id, tiers_id)
);

alter table site_infos enable row level security;

create policy "Users manage own site_infos"
  on site_infos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

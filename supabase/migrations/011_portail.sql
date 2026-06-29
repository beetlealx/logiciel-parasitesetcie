create table if not exists portail_tokens (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users not null,
  token               uuid not null default gen_random_uuid() unique,
  dolibarr_tiers_id   integer not null,
  client_name         text not null,
  actif               boolean not null default true,
  created_at          timestamptz not null default now(),
  expires_at          timestamptz
);

alter table portail_tokens enable row level security;
create policy "portail_owner" on portail_tokens for all using (auth.uid() = user_id);
create index if not exists portail_token_idx on portail_tokens (token);

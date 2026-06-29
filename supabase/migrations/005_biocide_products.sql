create table if not exists biocide_products (
  id uuid primary key default gen_random_uuid(),
  type_intervention text not null,
  nom text not null,
  ordre smallint not null default 0
);

alter table biocide_products enable row level security;
create policy "authenticated_read"  on biocide_products for select to authenticated using (true);
create policy "authenticated_write" on biocide_products for all    to authenticated using (true);

insert into biocide_products (type_intervention, nom, ordre) values
  ('rats', 'Ratimox Bloc', 1),
  ('rats', 'Brodifacoum WB', 2),
  ('rats', 'Maki Bloc Grains', 3),
  ('rats', 'Bromakil Block', 4),
  ('rats', 'Raticid Pro', 5),
  ('rats', 'Talon Bloc', 6),
  ('frelons_guepes', 'Solfac EW 50', 1),
  ('frelons_guepes', 'K-Othrine SC 7.5', 2),
  ('frelons_guepes', 'Demand CS', 3),
  ('frelons_guepes', 'Ficam W', 4),
  ('frelons_guepes', 'Guêpinex', 5),
  ('fourmis', 'Ficam W', 1),
  ('fourmis', 'Demand CS', 2),
  ('fourmis', 'Cislin 10 SC', 3),
  ('fourmis', 'Advion Ant Gel', 4),
  ('fourmis', 'Goliath Fourmi Gel', 5),
  ('punaises_lit', 'K-Othrine SC 7.5', 1),
  ('punaises_lit', 'Demand CS', 2),
  ('punaises_lit', 'Tempo 10 WP', 3),
  ('punaises_lit', 'Cislin 10 SC', 4),
  ('punaises_lit', 'Diatomix Pro', 5),
  ('cafards', 'Ficam W', 1),
  ('cafards', 'Solfac EW 50', 2),
  ('cafards', 'Goliath Gel', 3),
  ('cafards', 'Advion Cockroach Gel', 4),
  ('cafards', 'K-Othrine SC 7.5', 5),
  ('moustiques', 'Aqua K-Othrine', 1),
  ('moustiques', 'Bacillus thuringiensis', 2),
  ('moustiques', 'Biotrine 10', 3),
  ('moustiques', 'Aqua Resigen', 4);

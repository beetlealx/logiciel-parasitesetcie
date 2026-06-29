-- Ajoute les champs stock directement sur biocide_products
alter table biocide_products
  add column if not exists unite        text not null default 'g',
  add column if not exists quantite     numeric not null default 0,
  add column if not exists seuil_alerte numeric not null default 0;

-- Migre stock_mouvements : remplace stock_id par biocide_product_id
alter table stock_mouvements drop constraint if exists stock_mouvements_stock_id_fkey;
alter table stock_mouvements rename column stock_id to biocide_product_id;
alter table stock_mouvements
  add constraint stock_mouvements_biocide_product_id_fkey
  foreign key (biocide_product_id) references biocide_products(id) on delete cascade;

-- Ajoute user_id sur stock_mouvements pour traçabilité par utilisateur
alter table stock_mouvements
  add column if not exists user_id uuid references auth.users;

-- Mise à jour RLS mouvements : lecture/écriture pour les utilisateurs authentifiés
drop policy if exists "mouvements_owner" on stock_mouvements;
create policy "mouvements_auth" on stock_mouvements
  for all to authenticated using (true);

-- Supprime la table stocks devenue inutile
drop table if exists stocks cascade;

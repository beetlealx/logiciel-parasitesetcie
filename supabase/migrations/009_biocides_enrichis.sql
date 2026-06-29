alter table biocide_products
  add column if not exists numero_amm      text,
  add column if not exists substance_active text,
  add column if not exists dosage_defaut   text,
  add column if not exists delai_reentree  text,
  add column if not exists mode_application text;

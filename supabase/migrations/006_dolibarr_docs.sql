alter table interventions add column if not exists dolibarr_devis_id    integer;
alter table interventions add column if not exists dolibarr_devis_ref   text;
alter table interventions add column if not exists dolibarr_facture_id  integer;
alter table interventions add column if not exists dolibarr_facture_ref text;
alter table interventions add column if not exists dolibarr_lines       jsonb;

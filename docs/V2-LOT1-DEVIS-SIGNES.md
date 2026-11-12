# V2 — Devis signés Dolibarr → interventions

Un devis qui passe à **« Signé »** dans Dolibarr crée tout seul ses interventions dans le logiciel.

## Ce qui est ajouté

| Fonction | Où |
| --- | --- |
| Webhook Dolibarr : devis signé → dossier + une intervention par passage | `app/api/dolibarr/webhook`, `lib/ingest-devis.ts` |
| Vérification quotidienne de rattrapage + boutons « Synchroniser maintenant » / « Importer un devis » | `app/api/cron/sync-devis`, Administration → Devis signés |
| Reconnaissance des lignes : référence produit, sinon mots-clés (texte libre) ; frais (déplacement…) mis de côté | `lib/typage.ts` (+ 11 tests) |
| Liste « À typer » quand aucune ligne n'est reconnue, avec mémorisation du produit ou d'un mot-clé | `/admin/devis-signes/[id]` |
| Facturation par passage ou par contrat : les lignes à facturer sont préremplies sur chaque intervention (bouton Facture existant) | `lignesFacturables()` |
| Événement Google Agenda créé pour chaque intervention, comme une création manuelle | `lib/google-calendar.ts` (existant) |
| Devis repassé à « non signé », réouvert ou supprimé → alerte sur le dossier, rien n'est supprimé sans confirmation | webhook |
| Photos « Avant » / « Après » (bouton sur chaque photo) et sections séparées dans le PDF | `photos-section.tsx`, `pdf-document.tsx` |
| Pied de page du PDF réparé (il ne s'affichait plus) + mentions légales | `pdf-document.tsx` |
| Libellés des statuts de devis corrigés : 3 = Non signé, 4 = Facturé (ils étaient inversés) | `admin/devis`, `create-dolibarr-doc.tsx` |

Rien de l'existant n'est retiré : contrats, calendrier, pièges moustiques, appâts, portail, rappels restent identiques.

## Mise en route (dans cet ordre)

1. **Base** — Supabase → SQL Editor → exécuter `supabase/migrations/021_devis_signes.sql` **avant** de déployer (la page intervention lit la nouvelle colonne `photos.phase`). La migration peut être relancée sans risque.
2. **Vercel** — ajouter :
   - `DOLIBARR_WEBHOOK_SECRET` : une longue chaîne aléatoire ;
   - `DOLIBARR_SYNC_FROM` : `2026-11-12` (les devis signés avant ne sont jamais importés automatiquement) ;
   - `DEVIS_OWNER_USER_ID` (facultatif) : l'id Supabase du compte propriétaire des interventions créées automatiquement ; par défaut, le plus ancien compte.
   `CRON_SECRET` existe déjà.
3. **Dolibarr 22.0.4** — Configuration → Modules → activer **WebHook**, puis nouvelle cible :
   - URL : `https://logiciel-parasitesetcie.vercel.app/api/dolibarr/webhook?token=<DOLIBARR_WEBHOOK_SECRET>`
   - Déclencheurs : `PROPAL_CLOSE_SIGNED` (obligatoire), `PROPAL_CLOSE_REFUSED`, `PROPAL_REOPEN`, `PROPAL_DELETE`.
4. **Tester** — signer un devis de test « Traitement cafards » → Administration → Devis signés : le dossier apparaît avec 2 interventions (J0 et J+15) dans la liste des interventions et dans l'agenda.

## Réglages

Administration → Devis signés :
- **Reconnaissance des lignes** : mots-clés et passages (jours après la signature) par type, facturation proposée par défaut.
- **Produits Dolibarr** : référence produit → type, prioritaire sur les mots-clés.
- **Journal Dolibarr** : chaque échange, réussi ou non.

## Limites connues

- Les types **fouines** et **débarrassage Diogène** n'existent pas encore dans le logiciel : ces devis arrivent « à typer » et l'intervention se crée à la main.
- La vérification de rattrapage tourne une fois par jour (5 h UTC) ; le webhook reste le déclencheur principal.

## Vérifié

`npm test` (typage), `npm run build`, et parcours complet sur une copie locale du schéma (migrations 001 à 021, PostgREST, faux Dolibarr) : webhook, doublon, devis non signé, rattrapage, typage manuel avec mémorisation, facturation par passage et par contrat, pages, PDF.

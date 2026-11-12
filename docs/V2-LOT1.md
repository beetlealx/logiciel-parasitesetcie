# V2 — Lot 1 : mise en route

Ce lot fait du **devis signé dans Dolibarr** le point de départ de toute intervention.

## Ce qui change

| Fonction | Où |
| --- | --- |
| Devis signé → dossier + passages créés automatiquement | `app/api/dolibarr/webhook`, `lib/ingest.ts` |
| Rattrapage des devis signés que le webhook aurait manqués | `app/api/cron/sync-devis`, bouton « Synchroniser maintenant » |
| Typage des lignes : réf. produit, sinon mots-clés (texte libre) | `lib/typage.ts` (+ tests `lib/typage.test.ts`) |
| File « À typer » + typage manuel avec mémorisation | `/dossiers`, `/dossiers/[id]` |
| Mode de facturation par dossier (par passage / par contrat) | fiche dossier |
| Connexion Google @parasites-compagnie.fr, rôles gérant / technicien | `/login`, `app/auth/callback`, `/parametres` |
| Types de prestation, mots-clés, correspondances produits, équipe, journal | `/parametres` (gérant) |
| Rapport photo avant / après par zone (blattes, punaises, fourmis, fouines, frelons, Diogène) | `components/intervention/zones-section.tsx`, PDF |
| PDF joint au devis Dolibarr à l'envoi du rapport | `app/actions/send-report.ts` |
| Mentions légales (SARL, RCS, Certibiocide) en pied de chaque rapport | `components/intervention/pdf-document.tsx` |

Les interventions V1 existantes restent visibles et modifiables comme avant (écran plan + postes).

Les factures ne sont **pas encore créées** par le logiciel : le mode de facturation est enregistré sur le dossier ; la création des factures brouillon dans Dolibarr viendra avec le calendrier (lot 3).

## 1. Base de données (Supabase)

Supabase → SQL Editor → coller et exécuter `supabase/migrations/002_v2_lot1.sql`.

- Tous les comptes existants deviennent **gérants** (aucun accès perdu).
- Tout nouveau compte `@parasites-compagnie.fr` devient **technicien** (sauf `alex@parasites-compagnie.fr`, gérant). Un gérant change les rôles dans **Paramètres → Équipe**.
- La migration peut être relancée sans risque.

## 2. Connexion Google

1. Google Cloud Console (compte Workspace parasites-compagnie.fr) → *API et services → Identifiants* → **ID client OAuth** de type « Application Web ».
   - URI de redirection autorisé : `https://<projet>.supabase.co/auth/v1/callback`
   - Écran de consentement : type **Interne** (réservé au domaine).
2. Supabase → *Authentication → Providers → Google* : activer, coller l'ID client et le secret.
3. Supabase → *Authentication → URL Configuration* : ajouter `https://<app>.vercel.app/auth/callback` aux **Redirect URLs**.

Si votre compte V1 utilise déjà l'adresse `alex@parasites-compagnie.fr`, Supabase rattache la connexion Google au même compte. Sinon un nouveau compte gérant est créé ; l'ancien reste utilisable par mot de passe.

## 3. Variables d'environnement (Vercel)

| Variable | Valeur |
| --- | --- |
| `DOLIBARR_WEBHOOK_SECRET` | une chaîne aléatoire longue (ex. `openssl rand -hex 24`) |
| `CRON_SECRET` | une autre chaîne aléatoire (Vercel l'envoie au cron) |
| `DOLIBARR_SYNC_FROM` | `2026-11-12` — les devis signés avant cette date ne sont jamais importés par le rattrapage |

Les variables existantes (`DOLIBARR_API_URL`, `DOLIBARR_API_KEY`, Supabase, Resend) ne changent pas.

## 4. Webhook Dolibarr (v22.0.4)

1. Dolibarr → *Accueil → Configuration → Modules* → activer **WebHook**.
2. Configuration du module → nouvelle cible :
   - URL : `https://<app>.vercel.app/api/dolibarr/webhook?token=<DOLIBARR_WEBHOOK_SECRET>`
   - Déclencheurs : `PROPAL_CLOSE_SIGNED` (obligatoire), `PROPAL_CLOSE_REFUSED`, `PROPAL_REOPEN`, `PROPAL_DELETE`.
3. Tester : signer un devis de test → un dossier apparaît dans **Dossiers**, et une ligne dans **Paramètres → Synchronisation Dolibarr**.

Le webhook ne fait jamais confiance au message reçu : il relit le devis par l'API avant de créer quoi que ce soit, et un devis ne crée jamais deux dossiers (référence unique).

## 5. Rattrapage

`vercel.json` lance `/api/cron/sync-devis` **une fois par jour à 5 h UTC**, ce que tous les plans Vercel acceptent. Sur un plan Pro, passer à `"0 * * * *"` pour la vérification horaire prévue au cahier des charges. Le bouton **Synchroniser maintenant** (page Dossiers) fait la même chose à la demande, et **Importer un devis** importe un devis précis par sa référence.

## 6. Vérifier

```bash
npm test        # tests du typage (11 cas)
npm run build
```

Parcours de recette conseillé :

1. Devis en texte libre « Traitement cafards 3 logements » + « Déplacement » → signé → dossier **Actif**, 2 passages Blattes (J0, J+15), ligne Déplacement « Frais annexe ».
2. Devis « Prestation selon visite » → dossier **À typer** → choisir « Punaises de lit », cocher *Mémoriser* → 2 passages créés ; le produit est retenu pour la suite.
3. Ouvrir un passage blattes → zones, photos avant / après, niveau d'infestation → signer → PDF avec zones et mentions légales, joint au devis dans Dolibarr à l'envoi.
4. Repasser le devis à « non signé » dans Dolibarr → alerte rouge sur le dossier ; rien n'est annulé sans confirmation.

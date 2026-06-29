# Logiciel de compte rendu d'intervention — Parasites Compagnie

> **Brief technique pour Claude Code · v1 mono-utilisateur, couplé à Dolibarr**
> Maquette HTML de référence fournie en pièce jointe (`parasites-compagnie-intervention.html`).

## 1. Contexte et objectif

Parasites Compagnie est une entreprise de lutte antiparasitaire (3D : dératisation, désinsectisation, désinfection). Les techniciens réalisent des interventions sur site (restaurants, hôtels, EHPAD, copropriétés) et doivent produire un compte rendu signé par le client à la fin de chaque visite.

**L'objectif de cette v1 est de remplacer une saisie papier/Word par une application web simple, utilisable depuis une tablette sur le terrain, qui :**

1. Permet de saisir une intervention complète en moins de 10 minutes
2. **Récupère les clients depuis Dolibarr** (source de vérité unique, pas de doublons)
3. Génère automatiquement un PDF du rapport, signé, horodaté
4. Envoie le PDF par email au client à la fin de la visite
5. **Crée automatiquement une action CRM dans Dolibarr** pour tracer l'intervention sur la fiche client
6. Conserve l'historique consultable de toutes les interventions

**Cette v1 est strictement mono-utilisateur.** Une seule personne (le gérant) se connecte à l'application. Pas de gestion d'équipe, pas de portail client connecté, pas de mode hors-ligne avancé, **pas de facturation automatique Dolibarr** (gardée pour la v2). Ces extensions viendront plus tard.

**C'est une application web pure** (pas de PWA, pas d'app native). Elle s'utilise dans le navigateur de la tablette (Safari iPad ou Chrome Android) à l'URL fournie. Une connexion 4G/WiFi est requise pour la majeure partie du workflow. Un filet de sécurité local (cf. section 5.3) protège contre les pertes accidentelles en cas de coupure réseau brève.

## 2. Stack technique imposée

- **Framework** : Next.js 14+ (App Router, TypeScript)
- **Style** : Tailwind CSS + shadcn/ui pour les composants
- **Backend / DB / Auth / Storage** : Supabase
- **Génération PDF** : `@react-pdf/renderer` (rendu côté serveur via Route Handler Next.js)
- **Envoi email** : Resend (free tier suffit pour démarrer)
- **Hébergement** : Vercel
- **Langue interface** : 100 % français

## 3. Modèle de données (Supabase / PostgreSQL)

```sql
-- Table interventions
create table interventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  reference text unique not null, -- ex: INT-2026-0142
  -- Lien Dolibarr (source de vérité pour les clients)
  dolibarr_tiers_id int, -- ID du tiers Dolibarr (nullable pour cas exceptionnels)
  dolibarr_action_id int, -- ID de l'action CRM créée après envoi du rapport
  -- Snapshot client au moment de l'intervention (sécurité si le tiers est modifié dans Dolibarr)
  client_name text not null,
  client_address text not null,
  client_email text,
  intervention_date timestamptz not null default now(),
  technician_name text not null,
  type_intervention text, -- "Contrôle mensuel", "Dératisation", etc.
  plan_image_path text, -- chemin Supabase Storage
  synthese text,
  signature_data_url text, -- base64 PNG de la signature
  signataire_nom text, -- nom du signataire client
  status text not null default 'draft', -- 'draft' | 'signed' | 'sent'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on interventions (dolibarr_tiers_id);

-- Table postes (postes d'appâtage positionnés sur le plan)
create table postes (
  id uuid primary key default gen_random_uuid(),
  intervention_id uuid references interventions on delete cascade not null,
  label text not null, -- "P1", "P2", etc.
  x numeric not null, -- coordonnée x dans le viewBox SVG
  y numeric not null,
  etat text, -- "Intact" | "Dégradé" | "Manquant"
  consommation text, -- "Nulle" | "Partielle" | "Totale"
  traces text, -- "Aucune" | "Déjections" | "Rongeurs"
  action text, -- "RAS" | "Renouvellement" | "Repositionnement"
  ordre int not null default 0
);

-- Table photos
create table photos (
  id uuid primary key default gen_random_uuid(),
  intervention_id uuid references interventions on delete cascade not null,
  poste_id uuid references postes on delete set null,
  storage_path text not null,
  caption text
);

-- Table phrases pré-enregistrées (personnalisables par l'utilisateur)
create table phrase_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  label text not null, -- titre court affiché sur la puce
  content text not null, -- phrase complète à insérer
  ordre int not null default 0
);

-- RLS activée partout, policies "user_id = auth.uid()" sur toutes les tables
```

**Storage Supabase** : 2 buckets privés
- `plans` — images de plan d'évacuation uploadées
- `photos` — photos d'intervention
- `rapports` — PDF générés (référencés par lien sécurisé dans Dolibarr)

## 4. Intégration Dolibarr

Parasites Compagnie utilise déjà Dolibarr pour la gestion clients (CRM) et la facturation. **Dolibarr reste la source de vérité unique pour les clients** — l'app intervention ne dédouble pas cette base, elle s'y connecte.

### 4.1 API Dolibarr utilisée

Dolibarr expose une API REST native sur `{DOLIBARR_URL}/api/index.php/`. Authentification par header `DOLAPIKEY`. Documentation officielle : https://wiki.dolibarr.org/index.php/Module_Web_Services_API_REST

**Endpoints utilisés en v1 :**

| Action | Méthode | Endpoint | Quand |
|---|---|---|---|
| Recherche tiers | `GET` | `/thirdparties?sqlfilters=...&limit=20` | Autocomplétion à la saisie d'une intervention |
| Détail tiers | `GET` | `/thirdparties/{id}` | Récupération des infos complètes (adresse, email) à la sélection |
| Création action CRM | `POST` | `/agendaevents` | Après envoi du rapport (trace l'intervention sur la fiche client Dolibarr) |

**Important :** tous les appels à l'API Dolibarr se font **côté serveur Next.js** (Route Handlers), jamais depuis le navigateur. La clé API ne doit jamais fuiter dans le bundle client.

### 4.2 Recherche tiers (autocomplétion)

Route Handler : `GET /api/dolibarr/search?q={query}`
- Reçoit une chaîne de recherche depuis le client
- Appelle Dolibarr : `GET /thirdparties?sqlfilters=(t.nom:like:'%{query}%')&limit=20`
- Retourne un tableau simplifié : `[{ id, nom, adresse_complete, email, code_client }]`
- Debounce côté client à 300ms pour limiter les appels

### 4.3 Création d'action CRM après envoi du rapport

Une fois le PDF généré et envoyé par email, on crée une action CRM sur la fiche du tiers Dolibarr :

```json
POST /agendaevents
{
  "label": "Intervention 3D — INT-2026-0142",
  "type_code": "AC_OTH_AUTO",
  "datep": "<timestamp début intervention>",
  "datef": "<timestamp fin intervention>",
  "socid": <dolibarr_tiers_id>,
  "userownerid": <id user Dolibarr propriétaire>,
  "note": "Rapport d'intervention disponible : <lien signé Supabase 7 jours>\n\nSynthèse : <synthese tronquée à 500 caractères>",
  "percentage": 100
}
```

L'ID de l'action retournée par Dolibarr est stocké dans `interventions.dolibarr_action_id` pour pouvoir lier plus tard si besoin.

**Gestion des erreurs Dolibarr :** si l'API Dolibarr est down au moment de l'envoi, le rapport est quand même envoyé par email au client (priorité absolue), et l'action CRM est mise en file d'attente pour retry (colonne `dolibarr_sync_status` à ajouter si besoin en v1.1). En v1 simple : log l'erreur, affiche un toast d'avertissement au technicien, on resynchronisera manuellement.

### 4.4 Cas du client "hors Dolibarr"

Pour les cas exceptionnels (nouveau prospect non encore enregistré, intervention ponctuelle d'urgence), un toggle "Client hors Dolibarr" permet de saisir manuellement nom, adresse, email. Dans ce cas, `dolibarr_tiers_id` reste `null` et aucune action CRM n'est créée. Une petite alerte visuelle rappelle au gérant qu'il devra créer le tiers manuellement dans Dolibarr ensuite s'il veut un suivi.

## 5. Fonctionnalités en scope (v1)

### 5.1 Authentification
- Login email + mot de passe via Supabase Auth
- Une seule personne se connecte (le compte est créé manuellement à l'install)
- Page de login simple, redirection vers `/interventions` après connexion

### 5.2 Liste des interventions (`/interventions`)
- Affichage en cartes ou tableau de toutes les interventions de l'utilisateur, triées par date décroissante
- Recherche full-text sur `client_name`, `client_address`, `reference`
- Filtre par statut (Tous / Brouillon / Signé / Envoyé)
- Bouton "Nouvelle intervention" en haut à droite
- Clic sur une intervention → ouvre `/interventions/[id]`

### 5.3 Création / édition d'une intervention (`/interventions/[id]`)
L'écran reprend la structure de la maquette HTML fournie, en 5 sections numérotées :

**Section 0 — Sélection du client (en tête de page)**
- Champ "Client" avec autocomplétion sur l'API Dolibarr (cf. section 4.2)
- À la sélection, les champs `client_name`, `client_address`, `client_email`, `dolibarr_tiers_id` sont remplis automatiquement
- Bouton secondaire "Client hors Dolibarr" qui bascule en saisie manuelle (cf. section 4.4)

**Section 1 — Plan interactif**
- Bouton "Importer un plan" (input file `accept="image/*"`)
- L'image uploadée est stockée dans Supabase Storage et affichée en arrière-plan d'un SVG
- 3 modes : Ajouter / Déplacer / Supprimer un poste
- Les postes sont des cercles SVG numérotés (P1, P2…) positionnés en coordonnées du viewBox
- Sauvegarde automatique des positions à chaque modification (debounce 1s)

**Section 2 — Relevés par poste**
- Pour chaque poste, 4 selects : État, Consommation, Traces, Action (valeurs en dur dans le code, cf. schéma DB)
- Sauvegarde auto à chaque changement

**Section 3 — Photos**
- Upload multi-fichiers (input avec `capture="environment"` pour ouvrir la caméra sur mobile)
- Affichage en grille 4 colonnes (2 sur mobile)
- Possibilité de rattacher chaque photo à un poste précis via un select
- Suppression au clic sur une photo

**Section 4 — Synthèse**
- Liste de puces cliquables (les `phrase_templates` de l'utilisateur)
- Clic sur une puce = insertion de la phrase dans le textarea
- Bouton "Gérer mes phrases" → page `/phrases` simple pour CRUD sur les templates

**Section 5 — Signature client**
- Canvas HTML5, tactile et souris
- Bouton "Effacer"
- Au moment de signer, on demande le nom du signataire dans un champ texte
- La signature est sauvegardée en data URL base64 dans la colonne `signature_data_url`

**Footer de la page**
- Bouton "Sauvegarder le brouillon" (toujours visible)
- Bouton "Générer et envoyer le rapport" — déclenche dans l'ordre :
  1. Génération PDF côté serveur
  2. Upload du PDF dans Supabase Storage (bucket `rapports`)
  3. Envoi par email au client via Resend (si `client_email` rempli)
  4. **Création d'une action CRM dans Dolibarr** (cf. section 4.3) si `dolibarr_tiers_id` présent
  5. Passage du statut à `sent`
  6. Retour à la liste avec toast de confirmation (mentionne explicitement si la synchro Dolibarr a réussi ou échoué)

**Sauvegarde locale du brouillon (filet de sécurité réseau)**

L'app étant 100 % en ligne, on protège l'utilisateur contre les pertes accidentelles en cas de coupure réseau brève :
- À chaque modification d'un champ, l'état complet de l'intervention en cours est aussi sauvegardé dans `localStorage` (clé : `intervention-draft-{id}`)
- À l'ouverture d'une intervention, on vérifie si un brouillon local plus récent existe que la version serveur. Si oui : afficher un bandeau "Brouillon local non synchronisé détecté — Restaurer / Ignorer"
- En cas d'échec d'une sauvegarde serveur (erreur réseau), afficher discrètement un badge "Modifications non synchronisées" en haut de page, et retenter en arrière-plan toutes les 30 secondes jusqu'à succès
- Le `localStorage` est nettoyé pour cette intervention dès que le rapport est envoyé avec succès

Ce mécanisme ne remplace pas un vrai mode hors-ligne (impossible de commencer une intervention sans réseau, impossible de générer un PDF hors-ligne). Il garantit juste qu'on ne perd rien en cas de coupure intermédiaire.

### 5.4 Génération du PDF

Le PDF est un document A4 portrait, généré côté serveur via une Route Handler Next.js `POST /api/interventions/[id]/pdf`. Structure attendue :

- **En-tête** : logo Parasites Compagnie (placeholder pour l'instant), référence, date
- **Bloc client** : nom, adresse, email
- **Bloc intervention** : type, technicien
- **Plan annoté** : l'image du plan avec les postes positionnés en overlay (à rendre côté serveur via SVG → PNG, ou via composant `<Svg>` de react-pdf)
- **Tableau des relevés** : un poste par ligne avec ses 4 champs
- **Photos** : 4 par page max, légendées
- **Synthèse** : le texte tel quel
- **Signature** : image base64 + nom du signataire + horodatage

### 5.5 Page "Mes phrases" (`/phrases`)
Page minimaliste : liste des phrases pré-enregistrées, bouton ajouter, édition inline, suppression. C'est tout.

## 6. Explicitement HORS scope (v2 ou plus tard)

- ❌ Gestion multi-utilisateurs (techniciens, admin, rôles)
- ❌ Portail client connecté
- ❌ Mode hors-ligne avec synchronisation différée
- ❌ **Création automatique de devis/factures dans Dolibarr** (v2 — nécessite une grille tarifaire claire)
- ❌ **Création de tiers Dolibarr depuis l'app** (v2 — pour l'instant les nouveaux clients sont créés dans Dolibarr d'abord)
- ❌ Scan QR code des postes
- ❌ Planning / tournées / agenda
- ❌ Base de données biocides + FDS automatiques (les FDS sont jointes manuellement au PDF si besoin)
- ❌ Notifications push, rappels SMS
- ❌ Statistiques, dashboards

**Règle d'or :** à chaque proposition de fonctionnalité supplémentaire, se demander *« est-ce que ça empêche de facturer un client demain matin ? »*. Si non, ça attend la v2.

## 7. Ordre de construction recommandé

L'ordre est important pour avoir un truc utilisable rapidement à chaque étape.

1. **Setup** : Next.js + Tailwind + shadcn/ui + Supabase client + variables d'env
2. **Auth** : page login, middleware de protection des routes, layout authentifié
3. **Schéma DB** : migrations SQL Supabase, RLS policies
4. **Liste interventions** : page `/interventions` avec données réelles (créer 2-3 interventions de test en SQL)
5. **Intégration Dolibarr — recherche tiers** : Route Handler `/api/dolibarr/search`, composant d'autocomplétion réutilisable (tester avec quelques tiers réels en lecture seule)
6. **Édition intervention — squelette** : page `/interventions/[id]` avec sélecteur de client (Dolibarr ou manuel) + les 5 sections, données chargées depuis la DB, sauvegarde manuelle
7. **Plan interactif** : upload image, SVG, ajout/déplacement/suppression de postes, sauvegarde auto
8. **Relevés** : selects par poste, sauvegarde auto
9. **Photos** : upload, grille, suppression
10. **Synthèse** : page `/phrases` (CRUD), puces cliquables sur l'écran intervention
11. **Signature** : canvas, sauvegarde base64
12. **Génération PDF** : Route Handler + `@react-pdf/renderer`
13. **Envoi email + action CRM Dolibarr** : intégration Resend, création de l'action CRM Dolibarr avec lien signé, statut `sent`, gestion d'erreur si Dolibarr down
14. **Polish** : toasts, loading states, gestion d'erreurs, responsive tablette

**Critère de fin de v1 :** Alex peut faire une intervention de bout en bout sur sa tablette en sélectionnant un client existant depuis Dolibarr, le client signe, le PDF est envoyé par email, une action CRM apparaît dans Dolibarr sur la fiche du tiers, et l'intervention apparaît dans l'historique de l'app.

## 8. Référence visuelle

La maquette HTML interactive `parasites-compagnie-intervention.html` jointe à ce brief montre l'écran d'intervention finalisé. Reproduis fidèlement :

- La palette de couleurs (primary `#0d7d6e`, fond `#fafaf9`)
- La typographie Geist (déjà importée depuis Google Fonts)
- La structure en sections numérotées avec les badges ronds verts
- Le comportement du plan interactif (modes Ajouter / Déplacer / Supprimer)
- Le système de phrases en puces cliquables
- Le canvas de signature

Tu peux ignorer les onglets "Historique" et "Comptes" de la maquette : l'historique sera une page séparée, et les comptes sont hors scope v1.

## 9. Variables d'environnement attendues

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=interventions@parasites-compagnie.fr

# Dolibarr (uniquement côté serveur, jamais exposé au client)
DOLIBARR_API_URL=https://votre-domaine-dolibarr.fr/api/index.php
DOLIBARR_API_KEY=
DOLIBARR_USER_OWNER_ID=1   # ID utilisateur Dolibarr propriétaire des actions CRM créées
```

## 10. Prérequis à rassembler AVANT de démarrer le dev

À récupérer côté Dolibarr et à valider avec le gérant avant de lancer Claude Code :

- [ ] **URL de l'API Dolibarr** (ex: `https://dolibarr.parasites-compagnie.fr/api/index.php`)
- [ ] **Clé API d'un utilisateur Dolibarr** ayant les droits : lecture tiers, écriture agenda/actions CRM. Générée depuis "Utilisateurs et groupes" → fiche user → onglet "API"
- [ ] **ID de l'utilisateur Dolibarr** qui sera propriétaire des actions CRM créées (à mettre dans `DOLIBARR_USER_OWNER_ID`)
- [ ] **Tester un appel API en bash** pour valider la connexion avant tout :
  ```bash
  curl -X GET "{DOLIBARR_API_URL}/thirdparties?limit=3" \
    -H "DOLAPIKEY: {DOLIBARR_API_KEY}"
  ```
  Si ça renvoie une liste de tiers en JSON, c'est bon. Sinon, vérifier que le module "API REST" est activé dans Dolibarr (Configuration → Modules).
- [ ] **Identifier 2-3 tiers de test** dans Dolibarr (vrais clients de Parasites Compagnie) pour valider la recherche et la création d'action CRM en conditions réelles
- [ ] **Domaine email vérifié sur Resend** pour l'envoi des rapports (sinon, démarrage avec l'adresse `onboarding@resend.dev` en attendant)
- [ ] **Projet Supabase créé**, URL et clés API récupérées
- [ ] **Logo Parasites Compagnie** en PNG haute définition (transparent de préférence) pour l'en-tête du PDF

## 11. Notes pour Claude Code

- Avant de coder, **propose un découpage en étapes** et confirme avec moi avant de démarrer chaque étape.
- À la fin de chaque étape, **fais un récapitulatif court** de ce qui a été fait et de ce qui reste à tester manuellement.
- **Pas de sur-ingénierie** : pas d'abstractions inutiles, pas de design patterns complexes, pas de tests pour la v1 (sauf bug critique). Du code lisible et direct.
- **Mobile-first** : l'app sera utilisée à 80 % sur tablette. Tous les éléments tactiles doivent faire au moins 44px de haut.
- **Sauvegarde automatique partout** : on ne perd jamais de données. Pas de bouton "sauvegarder" sauf pour valider la fin d'intervention.
- **Erreurs explicites** : si l'upload d'une photo échoue, l'utilisateur doit le voir clairement (toast rouge, pas une erreur silencieuse).
- **Appels Dolibarr toujours côté serveur** : Route Handlers Next.js uniquement, jamais d'appel depuis le composant client. La clé API ne doit jamais apparaître dans le bundle.
- **Robustesse Dolibarr** : si l'API Dolibarr est indisponible, l'app continue de fonctionner (l'envoi du rapport au client reste prioritaire). La synchro CRM peut échouer sans bloquer le workflow principal.
- **Pas de PWA, pas de service worker** : c'est une web app simple. Pas de manifest.json, pas de mise en cache de l'app, pas de mode hors-ligne. La seule protection locale est la sauvegarde `localStorage` du brouillon (cf. section 5.3).

---

**Prompt initial à donner à Claude Code :**

> Lis le fichier `cahier-des-charges-claude-code.md` et la maquette HTML `parasites-compagnie-intervention.html`. Avant tout, valide avec moi que tu as bien compris l'intégration Dolibarr (sections 4 et 10 du cahier des charges). Puis propose-moi un plan détaillé pour l'étape 1 (Setup) avant de commencer à coder. Pose-moi toutes les questions nécessaires avant de te lancer.

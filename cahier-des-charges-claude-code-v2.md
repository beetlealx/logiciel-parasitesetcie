# Logiciel de compte rendu d'intervention — Parasites Compagnie

> **Brief technique v2 pour Claude Code · multi-nuisibles, pilotage Dolibarr complet, apps iOS/Android**
> Suite de la v1 (déjà en production). La v2 étend l'app sans la réécrire.

## 1. Contexte et objectif de la v2

La v1 couvre le compte rendu d'intervention web pour la dératisation, en production sur tablette, génère des PDF signés et crée des actions CRM dans Dolibarr.

La v2 vise **3 chantiers indépendants** (livrables séparément, à déployer un par un) :

1. **Multi-nuisibles** — Étendre le module intervention à 6 types : Rats, Frelons/Guêpes, Punaises de lit, Fourmis, Cafards, Moustiques. Plus un type "Mixte" pour les interventions combinant plusieurs nuisibles.
2. **Pilotage Dolibarr & facturation complète** — Page de configuration dans l'app qui pilote les produits/services Dolibarr (CRUD complet via API). Workflow facturation complet : sélection de prestations en intervention → création devis Dolibarr à la signature → validation du devis depuis l'app → conversion en facture → envoi au client.
3. **Apps iOS et Android** — Encapsulation de l'app web via Capacitor, publication sur App Store et Google Play.

**Principe directeur :** Dolibarr est la **source de vérité unique** pour les produits, devis, factures et clients. L'app ne duplique pas ces données. Elle pilote Dolibarr.

## 2. Stack technique — additions à la v1

Stack v1 inchangée (Next.js, Supabase, Resend, Vercel, Tailwind, shadcn/ui, react-pdf). Ajouts v2 :

- **Capacitor 6+** — encapsulation mobile
- **`@capacitor/camera`** — caméra native
- **`@capacitor/preferences`** — stockage persistant mobile (remplace localStorage)
- **`@capacitor/share`** — partage natif du PDF
- **`@capacitor/network`** — détection état réseau
- **EAS Build / Codemagic / GitHub Actions** — builds iOS/Android automatisés sans Mac local

## 3. Modèle de données — additions et refactorings

### 3.1 Refactor : `postes` → `articles` (multi-nuisibles)

```sql
-- Renommage de la table
alter table postes rename to articles;

-- Type d'article (lié au type d'intervention courant)
alter table articles add column article_type text not null default 'poste_appatage';
-- Valeurs : 'poste_appatage' (rats), 'nid_frelons', 'zone_punaises',
-- 'point_fourmis', 'zone_cafards', 'zone_moustiques'

-- Champs de relevé génériques (remplace les colonnes etat/consommation/traces/action en dur)
alter table articles add column releves jsonb default '{}'::jsonb;
-- Pour rats : {"etat": "Intact", "consommation": "Totale", "traces": "Déjections", "action": "Renouvellement"}
-- Pour frelons : {"espece": "Frelon asiatique", "hauteur": 5, "diametre": 30, "neutralise": true, "produit": "K-Othrine"}
-- Pour punaises : {"piece": "Chambre 1", "methode": "Vapeur", "infestation": "Modérée"}
-- etc.

-- Migration des données : les anciennes colonnes etat/consommation/traces/action sont
-- copiées dans le jsonb releves, puis supprimées dans une migration ultérieure.
```

### 3.2 `interventions` enrichie

```sql
-- Type d'intervention (détermine les templates d'articles, champs, et prestations proposées)
alter table interventions add column intervention_type text not null default 'rats';
-- Valeurs : 'rats', 'frelons_guepes', 'punaises_lit', 'fourmis', 'cafards', 'moustiques', 'mixte'

-- Liens Dolibarr (workflow facturation complet)
alter table interventions add column dolibarr_devis_id int;
alter table interventions add column dolibarr_devis_ref text; -- ex: PR2026-0042
alter table interventions add column dolibarr_devis_statut text; -- 'brouillon' | 'valide' | 'signe' | 'facture'
alter table interventions add column dolibarr_facture_id int;
alter table interventions add column dolibarr_facture_ref text; -- ex: FA2026-0042
alter table interventions add column dolibarr_facture_statut text; -- 'brouillon' | 'envoyee' | 'payee'

-- Snapshot montants au moment de la signature
alter table interventions add column montant_total_ht numeric(10,2);
alter table interventions add column montant_total_ttc numeric(10,2);
```

### 3.3 Nouvelle table : prestations sélectionnées sur intervention

**Note importante :** il n'y a **pas** de table catalogue côté Supabase. Le catalogue est Dolibarr. La table ci-dessous stocke uniquement les prestations *sélectionnées* sur une intervention (avec montants potentiellement modifiés sur place).

```sql
create table intervention_prestations (
  id uuid primary key default gen_random_uuid(),
  intervention_id uuid references interventions on delete cascade not null,
  dolibarr_product_id int not null, -- ID Dolibarr du produit/service
  libelle text not null, -- snapshot du libellé au moment de l'ajout
  description text,
  quantite numeric(10,2) not null default 1,
  prix_unitaire_ht numeric(10,2) not null, -- modifiable sur place
  prix_unitaire_ht_default numeric(10,2) not null, -- prix Dolibarr à l'ajout (pour info)
  taux_tva numeric(5,2) not null default 20.00,
  ordre int not null default 0
);
```

### 3.4 Phrases pré-enregistrées scopées par type

```sql
alter table phrase_templates add column intervention_types text[] default '{}';
-- Vide '{}' = phrase universelle, sinon liste des types où elle apparaît
```

## 4. Intégration Dolibarr — v2 complète

### 4.1 Configuration

```env
DOLIBARR_API_URL=https://devis.parasites-compagnie.fr/api/index.php
DOLIBARR_API_KEY=<clé existante>
DOLIBARR_USER_OWNER_ID=<id existant>
DOLIBARR_CATEGORIE_PRESTATIONS_ID=1    # ← catégorie "Prestations 3D" déjà créée
```

### 4.2 Endpoints utilisés (récap)

| Action | Méthode | Endpoint |
|---|---|---|
| Lister produits de la catégorie 3D | `GET` | `/products?category={CATEGORIE_ID}&limit=200` |
| Détail produit | `GET` | `/products/{id}` |
| Créer un produit | `POST` | `/products` (puis `POST /categories/{catid}/objects/product/{productid}` pour rattacher à la catégorie) |
| Modifier un produit | `PUT` | `/products/{id}` |
| Supprimer un produit | `DELETE` | `/products/{id}` |
| Recherche tiers | `GET` | `/thirdparties?sqlfilters=...` |
| Création devis | `POST` | `/proposals` |
| Détail devis | `GET` | `/proposals/{id}` |
| Valider devis (passer en statut "validé") | `POST` | `/proposals/{id}/validate` |
| Créer une facture (en copiant les lignes d'un devis) | `POST` | `/invoices` |
| Détail facture | `GET` | `/invoices/{id}` |
| Valider facture | `POST` | `/invoices/{id}/validate` |
| Récupérer le PDF d'une facture | `GET` | `/documents/download?modulepart=facture&original_file={ref}/{ref}.pdf` |
| Création action CRM | `POST` | `/agendaevents` |

**Sécurité :** tous les appels API Dolibarr passent par des Route Handlers Next.js côté serveur. Aucune clé API exposée au navigateur, jamais.

### 4.3 Cache des produits Dolibarr

Pour éviter d'interroger Dolibarr à chaque ouverture de la page d'intervention, on cache la liste des produits de la catégorie 3D côté serveur Next.js :

- TTL : 5 minutes (`Cache-Control: max-age=300` sur la Route Handler `GET /api/dolibarr/prestations`)
- Invalidation explicite après chaque CRUD produit depuis la page configuration : `revalidatePath('/api/dolibarr/prestations')`
- Mécanisme : utilisation de `unstable_cache` de Next.js, ou simple cache en mémoire côté serveur (Map avec TTL)

### 4.4 Workflow facturation complet

**Étape 1 — Pendant l'intervention**

Le technicien ajoute des prestations à l'intervention depuis le catalogue Dolibarr (liste filtrée selon le type d'intervention). Les prix sont modifiables sur place. Les lignes sont stockées dans `intervention_prestations`.

**Étape 2 — À la signature client**

```
POST /proposals (avec lines pré-remplies depuis intervention_prestations)
```
- Devis créé en statut **brouillon** dans Dolibarr
- `dolibarr_devis_id`, `dolibarr_devis_ref`, `dolibarr_devis_statut = 'brouillon'` stockés en base
- Statut intervention → `signed`
- Le rapport PDF est envoyé par email au client (avec le devis Dolibarr en PJ ou en lien)
- Action CRM créée dans Dolibarr avec mention du devis créé

**Étape 3 — Validation du devis depuis l'app**

Sur la page de détail intervention, après signature, apparaît un bouton **"Valider le devis"** :
```
POST /proposals/{id}/validate
```
- Devis passe de brouillon à validé dans Dolibarr
- `dolibarr_devis_statut = 'valide'`
- Bouton **"Convertir en facture"** apparaît à la place

**Étape 4 — Conversion en facture**

L'endpoint `createfromproposal` n'existe pas dans l'API Dolibarr. On crée donc la facture manuellement en copiant les lignes du devis :

```
GET /proposals/{id}  → récupère socid + lines
POST /invoices       → crée la facture avec les lignes copiées
{
  "socid": <socid du devis>,
  "date": <timestamp>,
  "type": 0,
  "ref_client": "<intervention reference>",
  "note_private": "Facture créée depuis devis <devis_ref>",
  "lines": [<lignes copiées du devis>]
}
```

- Facture créée en brouillon dans Dolibarr
- `dolibarr_facture_id`, `dolibarr_facture_ref`, `dolibarr_facture_statut = 'brouillon'` stockés
- Le lien devis ↔ facture est tracé côté Supabase via `dolibarr_devis_id` et `dolibarr_facture_id` sur la même ligne intervention

Bouton **"Valider et envoyer la facture"** apparaît, qui :
```
POST /invoices/{id}/validate
GET /documents/download?modulepart=facture&original_file={ref}/{ref}.pdf
POST envoi email au client via Resend (avec PDF facture en PJ)
```
- Facture validée
- `dolibarr_facture_statut = 'envoyee'`

**Étape 5 — Suivi des paiements**

Hors scope v2 (la marque "payée" se fait dans Dolibarr). Une synchronisation périodique (cron Vercel quotidien) pourra interroger Dolibarr pour mettre à jour `dolibarr_facture_statut = 'payee'` sur les factures concernées. Optionnel — peut être ajouté en v2.1.

## 5. Fonctionnalités en scope (v2)

### 5.1 Chantier A — Multi-nuisibles

**Sélection du type d'intervention à la création**

Page de création d'intervention : avant de remplir les détails, choix obligatoire du type parmi 7 cartes visuelles : Rats, Frelons/Guêpes, Punaises de lit, Fourmis, Cafards, Moustiques, Mixte.

**Templates d'articles par type — fichier de config (en code, pas en DB)**

```typescript
// lib/intervention-templates.ts
export const INTERVENTION_TEMPLATES = {
  rats: {
    label: "Rats",
    article_label: "Poste",
    article_prefix: "P",
    color: "#0d7d6e",
    icon: "rat",
    fields: [
      { key: "etat", label: "État", type: "select", options: ["Intact", "Dégradé", "Manquant"] },
      { key: "consommation", label: "Consommation", type: "select", options: ["Nulle", "Partielle", "Totale"] },
      { key: "traces", label: "Traces", type: "select", options: ["Aucune", "Déjections", "Rongeurs"] },
      { key: "action", label: "Action", type: "select", options: ["RAS", "Renouvellement", "Repositionnement"] }
    ]
  },
  frelons_guepes: {
    label: "Frelons / Guêpes",
    article_label: "Nid",
    article_prefix: "N",
    color: "#b45309",
    icon: "wasp",
    fields: [
      { key: "espece", label: "Espèce", type: "select", options: ["Frelon asiatique", "Frelon européen", "Guêpe commune", "Guêpe germanique"] },
      { key: "hauteur", label: "Hauteur (m)", type: "number" },
      { key: "diametre", label: "Diamètre (cm)", type: "number" },
      { key: "localisation", label: "Localisation", type: "text" },
      { key: "produit", label: "Produit utilisé", type: "text" },
      { key: "neutralise", label: "Nid neutralisé", type: "boolean" }
    ]
  },
  punaises_lit: {
    label: "Punaises de lit",
    article_label: "Zone",
    article_prefix: "Z",
    color: "#7c2d12",
    icon: "bed-bug",
    fields: [
      { key: "piece", label: "Pièce", type: "text" },
      { key: "infestation", label: "Niveau d'infestation", type: "select", options: ["Faible", "Modéré", "Élevé"] },
      { key: "methode", label: "Méthode", type: "select", options: ["Vapeur", "Insecticide", "Cryogénie", "Mixte"] },
      { key: "produit", label: "Produit utilisé", type: "text" },
      { key: "passages_prevus", label: "Passages prévus", type: "number" }
    ]
  },
  fourmis: {
    label: "Fourmis",
    article_label: "Point",
    article_prefix: "F",
    color: "#92400e",
    icon: "ant",
    fields: [
      { key: "espece", label: "Espèce", type: "select", options: ["Fourmi pharaon", "Fourmi noire", "Fourmi de jardin", "Indéterminée"] },
      { key: "type_traitement", label: "Type", type: "select", options: ["Gel appât", "Pulvérisation", "Poudrage"] },
      { key: "produit", label: "Produit utilisé", type: "text" }
    ]
  },
  cafards: {
    label: "Cafards / Blattes",
    article_label: "Zone",
    article_prefix: "Z",
    color: "#78350f",
    icon: "cockroach",
    fields: [
      { key: "espece", label: "Espèce", type: "select", options: ["Blatte germanique", "Blatte orientale", "Blatte américaine"] },
      { key: "infestation", label: "Niveau", type: "select", options: ["Faible", "Modéré", "Élevé"] },
      { key: "produit", label: "Produit appliqué", type: "text" }
    ]
  },
  moustiques: {
    label: "Moustiques",
    article_label: "Zone",
    article_prefix: "M",
    color: "#0e7490",
    icon: "mosquito",
    fields: [
      { key: "espece", label: "Espèce", type: "select", options: ["Moustique tigre", "Culex", "Indéterminée"] },
      { key: "type_traitement", label: "Type", type: "select", options: ["Démoustication adulticide", "Larvicide", "Piège"] },
      { key: "surface_m2", label: "Surface (m²)", type: "number" },
      { key: "produit", label: "Produit utilisé", type: "text" }
    ]
  }
};
```

**Cas "Mixte"**

Type d'intervention spécial. Quand l'utilisateur clique pour ajouter un article sur le plan, un popover propose de choisir parmi les 6 types ci-dessus. Chaque article placé garde sa propre couleur et son propre préfixe (P, N, Z, F, M…). Le PDF du rapport présente alors les relevés groupés par type.

**Phrases pré-enregistrées scopées**

La page `/phrases` (v1) est enrichie : chaque phrase peut être rattachée à un ou plusieurs types d'intervention (cases à cocher). La synthèse de l'intervention n'affiche que les phrases pertinentes.

**Rapport PDF adapté**

Le PDF affiche le bon libellé d'article selon le type ("Postes contrôlés" pour rats, "Nids traités" pour frelons, "Zones traitées" pour punaises, etc.). Pour les interventions Mixte, sections séparées par type.

### 5.2 Chantier B — Pilotage Dolibarr et facturation

**Page `/configuration/prestations`**

Liste tous les produits de la catégorie "Prestations 3D" (filtrée via `category=1` dans l'appel Dolibarr). Pour chaque ligne :
- Libellé (modifiable inline ou via modale d'édition)
- Description
- Prix HT
- Taux TVA
- Actif / inactif (champ `tosell` Dolibarr)
- Types d'intervention où elle apparaît (champ stocké côté Supabase dans une table `prestation_intervention_types` car Dolibarr n'a pas ce concept)

Boutons d'action :
- **"Nouvelle prestation"** → modale de création → `POST /products` puis rattachement à la catégorie 1
- **Édition** (icône crayon) → modale d'édition → `PUT /products/{id}`
- **Suppression** (icône poubelle) → confirmation → `DELETE /products/{id}` (ou désactivation si suppression refusée par Dolibarr car déjà utilisée)

**Catalogue de départ à pré-créer** (Alex le remplit lui-même depuis cette page après le déploiement du chantier)

À titre indicatif :

| Libellé | Prix HT | TVA | Types |
|---|---|---|---|
| Destruction nid de frelons (< 5m) | 110 € | 20 % | Frelons/Guêpes |
| Destruction nid de frelons (5-10m) | 160 € | 20 % | Frelons/Guêpes |
| Destruction nid de frelons (> 10m) | 220 € | 20 % | Frelons/Guêpes |
| Traitement punaises de lit (1 pièce) | 280 € | 10 % | Punaises de lit |
| Traitement punaises de lit (T2/T3) | 450 € | 10 % | Punaises de lit |
| Traitement punaises de lit (T4+) | 650 € | 10 % | Punaises de lit |
| Intervention fourmis (1 passage) | 130 € | 10 % | Fourmis |
| Intervention cafards (1 passage) | 150 € | 10 % | Cafards |
| Démoustication parcelle | 200 € | 20 % | Moustiques |
| Contrat dératisation mensuel | 90 € | 20 % | Rats |
| Déplacement zone élargie (>30 km) | 50 € | 20 % | Toutes |

> Ces lignes sont indicatives. Alex les saisit lui-même via la page de configuration après mise en route du chantier.

**Section "Facturation" sur la page intervention**

Nouvelle section juste avant la signature :
- Recherche/filtre du catalogue Dolibarr (pré-filtré sur le type d'intervention courant)
- Bouton "Ajouter une prestation" → liste filtrée des produits Dolibarr matchant le type
- Pour chaque prestation ajoutée :
  - Libellé (lecture seule, snapshot)
  - Quantité (modifiable, par défaut 1)
  - Prix unitaire HT (modifiable sur place, valeur Dolibarr par défaut)
  - TVA (lecture seule)
  - Total HT / TTC calculés
  - Bouton supprimer
- Ligne libre possible (saisie manuelle sans produit catalogue)
- Total général HT et TTC

**Section "Facturation" sur la page détail intervention (après signature)**

Affiche l'état du cycle de vente :
- Si statut intervention = `signed` → affiche le devis (réf, montant), bouton "Valider le devis"
- Si devis validé → bouton "Convertir en facture"
- Si facture créée → bouton "Valider et envoyer la facture"
- Si facture envoyée → indication "Envoyée le JJ/MM/YYYY, en attente de paiement"
- À chaque étape : lien direct vers le document dans Dolibarr (pour aller voir le détail si besoin)

**Adaptation du PDF du rapport**

Le PDF v1 est enrichi d'une section "Prestations facturées" en fin de document, juste avant la signature, listant les prestations sélectionnées avec montants. Le PDF reste un rapport d'intervention — la facture officielle est générée par Dolibarr et envoyée séparément.

### 5.3 Chantier C — Apps iOS et Android (Capacitor)

**Setup Capacitor**

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Parasites Compagnie" fr.parasitescompagnie.app --web-dir=out
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

**Mode recommandé : remote URL**

Plus simple à maintenir : le conteneur natif charge l'app web depuis l'URL de production (`https://interventions.parasites-compagnie.fr`). Une seule version à maintenir, mises à jour instantanées sans repasser par les stores.

```typescript
// capacitor.config.ts
const config: CapacitorConfig = {
  appId: 'fr.parasitescompagnie.app',
  appName: 'Parasites Compagnie',
  server: {
    url: 'https://interventions.parasites-compagnie.fr',
    cleartext: false
  }
};
```

**Plugins activés sur mobile**

- `@capacitor/camera` — pour les photos (UX caméra native, bien meilleure qu'input file)
- `@capacitor/preferences` — pour la sauvegarde de brouillon (remplace localStorage qui peut être purgé par iOS Safari)
- `@capacitor/network` — détection coupure réseau pour afficher un bandeau d'avertissement
- `@capacitor/share` — bouton "Partager le rapport" supplémentaire (mail, AirDrop, etc.)
- `@capacitor/splash-screen` — écran de démarrage avec logo

**Détection plateforme**

```typescript
import { Capacitor } from '@capacitor/core';
const isNative = Capacitor.isNativePlatform();
```

Le code web reste utilisé tel quel. Les remplacements natifs s'activent uniquement quand `isNative === true`.

**Builds et publication**

- **iOS** : EAS Build (Expo) ou Codemagic, pas besoin de Mac local
- **Android** : Android Studio local ou cloud builders
- **Apple Developer Program** : 99 €/an
- **Google Play Console** : 25 € one-shot
- **Délai validation** : Apple 1-7 jours, Google 1-3 jours

**Assets à préparer**

- Icône app 1024×1024 px (sans transparence, sans coins arrondis)
- Splash screen 2732×2732 px
- 3-5 captures par device (iPhone, iPad, Android phone)
- Description courte et longue (FR)
- Politique de confidentialité hébergée à une URL publique (obligatoire)

## 6. Explicitement HORS scope (v3 ou plus tard)

- ❌ Form builder complet (style Stann "tous champs personnalisables") — templates en dur suffisent
- ❌ Encaissement intégré (TPE, Stripe) — paiement géré dans Dolibarr
- ❌ Multi-utilisateurs / rôles techniciens — mono-user reste en v2
- ❌ Portail client connecté — envoi par email reste la voie
- ❌ Planification / agenda — votre agenda actuel reste utilisé
- ❌ Mode hors-ligne complet — la sauvegarde locale de brouillon reste le filet
- ❌ Notifications push — pas en v2 (envisageable v2.1)
- ❌ Rapports de synthèse multi-interventions (courbes de tendance, cartes de chaleur Stann) — v3
- ❌ QR Codes — v3
- ❌ Géolocalisation des articles — v3
- ❌ Synchronisation automatique du statut "payée" des factures — v2.1 (cron Vercel optionnel)
- ❌ Signature électronique du devis par le client à distance — v3 (Stann ne le fait pas non plus)

## 7. Ordre de construction recommandé

**Important :** chaque chantier est livrable indépendamment. On déploie, on stabilise 1-2 semaines en prod, puis on passe au suivant.

### Chantier A — Multi-nuisibles (3 à 4 semaines)

1. Création du fichier de config `INTERVENTION_TEMPLATES` (6 types détaillés ci-dessus)
2. Migration DB : `postes` → `articles`, ajout `article_type`, `releves` jsonb, `intervention_type` sur interventions
3. Script de migration des données : anciennes colonnes etat/consommation/traces/action vers `releves` jsonb pour les interventions v1 existantes
4. Page de sélection du type d'intervention à la création
5. Adaptation du composant plan : couleurs/préfixes/icônes selon le template
6. Génération dynamique des formulaires de relevé depuis le template
7. Cas "Mixte" : popover de choix de type à chaque ajout d'article
8. Adaptation de la page `/phrases` : rattachement des phrases aux types
9. Adaptation PDF : libellés adaptés, sections par type pour les interventions Mixte
10. Test bout-en-bout sur chaque type

### Chantier B — Pilotage Dolibarr et facturation (4 à 5 semaines)

11. Route Handlers Next.js pour CRUD produits Dolibarr : `GET/POST/PUT/DELETE /api/dolibarr/prestations[/:id]`
12. Table Supabase `prestation_intervention_types` pour scoper les produits Dolibarr aux types d'intervention
13. Page `/configuration/prestations` : liste, création, édition, suppression de produits dans Dolibarr depuis l'app
14. Cache produits 5 min côté serveur Next.js
15. Table `intervention_prestations` + RLS
16. Section "Facturation" sur la page intervention : sélection prestations, modification montant, calcul total
17. Adaptation PDF avec section "Prestations facturées"
18. Workflow étape 2 — Création devis Dolibarr à la signature : Route Handler `POST /api/dolibarr/devis-from-intervention/{id}`
19. Workflow étape 3 — Validation devis : bouton + Route Handler `POST /api/dolibarr/devis/{id}/validate`
20. Workflow étape 4 — Conversion en facture : Route Handler `POST /api/dolibarr/facture-from-devis/{id}`
21. Workflow étape 5 — Validation et envoi facture : Route Handler `POST /api/dolibarr/facture/{id}/send`
22. Vue "Cycle de vente" sur la page détail intervention (statuts visuels devis → facture → envoyée)
23. Test bout-en-bout avec un vrai tiers Dolibarr, vraie facture créée et envoyée

### Chantier C — Mobile Capacitor (1 à 2 semaines)

24. Setup Capacitor, init iOS et Android, configuration `capacitor.config.ts` en mode remote URL
25. Adaptation des composants caméra et stockage : remplacements natifs progressifs
26. Configuration des assets (icônes, splash screens)
27. Test sur simulateur iOS et émulateur Android
28. Création comptes développeurs (Apple, Google)
29. Configuration builds CI (EAS ou Codemagic ou GitHub Actions)
30. Soumission aux stores (metadata, captures, politique de confidentialité)
31. Validation et publication

**Total v2 :** 8 à 11 semaines en temps partiel, plus 1-2 semaines d'attente Apple/Google sur le chantier C.

## 8. Référence visuelle

- **Maquette v1** (`parasites-compagnie-intervention.html`) — base d'UI à étendre
- **Stann (https://www.stann.app/fonctionnalites/interventions et https://www.stann.app/fonctionnalites/facturation)** — référence UX globale, workflow facturation
- **Exemples rapports Stann** : https://cdn.prod.website-files.com/6642042606fac29dff0ee5a0/66cdabcf91fa49a9e93e8329_c1f7a3ef2549a49b4afded033e6c8e03_exemples-rapports-stann-a4.pdf

**Cohérence visuelle v1 conservée** : primary `#0d7d6e`, fond `#fafaf9`, typo Geist, cartes blanches, badges ronds verts.

**Couleurs sémantiques par type** :
- Rats : `#0d7d6e` (vert primary)
- Frelons/Guêpes : `#b45309` (ambre)
- Punaises de lit : `#7c2d12` (brun rouge)
- Fourmis : `#92400e` (brun)
- Cafards : `#78350f` (brun foncé)
- Moustiques : `#0e7490` (cyan)
- Mixte : `#475569` (gris neutre)

## 9. Variables d'environnement (additions v2)

```env
# Existantes v1
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=interventions@parasites-compagnie.fr
DOLIBARR_API_URL=https://devis.parasites-compagnie.fr/api/index.php
DOLIBARR_API_KEY=
DOLIBARR_USER_OWNER_ID=

# Nouvelle v2
DOLIBARR_CATEGORIE_PRESTATIONS_ID=1
```

## 10. Prérequis (avant démarrage v2)

- [x] v1 en production et fonctionnelle
- [x] Catégorie "Prestations 3D" créée dans Dolibarr (ID = 1)
- [ ] Vérifier que l'utilisateur API Dolibarr a les droits : création/modification produits, création/validation devis, création/validation factures
- [ ] **Test API** : valider qu'on peut créer un devis, le valider, le convertir en facture, depuis curl/Postman (tester avec un tiers de test)
- [ ] Compte **Apple Developer** (99 €/an) — pour le chantier C
- [ ] Compte **Google Play Console** (25 € one-shot) — pour le chantier C
- [ ] **Logo Parasites Compagnie** haute définition pour icône app + splash screen
- [ ] **Politique de confidentialité** publiée à une URL publique (RGPD obligatoire pour les stores)

## 11. Notes pour Claude Code

- **3 chantiers indépendants** : un chantier à la fois, livrer, déployer, stabiliser 1-2 semaines, puis chantier suivant. Ne pas mélanger.
- **Dolibarr = source de vérité unique** : ne **jamais** dupliquer les produits/devis/factures côté Supabase. L'app pilote Dolibarr, ne le double pas.
- **Migrations DB en deux temps** : ajouter les nouvelles colonnes/tables d'abord, migrer les données, garder les anciennes colonnes compatibles. Suppression uniquement après stabilisation en prod.
- **Compatibilité ascendante** : toutes les modifications doivent préserver les interventions v1 existantes en base.
- **Templates en dur** : le fichier `INTERVENTION_TEMPLATES` est en code TypeScript, pas en DB. Itération rapide, pas d'admin à construire.
- **Capacitor n'est pas une refonte** : encapsulation, pas réécriture. Le code Next.js reste identique. Remplacements natifs progressifs.
- **Robustesse Dolibarr partout** : tout appel à Dolibarr peut échouer. Workflow facturation à la signature doit afficher l'état réel : si le devis a été créé mais que la facture n'a pas pu se créer, l'utilisateur voit clairement où ça a bloqué et peut relancer manuellement chaque étape depuis l'interface.
- **Cache côté serveur uniquement** : jamais stocker la clé API Dolibarr dans le bundle client. Toujours via Route Handler Next.js.
- **Pas de migrations destructrices sans backup** : dump SQL Supabase avant toute migration.
- **Piège API Dolibarr — paramètre `notrigger`** : les endpoints `/validate` (proposals, invoices) attendent un paramètre `notrigger` typé **integer** (`0` pour exécuter les triggers, `1` pour les désactiver). Envoyer un objet vide `{}` ou un boolean fait échouer la requête avec une 400 *"Invalid value specified for `notrigger`. Expecting integer value"*. Toujours envoyer `{ notrigger: 0 }` par défaut.
- **Piège API Dolibarr — création de facture depuis un devis** : l'endpoint `/invoices/createfromproposal/{id}` **n'existe pas** dans l'API Dolibarr (seul `createfromorder` existe pour les commandes, et `createfromcontract` pour les contrats). On crée la facture manuellement en faisant `GET /proposals/{id}` puis `POST /invoices` avec les lignes copiées. Le lien est tracé côté Supabase via `dolibarr_devis_id` + `dolibarr_facture_id` sur la même intervention.

---

**Prompt initial à donner à Claude Code :**

> Lis le fichier `cahier-des-charges-claude-code-v2.md` et conserve en tête le brief v1 et la maquette HTML déjà fournis. Confirme-moi que tu as bien identifié les 3 chantiers indépendants (Multi-nuisibles, Pilotage Dolibarr & facturation, Mobile Capacitor) et que tu as compris le principe que Dolibarr est la source de vérité unique pour produits/devis/factures.
>
> Puis, démarrons par le **chantier A — Multi-nuisibles, étape 1 (création du fichier `INTERVENTION_TEMPLATES`)**. Propose-moi le code complet du fichier en respectant la structure définie dans la section 5.1 du cahier des charges, et pose-moi toutes les questions nécessaires avant de continuer sur l'étape 2 (migration DB).

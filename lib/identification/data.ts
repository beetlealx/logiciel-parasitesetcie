export type Category = 'piqueur' | 'fourmi' | 'rongeur' | 'cafard' | 'volant' | 'mite' | 'moucheron' | 'xylophage' | 'termite'

export type SpeciesKey =
  | 'punaise_lit' | 'puce' | 'acarien_gale' | 'acarien_literie' | 'tique'
  | 'fourmi_noire' | 'fourmi_pharaon' | 'fourmi_charpentiere' | 'fourmi_argentine'
  | 'rat_surmulot' | 'rat_noir' | 'souris' | 'mulot'
  | 'cafard_germanique' | 'cafard_oriental' | 'blatte_americaine'
  | 'guepe' | 'frelon_europeen' | 'frelon_asiatique'
  | 'mite_vetement' | 'mite_alimentaire'
  | 'moucheron' | 'mouche'
  | 'petite_vrillette' | 'grosse_vrillette' | 'capricorne' | 'lyctus'
  | 'termite'

export interface Species {
  id: SpeciesKey
  nom: string
  latin: string
  emoji: string
  photo?: string
  categorie: Category
  couleur: string
  description: string
  signes_distinctifs: string[]
  zones_inspection: string[]
  traitement: string
  vecteur_maladie: boolean
  interventionLabel: string
}

function wiki(filename: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`
}

export interface QuestionOption {
  label: string
  desc?: string
  scores: Partial<Record<SpeciesKey, number>>
}

export interface Question {
  id: string
  text: string
  hint?: string
  options: QuestionOption[]
}

export const SPECIES: Record<SpeciesKey, Species> = {
  punaise_lit: {
    id: 'punaise_lit', nom: 'Punaise de lit', latin: 'Cimex lectularius', emoji: '🩸',
    categorie: 'piqueur', couleur: '#dc2626',
    description: 'Insecte hématophage de 5-7 mm, brun-rougeâtre, strictement nocturne. Se nourrit exclusivement de sang humain pendant le sommeil. Extrêmement difficile à détecter car se cache dans les recoins les plus fins (coutures de matelas, têtes de vis).',
    signes_distinctifs: [
      'Piqûres en ligne de 2-3 (surnommées "petit-déjeuner du lit")',
      'Taches de sang ou de fèces noires sur les draps/matelas',
      'Légère odeur douceâtre d\'amande dans la chambre',
      'Mues (exuvies) brun clair dans les coutures',
    ],
    zones_inspection: ['Coutures et plis du matelas', 'Cadre et lattes du lit', 'Têtes de vis du sommier', 'Derrière les tableaux et prises électriques', 'Meubles rembourrés proches du lit'],
    traitement: 'Traitement chimique (insecticide rémanent) combiné au thermique (vapeur >60 °C) sur l\'ensemble du mobilier. Lavage des textiles à 60 °C. Intervention professionnelle indispensable — 2 passages minimum.',
    vecteur_maladie: false, interventionLabel: 'Punaises de lit',
  },
  puce: {
    id: 'puce', nom: 'Puce', latin: 'Ctenocephalides felis/canis', emoji: '🦗',
    categorie: 'piqueur', couleur: '#d97706',
    description: 'Insecte aptère de 1-3 mm, brun brillant, capable de sauter jusqu\'à 30 cm. Parasite des animaux domestiques (chats et chiens) mais pique aussi l\'humain, préférentiellement aux chevilles.',
    signes_distinctifs: [
      'Piqûres groupées aux chevilles et mollets',
      'Insecte sauteur visible dans la fourrure de l\'animal',
      'Animal qui se gratte intensément',
      '"Poivre" (fèces de puces) dans la fourrure ou sur la litière',
    ],
    zones_inspection: ['Couchage et litière des animaux', 'Tapis et moquettes', 'Bords de canapé et fauteuils', 'Espaces sous les meubles'],
    traitement: 'Traitement simultané de l\'animal (antiparasitaire vétérinaire) et du logement (insecticide rémanent sur sols textiles). Aspiration poussée et élimination du sac. 2 passages à 15 jours d\'intervalle.',
    vecteur_maladie: false, interventionLabel: 'Puces',
  },
  acarien_gale: {
    id: 'acarien_gale', nom: 'Acarien de la gale', latin: 'Sarcoptes scabiei', emoji: '🔬',
    categorie: 'piqueur', couleur: '#7c3aed',
    description: 'Acarien microscopique (<0,5 mm) qui creuse des galeries sous la peau pour y pondre. Très contagieux par contact cutané direct prolongé. Orientation médicale obligatoire.',
    signes_distinctifs: [
      'Démangeaisons nocturnes intenses, difficiles à supporter',
      'Sillons visibles sous la peau (traits grisâtres de 5-15 mm)',
      'Zones touchées : entre les doigts, poignets, ceinture, aisselles',
      'Plusieurs personnes du même foyer ou entourage touchées',
    ],
    zones_inspection: ['Espace entre les doigts', 'Face interne des poignets', 'Ceinture et bas-ventre', 'Aisselles et plis du coude'],
    traitement: 'NE PAS TRAITER chimiquement le logement seul — orientation médicale en priorité (scabécide sur prescription pour toutes les personnes exposées). Lavage à 60 °C de tous les textiles de contact. Sacs hermétiques 72h pour les non lavables.',
    vecteur_maladie: false, interventionLabel: 'Acariens',
  },
  acarien_literie: {
    id: 'acarien_literie', nom: 'Acarien de la literie', latin: 'Dermatophagoides pteronyssinus', emoji: '🤧',
    categorie: 'piqueur', couleur: '#2563eb',
    description: 'Acarien microscopique de 0,1-0,3 mm présent dans tous les logements. Ne pique pas mais ses déjections déclenchent des réactions allergiques respiratoires et cutanées. Principal allergène des intérieurs.',
    signes_distinctifs: [
      'Rhinite, éternuements, yeux larmoyants au réveil',
      'Eczéma ou urticaire récurrents',
      'Aggravation des symptômes dans la chambre ou après la literie',
      'Asthme nocturne ou matinal',
    ],
    zones_inspection: ['Matelas (zone de la tête)', 'Oreillers et couettes', 'Moquettes et tapis épais', 'Canapés et fauteuils'],
    traitement: 'Housses anti-acariens sur matelas et oreillers. Lavage à 60 °C hebdomadaire de la literie. Aspiration avec filtre HEPA. Maintien de l\'humidité <50 %. Acaricide professionnel si allergie documentée sévère.',
    vecteur_maladie: false, interventionLabel: 'Acariens',
  },
  tique: {
    id: 'tique', nom: 'Tique', latin: 'Ixodes ricinus', emoji: '🕷️',
    categorie: 'piqueur', couleur: '#059669',
    description: 'Arachnide de 2-10 mm (gorgée). Se fixe dans la peau pour un repas sanguin de plusieurs jours. Vectrice de la maladie de Lyme — signalement médical recommandé après piqûre.',
    signes_distinctifs: [
      'Tique visible et fixée dans la peau',
      'Piqûre unique, indolore initialement',
      'Rougeur circulaire progressive (érythème migrant) 1-4 semaines après',
      'Après séjour en zone boisée, prairie, jardin avec animaux',
    ],
    zones_inspection: ['Hautes herbes, lisières de forêt, jardins', 'Derrière les oreilles, nuque, creux du genou', 'Animaux domestiques (pelage)'],
    traitement: 'Retrait immédiat avec tire-tique (traction droite, sans tourner). Désinfection. Consulter un médecin si érythème migrant, fièvre ou fatigue dans le mois suivant. Traitement du jardin possible si forte infestation.',
    vecteur_maladie: true, interventionLabel: 'Tiques',
  },

  fourmi_noire: {
    id: 'fourmi_noire', nom: 'Fourmi noire des jardins', latin: 'Lasius niger', emoji: '🐜',
    categorie: 'fourmi', couleur: '#1c1917',
    description: 'Fourmi de 2-4 mm, noire brillante. La plus commune en France. Nidifie dans les sols et fissures du jardin. S\'introduit dans les habitations à la recherche de nourriture sucrée.',
    signes_distinctifs: [
      'Noire, petite à moyenne taille (2-4 mm)',
      'File bien organisée entre jardin et cuisine',
      'Nid en terre avec ouvertures caractéristiques',
      'Essaimage estival (fourmis ailées en août-septembre)',
    ],
    zones_inspection: ['Bords de terrasse et dalle', 'Fissures de fondation', 'Cuisine et placards', 'Sous les pierres au jardin'],
    traitement: 'Gel appât non répulsif disposé sur les chemins de transit. Poudre insecticide sur la fourmilière identifiée. Colmatage des fissures d\'accès après traitement.',
    vecteur_maladie: false, interventionLabel: 'Fourmi noire',
  },
  fourmi_pharaon: {
    id: 'fourmi_pharaon', nom: 'Fourmi pharaon', latin: 'Monomorium pharaonis', emoji: '🐜',
    categorie: 'fourmi', couleur: '#d97706',
    description: 'Fourmi de 1,5-2 mm, jaune dorée. Espèce tropicale nichant dans les parois chauffées des immeubles. Multi-reines, très difficile à éradiquer. Problème sanitaire en milieu hospitalier et collectif.',
    signes_distinctifs: [
      'Très petite (1,5-2 mm), couleur jaune à dorée',
      'Présente à l\'intérieur toute l\'année (thermophile)',
      'Remonte les canalisations, fréquente les sanitaires',
      'Pas d\'essaimage (reines aptères)',
    ],
    zones_inspection: ['Joints de carrelage salle de bain/cuisine', 'Derrière les prises électriques', 'Canalisations et plomberie chaude', 'Cloisons creuses chauffées'],
    traitement: 'GEL APPÂT UNIQUEMENT — jamais de spray répulsif (fragmente les colonies en dizaines de sous-colonies). Traitement long (2-3 mois minimum). Coordination de tous les appartements de l\'immeuble indispensable.',
    vecteur_maladie: false, interventionLabel: 'Fourmi pharaon',
  },
  fourmi_charpentiere: {
    id: 'fourmi_charpentiere', nom: 'Fourmi charpentière', latin: 'Camponotus herculeanus', emoji: '🐜',
    categorie: 'fourmi', couleur: '#92400e',
    description: 'Grande fourmi de 6-15 mm, noire (ouvrières) avec abdomen parfois brun-rouge. Creuse ses galeries dans le bois humide — ne le mange pas mais l\'affaiblit structurellement.',
    signes_distinctifs: [
      'Grande taille (6-15 mm), dimorphisme marqué',
      'Sciure de bois très fine (copeau) sous les galeries',
      'Bois creux et galeries lisses et propres au toucher',
      'Active la nuit, sons de grattage dans les murs',
    ],
    zones_inspection: ['Charpente et solives exposées à l\'humidité', 'Encadrements de fenêtres et seuils', 'Planchers bois en zones humides', 'Souches et bois de jardin proche du bâtiment'],
    traitement: 'Localisation précise du nid (détection sonore). Insecticide pénétrant injecté dans les galeries. Traitement préventif du bois. Élimination impérative de la source d\'humidité sous-jacente.',
    vecteur_maladie: false, interventionLabel: 'Fourmi charpentière',
  },
  fourmi_argentine: {
    id: 'fourmi_argentine', nom: 'Fourmi d\'Argentine', latin: 'Linepithema humile', emoji: '🐜',
    categorie: 'fourmi', couleur: '#78716c',
    description: 'Fourmi de 2-3 mm, brun-marron clair. Espèce invasive formant des super-colonies sans frontière de territoire. Prédomine dans le Sud et Centre de la France. Agressive envers les autres espèces.',
    signes_distinctifs: [
      'Marron clair, 2-3 mm',
      'Files ininterrompues sur de très longues distances',
      'Présence dense, diffuse, sans fourmilière unique identifiable',
      'Courante dans les jardins du Midi',
    ],
    zones_inspection: ['Sols, murs, tuyauteries', 'Jardin entier et espaces verts', 'Cuisine en particulier'],
    traitement: 'Gel appât exclusivement (jamais de spray). Traitement à l\'échelle du quartier recommandé — les super-colonies s\'étendent sur plusieurs centaines de mètres.',
    vecteur_maladie: false, interventionLabel: 'Fourmi acrobate',
  },

  rat_surmulot: {
    id: 'rat_surmulot', nom: 'Rat surmulot', latin: 'Rattus norvegicus', emoji: '🐀',
    categorie: 'rongeur', couleur: '#92400e',
    description: 'Plus grand rat (corps 25-30 cm), brun grisâtre, museau arrondi, queue plus courte que le corps. Espèce terrestre par excellence — égouts, caves, terriers. Excellent nageur.',
    signes_distinctifs: [
      'Fèces cylindriques 15-20 mm, bouts arrondis',
      'Galeries et terriers le long des murs ou fondations',
      'Présence dans caves et égouts',
      'Bruits de grattage et courses la nuit au sol',
    ],
    zones_inspection: ['Caves et sous-sols', 'Long des murs et fondations', 'Égouts et regards', 'Derrière les gros appareils électroménagers'],
    traitement: 'Raticide anticoagulant (brodifacoum/bromadiolone) en boîtes sécurisées. Colmatage de tous les orifices >2 cm. Suivi à 15 et 30 jours. Traitement des égouts si nécessaire.',
    vecteur_maladie: true, interventionLabel: 'Rats',
  },
  rat_noir: {
    id: 'rat_noir', nom: 'Rat noir', latin: 'Rattus rattus', emoji: '🐀',
    categorie: 'rongeur', couleur: '#44403c',
    description: 'Rat de 18-25 cm, brun foncé à noir, museau pointu, grandes oreilles, queue PLUS longue que le corps. Excellent grimpeur — vit en hauteur (toitures, greniers, charpentes).',
    signes_distinctifs: [
      'Fèces en fuseau allongé 10-12 mm, bouts pointus',
      'Présence dans les hauteurs (grenier, combles, toiture)',
      'Bruits de course dans les plafonds',
      'Câbles et bois rongés en hauteur',
    ],
    zones_inspection: ['Grenier et combles', 'Charpente et toiture', 'Gaines et faux-plafonds', 'Branches proches du bâtiment'],
    traitement: 'Raticide en boîtes sécurisées fixées en hauteur. Obturation des entrées en toiture (grillage, mortier). Élagage des branches à moins de 50 cm du bâtiment.',
    vecteur_maladie: true, interventionLabel: 'Rats',
  },
  souris: {
    id: 'souris', nom: 'Souris commune', latin: 'Mus musculus', emoji: '🐭',
    categorie: 'rongeur', couleur: '#a8a29e',
    description: 'Rongeur de 7-10 cm, gris à brun clair, très agile. Reproductrice hors pair (jusqu\'à 10 portées de 6-8 petits par an). Passe par tout orifice ≥5 mm.',
    signes_distinctifs: [
      'Fèces très petites 3-5 mm, forme de grain de riz',
      'Présente partout dans le logement',
      'Emballages alimentaires grignotés',
      'Odeur d\'urine caractéristique dans les placards',
    ],
    zones_inspection: ['Cuisine (derrière réfrigérateur, sous évier)', 'Fissures et trous dès 5 mm', 'Placards alimentaires', 'Faux-planchers et gaines'],
    traitement: 'Raticide en blocs ou pièges adaptés (souricières). Colmatage systématique de tout orifice ≥5 mm (laine d\'acier + mastic). Protection hermétique des stocks alimentaires.',
    vecteur_maladie: true, interventionLabel: 'Souris',
  },
  mulot: {
    id: 'mulot', nom: 'Mulot sylvestre', latin: 'Apodemus sylvaticus', emoji: '🐭',
    categorie: 'rongeur', couleur: '#d97706',
    description: 'Rongeur de 8-11 cm bicolore (dos brun-roux, ventre blanc), grandes oreilles rondes, grands yeux. Principalement extérieur, s\'introduit dans les bâtiments en automne/hiver.',
    signes_distinctifs: [
      'Bicolore : dos brun-roux, ventre blanc bien délimité',
      'Fèces légèrement plus grandes que la souris',
      'Principalement jardin, remise, garage, cave',
      'Activité surtout en zone rurale ou péri-urbaine',
    ],
    zones_inspection: ['Jardin, compost, tas de bois', 'Remise et garage', 'Cave et vide sanitaire', 'Fondations de la maison'],
    traitement: 'Pièges à capture ou raticide à faible dose. Désherbage des abords. Colmatage des entrées de fondation et de cave.',
    vecteur_maladie: true, interventionLabel: 'Rongeurs divers',
  },

  blatte_americaine: {
    id: 'blatte_americaine', nom: 'Blatte américaine', latin: 'Periplaneta americana', emoji: '🪳',
    categorie: 'cafard', couleur: '#b91c1c',
    description: 'La plus grande blatte rencontrée en Europe (35-40 mm), brun-rouge brillant avec un liseré jaunâtre sur le pronotum. Espèce cosmopolite des égouts, des sous-sols très humides et des locaux techniques. Les adultes possèdent des ailes fonctionnelles mais volent rarement.',
    signes_distinctifs: [
      'Grande taille (35-40 mm), brun-rouge brillant',
      'Liseré jaunâtre en fer à cheval sur le pronotum',
      'Présente dans les égouts, caves et locaux très humides',
      'Remonte par les canalisations et regards',
      'Vole occasionnellement en été (chaleur)',
    ],
    zones_inspection: ['Égouts et regards de voirie', 'Sous-sol et cave très humides', 'Locaux techniques (chaufferie, gaines)', 'Canalisations et siphons de sol', 'Local poubelles et bennes'],
    traitement: 'Insecticide rémanent en spray ou nébulisation sur les surfaces de transit. Gel appât complémentaire dans les fissures. Traitement des canalisations avec produit rémanent. Amélioration impérative de la ventilation et réduction de l\'humidité.',
    vecteur_maladie: false, interventionLabel: 'Blattes / Cafards',
  },

  cafard_germanique: {
    id: 'cafard_germanique', nom: 'Cafard germanique', latin: 'Blattella germanica', emoji: '🪳',
    categorie: 'cafard', couleur: '#78350f',
    description: 'Cafard de 10-15 mm, brun-jaune avec 2 bandes sombres parallèles sur le pronotum. L\'espèce la plus répandue en milieu intérieur en France. Nocturne, préfère les environnements chauds et humides.',
    signes_distinctifs: [
      'Brun-jaune, deux bandes noires bien visibles sur le dos',
      'Petit (10-15 mm), s\'aplatit dans les fentes les plus fines',
      'Actif la nuit — fuient la lumière soudaine',
      'Odeur musquée caractéristique dans les placards',
    ],
    zones_inspection: ['Sous l\'évier, derrière le réfrigérateur et lave-vaisselle', 'Fentes derrière les plinthes', 'Boîtiers électriques et tableaux', 'Joints de carrelage et faux-plafonds'],
    traitement: 'Gel appât en points de 1-2 g dans chaque fente (ne pas utiliser de spray répulsif). Pièges à colle pour évaluer l\'infestation. Traitement de toutes les gaines et passages. 3 passages minimum.',
    vecteur_maladie: false, interventionLabel: 'Blattes / Cafards',
  },
  cafard_oriental: {
    id: 'cafard_oriental', nom: 'Cafard oriental', latin: 'Blatta orientalis', emoji: '🪳',
    categorie: 'cafard', couleur: '#1c1917',
    description: 'Grand cafard de 20-30 mm, brun très foncé à noir brillant. Préfère les milieux froids et très humides (caves, égouts, sanitaires). Court rapidement mais ne vole pas.',
    signes_distinctifs: [
      'Grand (20-30 mm), noir brillant',
      'Présent en cave, sous-sol, sanitaires',
      'Remonte par les canalisations et siphons',
      'Fèces cylindriques de 3-5 mm',
    ],
    zones_inspection: ['Cave et sous-sol', 'Siphons et canalisations', 'Local poubelles', 'Espaces techniques humides'],
    traitement: 'Insecticide rémanent en nébulisation ou spray sur les surfaces de transit. Gel appât complémentaire. Traitement des canalisations. Amélioration de la ventilation pour réduire l\'humidité.',
    vecteur_maladie: false, interventionLabel: 'Blattes / Cafards',
  },

  guepe: {
    id: 'guepe', nom: 'Guêpe commune', latin: 'Vespula vulgaris', emoji: '🐝',
    categorie: 'volant', couleur: '#d97706',
    description: 'Guêpe de 12-17 mm, jaune et noir avec bandes égales. Nidifie dans les greniers, terriers et haies. Agressive si le nid est menacé, surtout en fin d\'été.',
    signes_distinctifs: [
      'Jaune et noir, bandes régulières (12-17 mm)',
      'Nid en carton gris, forme de poire ou boule',
      'Vol rapide et direct',
      'Agressive en septembre-octobre',
    ],
    zones_inspection: ['Grenier et combles', 'Creux dans les arbres ou murs', 'Terriers dans le sol', 'Auvents et rebords de fenêtres'],
    traitement: 'Traitement de nuit (insecticide poudre ou aérosol dans l\'orifice d\'entrée du nid). Équipement de protection individuelle obligatoire. Retrait du nid après 24-48h.',
    vecteur_maladie: false, interventionLabel: 'Guêpe commune',
  },
  frelon_europeen: {
    id: 'frelon_europeen', nom: 'Frelon européen', latin: 'Vespa crabro', emoji: '🐝',
    categorie: 'volant', couleur: '#b45309',
    description: 'Plus grand frelon indigène d\'Europe (25-35 mm), brun-noir avec bandes jaunes larges et tête rousse. Moins agressif que la guêpe sauf si le nid est dérangé. Nidifie dans les creux d\'arbres ou greniers.',
    signes_distinctifs: [
      'Grand (25-35 mm), tête rousse distinctive',
      'Bandes jaunes larges sur abdomen brun-noir',
      'Nid en carton brun, en hauteur ou dans un creux',
      'Vol lourd, bourdonnement fort',
    ],
    zones_inspection: ['Creux d\'arbres anciens', 'Grenier, combles, charpente', 'Vieilles cheminées', 'Nichoirs abandonnés'],
    traitement: 'Traitement de nuit avec insecticide pénétrant dans l\'entrée du nid. Protection individuelle. Le frelon européen est une espèce protégée dans certaines régions — vérifier la réglementation locale.',
    vecteur_maladie: false, interventionLabel: 'Frelon européen',
  },
  frelon_asiatique: {
    id: 'frelon_asiatique', nom: 'Frelon asiatique', latin: 'Vespa velutina', emoji: '🐝',
    categorie: 'volant', couleur: '#dc2626',
    description: 'Frelon de 25-30 mm, brun-noir avec bande orange sur l\'abdomen et pattes jaunes caractéristiques. Espèce invasive arrivée en France en 2004. Prédateur massif des abeilles mellifères.',
    signes_distinctifs: [
      'Brun-noir, bande orange sur le 4e segment abdominal',
      'Pattes jaunes distinctives (critère clé)',
      'Nid en hauteur (>3 m), forme de poire allongée, entrée latérale',
      'Chasse activement devant les ruches',
    ],
    zones_inspection: ['Hauteur dans les arbres (5-10 m)', 'Toitures et façades de bâtiments', 'Haies et lisières'],
    traitement: 'Intervention spécialisée avec perche ou nacelle obligatoire (danger + hauteur). Traitement de nuit. Signalement conseillé en mairie ou sur le portail frelon-asiatique.fr (espèce envahissante).',
    vecteur_maladie: false, interventionLabel: 'Frelon asiatique',
  },

  mite_vetement: {
    id: 'mite_vetement', nom: 'Mite des vêtements', latin: 'Tineola bisselliella', emoji: '🦋',
    categorie: 'mite', couleur: '#d97706',
    description: 'Petit papillon de 6-9 mm, brun doré uniforme. Ce sont les larves (pas l\'adulte) qui détruisent les fibres naturelles : laine, soie, cachemire, fourrure. Vol maladroit, fuit la lumière.',
    signes_distinctifs: [
      'Papillon brun doré uniforme, vol lent et maladroit',
      'Trous irréguliers dans les vêtements en laine ou cachemire',
      'Larves blanches à tête brune dans les textiles',
      'Cocons soyeux dans les plis des vêtements',
    ],
    zones_inspection: ['Penderies et armoires (laine, cachemire, soie)', 'Tiroirs de rangement de vêtements', 'Tapis en fibres naturelles', 'Fourrures et manteaux stockés'],
    traitement: 'Lavage à 60 °C ou congélation (-18 °C pendant 72 h) de tous les textiles atteints. Pièges à phéromones (détection et piégeage mâles). Insecticide diffuseur dans les espaces fermés. Aération et nettoyage régulier des armoires.',
    vecteur_maladie: false, interventionLabel: 'Mites',
  },
  mite_alimentaire: {
    id: 'mite_alimentaire', nom: 'Mite des denrées', latin: 'Plodia interpunctella', emoji: '🦋',
    categorie: 'mite', couleur: '#92400e',
    description: 'Papillon de 8-10 mm aux ailes bicolores (gris clair + brun-roux). Les larves se développent dans les denrées sèches non protégées (farines, céréales, fruits secs, épices, chocolat).',
    signes_distinctifs: [
      'Papillon bicolore : moitié supérieure grise, inférieure brun-roux',
      'Filaments soyeux agglutinant la farine ou les céréales',
      'Larves blanches au sein des produits secs',
      'Papillons volant dans la cuisine, surtout le soir',
    ],
    zones_inspection: ['Placards cuisine (farines, céréales, riz)', 'Épices et fruits secs en vrac', 'Aliments pour animaux (croquettes)', 'Chocolat et café en grains'],
    traitement: 'Élimination immédiate de toutes les denrées infestées (sac hermétique). Nettoyage complet des placards à l\'aspirateur puis au vinaigre. Pièges à phéromones. Stockage ultérieur en bocaux hermétiques.',
    vecteur_maladie: false, interventionLabel: 'Mites alimentaires',
  },

  moucheron: {
    id: 'moucheron', nom: 'Moucheron / Drosophile', latin: 'Drosophila melanogaster', emoji: '🪰',
    categorie: 'moucheron', couleur: '#78350f',
    description: 'Diptère de 2-3 mm, brun-jaune avec yeux rouges caractéristiques. Attirés par les fruits fermentés, déchets organiques et canalisations souillées. Reproduction très rapide (cycle de 10 jours).',
    signes_distinctifs: [
      'Minuscule (2-3 mm), yeux rouges visibles',
      'Nuées autour des fruits mûrs ou corbeille',
      'Présence autour des poubelles et siphons',
      'Émergence depuis les canalisations le matin',
    ],
    zones_inspection: ['Corbeille à fruits et légumes', 'Bac à compost et poubelles organiques', 'Siphons et canalisations', 'Bouteilles vides avec résidus sucrés'],
    traitement: 'Élimination systématique des sources organiques (fruits trop mûrs, résidus). Nettoyage des siphons avec produit enzymatique. Pièges à moucherons (vinaigre de cidre + liquide vaisselle). Filets anti-insectes sur les ouvertures en été.',
    vecteur_maladie: false, interventionLabel: 'Moucherons',
  },
  mouche: {
    id: 'mouche', nom: 'Mouche domestique', latin: 'Musca domestica', emoji: '🪰',
    categorie: 'moucheron', couleur: '#57534e',
    description: 'Mouche de 6-8 mm, gris-noir avec 4 lignes sombres sur le thorax. Omnivore et hautement contaminante — se pose successivement sur matières fécales et aliments en transmettant bactéries et parasites. Cycle de vie de 2-3 semaines permettant une multiplication explosive.',
    signes_distinctifs: [
      'Taille 6-8 mm, vol direct et rapide',
      'Taches noires (fèces) sur les surfaces claires (plafond, carrelage)',
      'Présence massive et persistante autour des aliments',
      'Larves blanches (asticots) dans les déchets organiques',
      'Population qui explose en quelques jours',
    ],
    zones_inspection: ['Cuisine et locaux alimentaires', 'Local poubelles et dépotoir', 'Bennes et zones de collecte', 'Cadavres d\'animaux cachés (source possible)', 'Fosses et compost'],
    traitement: 'Identification et élimination de la source de ponte (déchets, cadavre). Pièges UV à mouches (lampe piège). Rideau d\'air sur les ouvertures de locaux alimentaires. Insecticide en espace traité si infestation sévère. Nettoyage désinfectant des surfaces souillées.',
    vecteur_maladie: true, interventionLabel: 'Mouches',
  },

  petite_vrillette: {
    id: 'petite_vrillette', nom: 'Petite vrillette', latin: 'Anobium punctatum', emoji: '🪲',
    categorie: 'xylophage', couleur: '#92400e',
    description: 'Coléoptère de 2-5 mm, brun-roux, caractérisé par son capuchon pronotum bombé. L\'espèce xylophage la plus fréquente en France. Les larves creusent des galeries dans les bois anciens pendant 3 à 5 ans avant la métamorphose. Les adultes émergent en mai-juin en perçant un trou rond de 1-2 mm.',
    signes_distinctifs: [
      'Multiples petits trous ronds de 1-2 mm de diamètre',
      'Sciure très fine (poussière blanche ou jaunâtre) sous les trous',
      'Bois sonore et creux au sondage',
      'Insectes adultes brun-roux de 2-5 mm en mai-juin',
      'Galeries en réseau sous la surface du bois',
    ],
    zones_inspection: ['Poutres et solives en bois anciens', 'Parquets et planchers en chêne', 'Meubles anciens et bibliothèques', 'Escaliers et boiseries', 'Encadrements de fenêtres et portes'],
    traitement: 'Injection ou badgeonnage d\'insecticide curatif pénétrant (perméthrine ou deltaméthrine). Traitement de masse par diffusion en locaux fermés si étendu. Contrôle de l\'humidité (<18 % dans le bois). 2 passages consécutifs recommandés.',
    vecteur_maladie: false, interventionLabel: 'Petite vrillette',
  },
  grosse_vrillette: {
    id: 'grosse_vrillette', nom: 'Grosse vrillette', latin: 'Xestobium rufovillosum', emoji: '🪲',
    categorie: 'xylophage', couleur: '#7c3aed',
    description: 'Coléoptère de 5-9 mm, brun marbré de taches claires. Attaque spécifiquement les vieux bois de feuillus humides et dégradés (chêne, orme). Célèbre pour ses "coups de tête" contre le bois produisant un tic-tac caractéristique utilisé pour attirer les partenaires sexuels ("horloge de la mort").',
    signes_distinctifs: [
      'Trous ronds de 3-4 mm de diamètre (plus grands que la petite vrillette)',
      'Son de tic-tac audible la nuit dans le bois (surtout en mars-juin)',
      'Sciure granuleuse brun-beige dans les galeries',
      'Bois très dégradé, souvent déjà fragilisé par l\'humidité ou des champignons',
      'Insectes 5-9 mm, brun marbré de taches claires',
    ],
    zones_inspection: ['Charpentes en vieux chêne humide', 'Poutres exposées aux infiltrations', 'Planchers anciens avec problèmes d\'humidité', 'Caves et sous-sols avec bois structurel'],
    traitement: 'Traitement curatif par injection sous pression d\'insecticide dans les galeries. Traitement préventif de la face cachée des bois. Élimination IMPÉRATIVE de la source d\'humidité (la grosse vrillette ne prospère que dans un bois humide). Remplacement si attaque structurellement critique.',
    vecteur_maladie: false, interventionLabel: 'Grosse vrillette',
  },
  capricorne: {
    id: 'capricorne', nom: 'Capricorne des maisons', latin: 'Hylotrupes bajulus', emoji: '🪲',
    categorie: 'xylophage', couleur: '#dc2626',
    description: 'Grand coléoptère de 10-25 mm, gris-brun avec de longues antennes et deux taches blanches caractéristiques sur les élytres. Attaque EXCLUSIVEMENT les bois résineux (sapin, pin, épicéa). Les dommages structurels peuvent compromettre la solidité d\'une charpente entière. En France, sa présence est à déclarer lors d\'une vente immobilière (diagnostic parasitaire obligatoire).',
    signes_distinctifs: [
      'Orifices de sortie elliptiques (10 x 5 mm, en forme d\'amande)',
      'Bruit de crissement ou de grattage dans la charpente',
      'Sciure grossière brun-clair amalgamée dans les galeries',
      'Galeries larges (7-10 mm) parallèles aux fibres du bois',
      'Grand insecte (10-25 mm) gris-brun aux antennes longues',
    ],
    zones_inspection: ['Charpentes en sapin ou pin', 'Pannes, faîtières et chevrons', 'Lambris et bardages résineux', 'Boiseries sous toiture'],
    traitement: 'Insecticide curatif pénétrant injecté sous pression dans les galeries et imprégné sur les faces accessibles. Traitement thermique (chaleur sèche >55 °C) pour les cas sévères. DÉCLARATION OBLIGATOIRE lors de la vente du bien immobilier. Bilan structurel par charpentier après traitement.',
    vecteur_maladie: false, interventionLabel: 'Capricorne des maisons',
  },
  lyctus: {
    id: 'lyctus', nom: 'Lyctus', latin: 'Lyctus brunneus', emoji: '🪲',
    categorie: 'xylophage', couleur: '#d97706',
    description: 'Coléoptère plat de 3-7 mm, brun-roux. Attaque uniquement l\'aubier (partie jeune) des bois de feuillus à gros pores (chêne, frêne, orme) et les bois exotiques. Particulièrement fréquent dans les parquets en chêne neufs ou récents. Le bois peut sembler intact en surface alors que l\'intérieur est entièrement vidé.',
    signes_distinctifs: [
      'Trous ronds très fins de 1 mm, régulièrement espacés',
      'Sciure très fine pulvérulente brun-jaunâtre s\'écoulant des trous',
      'Surface du bois apparemment intacte malgré des galeries internes',
      'Parquets ou bois exotiques de moins de 10 ans preferentiellement touchés',
      'Insectes plats brun-roux de 3-7 mm',
    ],
    zones_inspection: ['Parquets en chêne (surtout neufs)', 'Plinthes et baguettes en chêne ou frêne', 'Bois exotiques (merbau, iroko, teck)', 'Contreplaqués en feuillus', 'Meubles en chêne massif'],
    traitement: 'Insecticide curatif en injection sur toute la surface et dans les trous visibles. Si le parquet est massivement touché, remplacement des lames peut s\'avérer nécessaire. Traitement préventif des bois avant pose recommandé pour éviter les récidives.',
    vecteur_maladie: false, interventionLabel: 'Lyctus',
  },

  termite: {
    id: 'termite', nom: 'Termite souterrain', latin: 'Reticulitermes flavipes / lucifugus', emoji: '🐛',
    categorie: 'termite', couleur: '#dc2626',
    description: 'Insecte social de 4-6 mm (ouvriers blanc-crème, soldats à tête brun-orangé). Espèce la plus destructrice pour les bâtiments en France — classée calamité nationale. Colonise depuis le sol et creuse des galeries dans le bois en suivant les fibres, laissant une mince pellicule extérieure intacte. La présence doit obligatoirement être déclarée en mairie.',
    signes_distinctifs: [
      'Galeries de boue brunâtres sur les murs et fondations (tunnels de transit)',
      'Bois qui sonne creux, surface intacte mais intérieur vidé',
      'Essaimage printanier : ailés (gamètes) en nuées autour des sources de lumière',
      'Ouvriers blanc-crème et soldats à tête orange trouvés dans le bois ouvert',
      'Dommages en profondeur suivant le fil du bois',
    ],
    zones_inspection: ['Fondations et vides sanitaires', 'Planchers posés sur terre-plein', 'Menuiseries en contact avec le sol', 'Caves et sous-sols humides', 'Périmètre extérieur du bâtiment'],
    traitement: 'DÉCLARATION OBLIGATOIRE EN MAIRIE dans les communes en zone termitée (liste préfectorale). Traitement barrière chimique (injection de produit dans le sol tout autour du bâtiment) et/ou pose de systèmes d\'appâtage. Traitement curatif des bois infestés. Suivi sur 5 ans minimum. Intervention d\'un professionnel certifié obligatoire.',
    vecteur_maladie: false, interventionLabel: 'Termites',
  },
}

export const CATEGORY_SPECIES: Record<Category, SpeciesKey[]> = {
  piqueur: ['punaise_lit', 'puce', 'acarien_gale', 'acarien_literie', 'tique'],
  fourmi: ['fourmi_noire', 'fourmi_pharaon', 'fourmi_charpentiere', 'fourmi_argentine'],
  rongeur: ['rat_surmulot', 'rat_noir', 'souris', 'mulot'],
  cafard: ['cafard_germanique', 'cafard_oriental', 'blatte_americaine'],
  volant: ['guepe', 'frelon_europeen', 'frelon_asiatique'],
  mite: ['mite_vetement', 'mite_alimentaire'],
  moucheron: ['moucheron', 'mouche'],
  xylophage: ['petite_vrillette', 'grosse_vrillette', 'capricorne', 'lyctus'],
  termite: ['termite'],
}

export const CATEGORY_QUESTIONS: Record<Category, Question[]> = {
  piqueur: [
    {
      id: 'piq_moment',
      text: 'Quand les piqûres apparaissent-elles principalement ?',
      options: [
        { label: 'La nuit uniquement', desc: 'Réveil avec piqûres, rien le jour', scores: { punaise_lit: 4, acarien_gale: 2 } },
        { label: 'Jour et nuit, démangeaisons permanentes', scores: { acarien_gale: 3, acarien_literie: 3 } },
        { label: 'Après contact avec un animal (chat, chien)', scores: { puce: 5 } },
        { label: 'Après une sortie en zone boisée ou prairie', scores: { tique: 5 } },
      ],
    },
    {
      id: 'piq_zone',
      text: 'Où sont localisées les piqûres sur le corps ?',
      options: [
        { label: 'Parties découvertes : visage, cou, bras', scores: { punaise_lit: 4, puce: 1 } },
        { label: 'Chevilles et mollets uniquement', scores: { puce: 5 } },
        { label: 'Entre les doigts, poignets, ceinture, aisselles', scores: { acarien_gale: 5 } },
        { label: 'Partout, plaques diffuses (pas de piqûres isolées)', scores: { acarien_literie: 5 } },
        { label: 'Piqûre unique, zone de pli (genou, aine, nuque)', scores: { tique: 4 } },
      ],
    },
    {
      id: 'piq_aspect',
      text: 'Quel est l\'aspect des piqûres ou lésions ?',
      options: [
        { label: 'Deux ou trois piqûres en ligne (comme des boutons rouges)', scores: { punaise_lit: 5 } },
        { label: 'Piqûres rondes isolées, rouges avec point central', scores: { puce: 3, punaise_lit: 2 } },
        { label: 'Sillons ou tracés sous la peau visibles', scores: { acarien_gale: 5 } },
        { label: 'Rougeur circulaire (cercle) autour d\'une piqûre unique', scores: { tique: 5 } },
        { label: 'Plaques rouges ou urticaire diffuse', scores: { acarien_literie: 4 } },
      ],
    },
    {
      id: 'piq_animaux',
      text: 'Y a-t-il des animaux domestiques dans le logement ?',
      options: [
        { label: 'Oui, un chat ou un chien', scores: { puce: 4 } },
        { label: 'Oui, autre animal (lapin, oiseau…)', scores: { puce: 2 } },
        { label: 'Non, pas d\'animaux', scores: { punaise_lit: 1, acarien_gale: 1 } },
      ],
    },
    {
      id: 'piq_voyage',
      text: 'Y a-t-il eu un voyage ou achat récent ?',
      options: [
        { label: 'Voyage ou nuit en hôtel / hébergement partagé', scores: { punaise_lit: 4 } },
        { label: 'Achat de matelas, canapé ou meuble d\'occasion', scores: { punaise_lit: 4 } },
        { label: 'Non, rien de particulier', scores: { acarien_literie: 1 } },
      ],
    },
    {
      id: 'piq_foyer',
      text: 'Combien de personnes du foyer sont touchées ?',
      options: [
        { label: 'Toutes les personnes du foyer', scores: { acarien_gale: 4, punaise_lit: 2, acarien_literie: 2 } },
        { label: 'Quelques-unes (pas toutes)', scores: { punaise_lit: 3, puce: 2 } },
        { label: 'Une seule personne', scores: { puce: 2, tique: 2 } },
      ],
    },
  ],

  fourmi: [
    {
      id: 'four_taille',
      text: 'Quelle est la taille des fourmis observées ?',
      options: [
        { label: 'Très petites, <2 mm (à peine visibles)', scores: { fourmi_pharaon: 4, fourmi_argentine: 3 } },
        { label: 'Petites, 2-4 mm', scores: { fourmi_noire: 3, fourmi_argentine: 2 } },
        { label: 'Moyennes, 4-8 mm', scores: { fourmi_noire: 3 } },
        { label: 'Grandes, >8 mm (fourmis imposantes)', scores: { fourmi_charpentiere: 5 } },
      ],
    },
    {
      id: 'four_couleur',
      text: 'Quelle est la couleur des fourmis ?',
      options: [
        { label: 'Noire brillante', scores: { fourmi_noire: 4, fourmi_charpentiere: 3 } },
        { label: 'Marron ou brun clair', scores: { fourmi_argentine: 5 } },
        { label: 'Dorée / jaunâtre / orange pâle', scores: { fourmi_pharaon: 5 } },
        { label: 'Rouge ou rousse', scores: { fourmi_noire: 1 } },
      ],
    },
    {
      id: 'four_lieu',
      text: 'Où observez-vous principalement les fourmis ?',
      options: [
        { label: 'Cuisine, salle de bain, intérieur uniquement', scores: { fourmi_pharaon: 4, fourmi_argentine: 2 } },
        { label: 'Jardin, terrasse, extérieur', scores: { fourmi_noire: 4 } },
        { label: 'Dans les murs, plancher ou bois (sciure)', scores: { fourmi_charpentiere: 5 } },
        { label: 'Partout, longues files sur tout le périmètre', scores: { fourmi_argentine: 4 } },
      ],
    },
    {
      id: 'four_comportement',
      text: 'Quel comportement observez-vous ?',
      options: [
        { label: 'Files organisées cherchant de la nourriture', scores: { fourmi_noire: 3, fourmi_pharaon: 2 } },
        { label: 'Sciure de bois fine sous des galeries lisses', scores: { fourmi_charpentiere: 5 } },
        { label: 'Essaimage : fourmis ailées en grand nombre', scores: { fourmi_noire: 4 } },
        { label: 'Présentes 12 mois/an, même en hiver', scores: { fourmi_pharaon: 4, fourmi_argentine: 3 } },
      ],
    },
  ],

  rongeur: [
    {
      id: 'ron_feces',
      text: 'Quelle est la taille des fèces observées ?',
      hint: 'Les fèces sont l\'indice le plus fiable',
      options: [
        { label: 'Très petites, 3-5 mm (comme un grain de riz)', scores: { souris: 5 } },
        { label: 'Moyennes, 10-12 mm, forme de fuseau pointu', scores: { rat_noir: 5 } },
        { label: 'Grandes, 15-20 mm, cylindriques bouts arrondis', scores: { rat_surmulot: 5 } },
        { label: 'Je ne sais pas / pas de fèces visibles', scores: { souris: 1, mulot: 1 } },
      ],
    },
    {
      id: 'ron_lieu',
      text: 'Où observez-vous les traces ou dégâts ?',
      options: [
        { label: 'Cave, sol, le long des murs, égouts', scores: { rat_surmulot: 5 } },
        { label: 'Grenier, combles, plafond, hauteur', scores: { rat_noir: 5 } },
        { label: 'Partout dans l\'habitation (cuisine, placards)', scores: { souris: 5 } },
        { label: 'Jardin, remise, extérieur principalement', scores: { mulot: 5 } },
      ],
    },
    {
      id: 'ron_bruit',
      text: 'Quand entendez-vous des bruits ?',
      options: [
        { label: 'La nuit (grattements, courses)', scores: { rat_surmulot: 2, rat_noir: 2, souris: 2 } },
        { label: 'Dans les plafonds surtout', scores: { rat_noir: 3 } },
        { label: 'Bruits discrets ou quasi absents', scores: { mulot: 2, souris: 2 } },
      ],
    },
    {
      id: 'ron_degat',
      text: 'Quel type de dégâts constatez-vous ?',
      options: [
        { label: 'Câbles électriques ou bois rongés', scores: { rat_noir: 3, rat_surmulot: 2 } },
        { label: 'Emballages alimentaires percés', scores: { souris: 3, rat_surmulot: 1 } },
        { label: 'Terriers ou galeries dans le sol', scores: { rat_surmulot: 4, mulot: 3 } },
        { label: 'Peu de dégâts visibles, traces seulement', scores: { mulot: 2, souris: 1 } },
      ],
    },
  ],

  cafard: [
    {
      id: 'caf_taille',
      text: 'Quelle est la taille des cafards observés ?',
      options: [
        { label: 'Petits, 10-15 mm (2 cm environ)', scores: { cafard_germanique: 5 } },
        { label: 'Grands, 20-30 mm (3 cm et plus)', scores: { cafard_oriental: 4, cafard_germanique: 1 } },
        { label: 'Très grands, 35-40 mm (4 cm)', scores: { blatte_americaine: 5 } },
      ],
    },
    {
      id: 'caf_couleur',
      text: 'Quelle est la couleur et l\'aspect des cafards ?',
      options: [
        { label: 'Brun-jaune avec 2 bandes sombres sur le dos', scores: { cafard_germanique: 5 } },
        { label: 'Brun très foncé à noir brillant, uniforme', scores: { cafard_oriental: 5 } },
        { label: 'Brun-rouge brillant avec liseré jaunâtre sur le dos', scores: { blatte_americaine: 5 } },
      ],
    },
    {
      id: 'caf_lieu',
      text: 'Où les observez-vous principalement ?',
      options: [
        { label: 'Cuisine, derrière réfrigérateur ou lave-vaisselle', scores: { cafard_germanique: 4 } },
        { label: 'Cave, sanitaires, siphons, local poubelles', scores: { cafard_oriental: 4, blatte_americaine: 2 } },
        { label: 'Partout dans le logement, boîtiers électriques', scores: { cafard_germanique: 3 } },
        { label: 'Égouts, regards, locaux techniques très humides', scores: { blatte_americaine: 5 } },
      ],
    },
  ],

  volant: [
    {
      id: 'vol_taille',
      text: 'Quelle est la taille de l\'insecte ?',
      options: [
        { label: 'Moyen, 12-17 mm', scores: { guepe: 5 } },
        { label: 'Grand, 25-35 mm', scores: { frelon_europeen: 4, frelon_asiatique: 3 } },
        { label: 'Très grand, >35 mm', scores: { frelon_europeen: 5 } },
      ],
    },
    {
      id: 'vol_couleur',
      text: 'Quelle est la couleur de l\'insecte ?',
      options: [
        { label: 'Jaune et noir, bandes régulières équilibrées', scores: { guepe: 5 } },
        { label: 'Brun-noir, bande orange sur l\'abdomen, pattes jaunes', scores: { frelon_asiatique: 5 } },
        { label: 'Brun-noir avec tête rousse/orange distincte', scores: { frelon_europeen: 5 } },
      ],
    },
    {
      id: 'vol_nid',
      text: 'Où est localisé le nid ?',
      options: [
        { label: 'Grenier, combles, auvent de maison', scores: { guepe: 3, frelon_europeen: 3 } },
        { label: 'Hauteur dans un arbre (>3 m), nid poire allongée', scores: { frelon_asiatique: 5 } },
        { label: 'Trou dans le sol, terrier', scores: { guepe: 4 } },
        { label: 'Creux d\'arbre, vieille cheminée', scores: { frelon_europeen: 4 } },
      ],
    },
  ],

  mite: [
    {
      id: 'mite_degat',
      text: 'Quel type de dégâts observez-vous ?',
      options: [
        { label: 'Trous dans vêtements en laine, soie ou cachemire', scores: { mite_vetement: 5 } },
        { label: 'Filaments et grumeaux dans farine, céréales ou épices', scores: { mite_alimentaire: 5 } },
        { label: 'Les deux types de dégâts', scores: { mite_vetement: 3, mite_alimentaire: 3 } },
      ],
    },
    {
      id: 'mite_papillon',
      text: 'Avez-vous observé un papillon adulte ?',
      options: [
        { label: 'Oui, petit papillon brun doré, vol maladroit', scores: { mite_vetement: 4 } },
        { label: 'Oui, papillon bicolore gris et brun-roux', scores: { mite_alimentaire: 4 } },
        { label: 'Non, seulement les dégâts', scores: { mite_vetement: 1, mite_alimentaire: 1 } },
      ],
    },
  ],

  moucheron: [
    {
      id: 'mouch_taille',
      text: 'Quelle est la taille des insectes observés ?',
      options: [
        { label: 'Minuscules, 2-3 mm (à peine visibles)', scores: { moucheron: 5 } },
        { label: 'Normaux, 6-8 mm (mouche classique)', scores: { mouche: 5 } },
      ],
    },
    {
      id: 'mouch_lieu',
      text: 'Où observez-vous principalement ces insectes ?',
      options: [
        { label: 'Autour des fruits mûrs, corbeille, poubelles', scores: { moucheron: 4 } },
        { label: 'Sortant des siphons et canalisations', scores: { moucheron: 3 } },
        { label: 'Autour des aliments, repas, surfaces cuisinées', scores: { mouche: 4 } },
        { label: 'Partout dans le logement ou le local', scores: { mouche: 3, moucheron: 1 } },
      ],
    },
    {
      id: 'mouch_source',
      text: 'Y a-t-il une source organique identifiable à proximité ?',
      options: [
        { label: 'Fruits fermentés, déchets alimentaires humides', scores: { moucheron: 4 } },
        { label: 'Benne, local poubelles, matières fécales', scores: { mouche: 5 } },
        { label: 'Cadavre ou matière animale en décomposition', scores: { mouche: 4 } },
        { label: 'Aucune source évidente identifiable', scores: { moucheron: 2, mouche: 1 } },
      ],
    },
  ],

  xylophage: [
    {
      id: 'xyl_trous',
      text: 'Quelle est la taille des trous d\'émergence visibles dans le bois ?',
      hint: 'Les trous de sortie des adultes sont l\'indice clé',
      options: [
        { label: 'Très fins, 1 mm environ (tête d\'épingle)', scores: { petite_vrillette: 3, lyctus: 4 } },
        { label: 'Petits, 1-2 mm ronds et réguliers', scores: { petite_vrillette: 5 } },
        { label: 'Moyens, 3-4 mm ronds', scores: { grosse_vrillette: 5 } },
        { label: 'Grands, en amande allongée (10 x 5 mm)', scores: { capricorne: 5 } },
      ],
    },
    {
      id: 'xyl_sciure',
      text: 'Quelle est la texture de la sciure ou poudre sous les galeries ?',
      options: [
        { label: 'Très fine, poudreuse, comme de la farine', scores: { petite_vrillette: 4, lyctus: 4 } },
        { label: 'Granuleuse, légèrement collante ou agglomérée', scores: { grosse_vrillette: 4 } },
        { label: 'Grossière, mélange de copeaux et fibres compactés', scores: { capricorne: 4 } },
      ],
    },
    {
      id: 'xyl_bois',
      text: 'Quel type de bois est touché ?',
      options: [
        { label: 'Bois résineux : sapin, pin, épicéa (charpente)', scores: { capricorne: 5, petite_vrillette: 1 } },
        { label: 'Bois de feuillus anciens : chêne, châtaignier, orme', scores: { petite_vrillette: 4, grosse_vrillette: 3, lyctus: 2 } },
        { label: 'Parquet ou bois exotique récent (chêne neuf, merbau)', scores: { lyctus: 5 } },
        { label: 'Vieux bois de feuillus humide ou dégradé', scores: { grosse_vrillette: 5, petite_vrillette: 2 } },
      ],
    },
    {
      id: 'xyl_bruit',
      text: 'Avez-vous entendu des bruits dans le bois ?',
      options: [
        { label: 'Tic-tac régulier, surtout la nuit en mars-juin', scores: { grosse_vrillette: 5 } },
        { label: 'Léger crissement ou grattage dans la charpente', scores: { capricorne: 4 } },
        { label: 'Aucun bruit particulier', scores: { petite_vrillette: 2, lyctus: 2 } },
      ],
    },
    {
      id: 'xyl_age',
      text: 'L\'infestation semble-t-elle ancienne ou récente ?',
      hint: 'Sciure fraîche = infestation active, sciure grise = ancienne',
      options: [
        { label: 'Active : sciure fraîche blanche/jaunâtre sous les trous', scores: { petite_vrillette: 3, capricorne: 3, lyctus: 3 } },
        { label: 'Difficile à dire, sciure grisâtre', scores: { petite_vrillette: 2, grosse_vrillette: 2 } },
        { label: 'Ancienne mais dégâts structurels inquiétants', scores: { capricorne: 4, grosse_vrillette: 3 } },
      ],
    },
  ],

  termite: [
    {
      id: 'ter_galeries',
      text: 'Observez-vous des galeries ou tunnels de boue sur les murs ou fondations ?',
      hint: 'Les termites construisent des tubes de boue pour se déplacer à l\'air libre',
      options: [
        { label: 'Oui, tubes ou plaquages de boue brunâtre sur les murs/fondations', scores: { termite: 5 } },
        { label: 'Non, pas de tubes visibles', scores: { termite: 2 } },
      ],
    },
    {
      id: 'ter_bois',
      text: 'Quel est l\'état du bois suspect au sondage ?',
      options: [
        { label: 'Creux, surface intacte — sonde qui s\'enfonce facilement', scores: { termite: 5 } },
        { label: 'Bois vidé suivant le sens des fibres (rainures)', scores: { termite: 4 } },
        { label: 'Bois abîmé avec trous visibles en surface', scores: { termite: 1 } },
      ],
    },
    {
      id: 'ter_essaimage',
      text: 'Y a-t-il eu un essaimage récent ?',
      hint: 'Les termites ailés (gamètes) essaiment au printemps',
      options: [
        { label: 'Oui, nuée d\'insectes ailés en printemps/été, ailes tombées au sol', scores: { termite: 5 } },
        { label: 'Non, mais on a trouvé des insectes blanc-crème dans du bois ouvert', scores: { termite: 5 } },
        { label: 'Non, aucun insecte observé', scores: { termite: 2 } },
      ],
    },
    {
      id: 'ter_zone',
      text: 'Le bâtiment est-il situé en zone à risque ?',
      hint: 'Les termites sont plus fréquents dans l\'ouest, le sud-ouest et le bassin méditerranéen',
      options: [
        { label: 'Oui, commune en zone classée (affichage en mairie)', scores: { termite: 4 } },
        { label: 'Zone humide, sol argileux ou présence de bois en contact avec le sol', scores: { termite: 3 } },
        { label: 'Je ne sais pas', scores: { termite: 2 } },
      ],
    },
  ],
}

export const CATEGORY_META: Record<Category, { label: string; emoji: string; desc: string }> = {
  piqueur: { label: 'Piqûres / Démangeaisons', emoji: '🩹', desc: 'Traces de morsures, réactions cutanées' },
  fourmi: { label: 'Fourmis', emoji: '🐜', desc: 'Files d\'insectes, fourmilière visible' },
  rongeur: { label: 'Rongeurs', emoji: '🐀', desc: 'Traces, fèces, bruits nocturnes' },
  cafard: { label: 'Cafards / Blattes', emoji: '🪳', desc: 'Insectes rampants, nocturnes' },
  volant: { label: 'Guêpes / Frelons', emoji: '🐝', desc: 'Nid de guêpes ou frelon identifié' },
  mite: { label: 'Mites', emoji: '🦋', desc: 'Vêtements ou garde-manger abîmés' },
  moucheron: { label: 'Moucherons / Mouches', emoji: '🪰', desc: 'Nuées ou mouches dans la cuisine, salle de bain' },
  xylophage: { label: 'Insectes du bois', emoji: '🪲', desc: 'Trous dans le bois, sciure, bois creux' },
  termite: { label: 'Termites', emoji: '🐛', desc: 'Galeries de boue, bois creux, essaimage' },
}

const W = 'https://upload.wikimedia.org/wikipedia/commons/thumb'

export const SPECIES_PHOTOS: Partial<Record<SpeciesKey, string>> = {
  punaise_lit:         `${W}/3/35/Bed_bug%2C_Cimex_lectularius_%289627010587%29.jpg/330px-Bed_bug%2C_Cimex_lectularius_%289627010587%29.jpg`,
  puce:                `${W}/9/9d/%D0%9A%D0%BE%D1%88%D0%B0%D1%87%D1%8C%D1%8F_%D0%B1%D0%BB%D0%BE%D1%85%D0%B0.jpg/330px-%D0%9A%D0%BE%D1%88%D0%B0%D1%87%D1%8C%D1%8F_%D0%B1%D0%BB%D0%BE%D1%85%D0%B0.jpg`,
  acarien_gale:        `${W}/c/c0/Sarcoptes_scabei_2.jpg/330px-Sarcoptes_scabei_2.jpg`,
  acarien_literie:     `${W}/e/eb/House_Dust_Mite.jpg/330px-House_Dust_Mite.jpg`,
  tique:               `${W}/1/1f/Ixodes_ricinus_on_dry_grass.jpg/330px-Ixodes_ricinus_on_dry_grass.jpg`,
  fourmi_noire:        `${W}/b/b1/Black_Garden_Ant_tending_Citrus_Mealybug_%2816063538972%29.jpg/330px-Black_Garden_Ant_tending_Citrus_Mealybug_%2816063538972%29.jpg`,
  fourmi_pharaon:      `${W}/7/71/Monomorium_pharaonis_casent0173986_profile_1.jpg/330px-Monomorium_pharaonis_casent0173986_profile_1.jpg`,
  fourmi_charpentiere: `${W}/9/95/Camponotus_herculeanus_casent0173157_profile_1.jpg/330px-Camponotus_herculeanus_casent0173157_profile_1.jpg`,
  fourmi_argentine:    `${W}/3/3f/Linepithema_Argentine_ant.jpg/330px-Linepithema_Argentine_ant.jpg`,
  rat_surmulot:        `${W}/c/c5/Brown_rat_%28Rattus_norvegicus%29_Drenthe_2.jpg/330px-Brown_rat_%28Rattus_norvegicus%29_Drenthe_2.jpg`,
  rat_noir:            `${W}/a/a4/House_Rat_David_Raju.jpg/330px-House_Rat_David_Raju.jpg`,
  souris:              'https://upload.wikimedia.org/wikipedia/commons/8/8f/Mouse_white_background.jpg',
  mulot:               `${W}/1/11/ApodemusSylvaticus.jpg/330px-ApodemusSylvaticus.jpg`,
  cafard_germanique:   `${W}/1/17/Blatella_germanica_p1160206.jpg/330px-Blatella_germanica_p1160206.jpg`,
  cafard_oriental:     `${W}/c/c6/Blatta_orientalis_male_from_Botevgrad%2C_Bulgaria_02.jpg/330px-Blatta_orientalis_male_from_Botevgrad%2C_Bulgaria_02.jpg`,
  blatte_americaine:   `${W}/3/3b/American-cockroach.jpg/330px-American-cockroach.jpg`,
  guepe:               `${W}/f/f7/Vespula_vulgaris_queen.jpg/330px-Vespula_vulgaris_queen.jpg`,
  frelon_europeen:     `${W}/b/b1/VespaCrabroCollezione.jpg/330px-VespaCrabroCollezione.jpg`,
  frelon_asiatique:    `${W}/c/cc/Asian_hornet_%28Vespa_velutina%29.jpg/330px-Asian_hornet_%28Vespa_velutina%29.jpg`,
  mite_vetement:       `${W}/b/b5/Tineola.bisselliella.7218.jpg/330px-Tineola.bisselliella.7218.jpg`,
  mite_alimentaire:    `${W}/c/cd/Plodia_interpunctella_-_Indianmeal_moth.jpg/330px-Plodia_interpunctella_-_Indianmeal_moth.jpg`,
  moucheron:           `${W}/9/95/Drosophila_melanogaster_Proboscis.jpg/330px-Drosophila_melanogaster_Proboscis.jpg`,
  mouche:              `${W}/1/14/Common_house_fly%2C_Musca_domestica.jpg/330px-Common_house_fly%2C_Musca_domestica.jpg`,
  petite_vrillette:    `${W}/2/20/Anobium_punctatum01.jpg/330px-Anobium_punctatum01.jpg`,
  grosse_vrillette:    `${W}/f/f7/Xestobium.rufovillosum.jpg/330px-Xestobium.rufovillosum.jpg`,
  capricorne:          `${W}/9/9f/Cerambycidae_-_Hylotrupes_bajulus_%28male%29.JPG/330px-Cerambycidae_-_Hylotrupes_bajulus_%28male%29.JPG`,
  lyctus:              `${W}/4/4d/Lyctus.brunneus.jpg/330px-Lyctus.brunneus.jpg`,
  termite:             `${W}/6/6b/Reticulitermes_flavipes_K8085-6.jpg/330px-Reticulitermes_flavipes_K8085-6.jpg`,
}

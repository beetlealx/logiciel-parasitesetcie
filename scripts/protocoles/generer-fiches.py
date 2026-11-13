#!/usr/bin/env python3
"""Génère les fiches de préparation client (HTML -> PDF via Chrome headless)."""
import base64, os, subprocess, sys

# Usage : python3 scripts/protocoles/generer-fiches.py public/protocoles [slug ...]
# Polices : npm i --no-save @fontsource/bebas-neue @fontsource/barlow (chemin via FONTS_DIR)
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, "public", "protocoles")
LOGO = os.path.join(ROOT, "public", "logo.png")
FONTS = os.environ.get("FONTS_DIR", os.path.join(ROOT, "node_modules", "@fontsource"))
os.makedirs(OUT, exist_ok=True)

def b64(p):
    return base64.b64encode(open(p, "rb").read()).decode()

def font(family, path, weight, style="normal"):
    return (f"@font-face{{font-family:'{family}';font-weight:{weight};font-style:{style};"
            f"src:url(data:font/woff2;base64,{b64(path)}) format('woff2');}}")

FACES = font("Bebas", f"{FONTS}/bebas-neue/files/bebas-neue-latin-400-normal.woff2", 400)
for w in (400, 500, 600, 700):
    FACES += font("Barlow", f"{FONTS}/barlow/files/barlow-latin-{w}-normal.woff2", w)
FACES += font("Barlow", f"{FONTS}/barlow/files/barlow-latin-500-italic.woff2", 500, "italic")
FACES += font("Barlow", f"{FONTS}/barlow/files/barlow-latin-600-italic.woff2", 600, "italic")

LEGAL = ("Certibiocide N°115445 · SARL PARASITES ET COMPAGNIE au capital de 2 000 € · "
         "RCS Lyon 131 874 760 · 74 rue René Cassin, 69140 Rillieux-la-Pape")

CSS = FACES + """
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
:root{--cream:#f6efdc;--red:#b23a2e;--green:#2b3f35;--sage:#4f7a62;--gold:#e9c54a;--ink:#2a2a28}
html,body{width:210mm;height:297mm}
body{background:var(--cream);font-family:'Barlow',sans-serif;color:var(--ink);font-size:9.9pt;line-height:1.38;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{position:relative;width:210mm;height:297mm;padding:7mm}
.frame{position:absolute;inset:6mm;border:1.6pt solid var(--green);outline:0.6pt solid var(--green);outline-offset:-3.2pt}
.inner{position:relative;height:100%;display:flex;flex-direction:column;padding:6mm 9mm 0}
header{display:flex;align-items:center;gap:8mm;margin-bottom:5mm}
header img{width:34mm;height:auto}
.kicker{display:inline-block;background:var(--red);color:#fff;font-weight:700;letter-spacing:.18em;font-size:8.4pt;padding:1.2mm 4.5mm;border-radius:10mm;text-transform:uppercase}
h1{font-family:'Bebas';font-weight:400;font-size:46pt;line-height:.95;color:var(--ink);margin-top:2mm;letter-spacing:.01em}
.sub{font-weight:600;font-size:10.5pt;color:#4a4a45;margin-top:1.2mm}
.intro{border-top:1.4pt solid var(--sage);border-bottom:1.4pt solid var(--sage);padding:2.4mm 0;text-align:center;font-style:italic;font-weight:600;color:var(--green);font-size:10pt;margin-bottom:5.5mm}
h2{font-family:'Bebas';font-weight:400;font-size:18pt;color:var(--green);display:flex;align-items:center;gap:3mm;margin:1mm 0 2.6mm;letter-spacing:.01em}
h2::after{content:"";flex:1;height:1.2pt;background:#a9c3b0}
.row{display:flex;gap:9mm;margin-bottom:3.5mm}
.row>.col{flex:1;min-width:0}
.grid{display:grid;column-gap:9mm;row-gap:3.6mm}
.item{display:flex;gap:3.5mm;break-inside:avoid}
.num{font-family:'Bebas';font-size:20pt;line-height:1;color:var(--red);min-width:8mm}
.ihead{font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--green);font-size:8.6pt;margin-bottom:.6mm}
.itext b{font-weight:700;color:var(--ink)}
.col .grid{grid-template-columns:1fr}
.box{display:flex;gap:6mm;align-items:center;border-radius:2mm;padding:3.6mm 6mm;margin-top:4mm}
.box .lab{font-family:'Bebas';font-size:19pt;white-space:nowrap;line-height:1}
.alert{background:#f3dfd3;border:1.2pt solid var(--red)}
.alert .lab{color:var(--red)}
.alert b{font-weight:700}
.retenir{background:var(--green);color:#f3efe2}
.retenir .lab{color:var(--gold);align-self:flex-start}
.retenir p+p{margin-top:1.4mm}
.retenir b{color:var(--gold);font-weight:700}
.spacer{flex:1}
footer{margin:4mm -9mm 0}
.fbar{background:var(--red);color:#fff;display:flex;justify-content:space-between;align-items:flex-end;padding:3.6mm 9mm 3mm}
.fname{font-family:'Bebas';font-size:16pt;line-height:1}
.ftag{font-size:7.8pt;letter-spacing:.14em;font-weight:600;margin-top:1mm}
.fphone{font-family:'Bebas';font-size:24pt;color:var(--gold);line-height:1;text-align:right}
.fmail{font-size:8pt;font-weight:600;text-align:right;margin-top:.8mm}
.legal{background:var(--green);color:#e8e4d6;font-size:7.4pt;text-align:center;padding:2mm 4mm;font-weight:500}
"""

def nb(t):
    return t.replace(' :', '&nbsp;:').replace(' ;', '&nbsp;;').replace(' ?', '&nbsp;?')

def items_html(items, start):
    out, n = [], start
    for it in items:
        head, text = (it if isinstance(it, tuple) else (None, it))
        h = f'<div class="ihead">{head}</div>' if head else ""
        out.append(f'<div class="item"><div class="num">{n:02d}</div><div>{h}<div class="itext">{nb(text)}</div></div></div>')
        n += 1
    return "".join(out), n

def section(sec, n):
    cols = sec.get("cols", 1)
    body, n = items_html(sec["items"], n)
    return f'<h2>{sec["title"]}</h2><div class="grid" style="grid-template-columns:repeat({cols},1fr)">{body}</div>', n

def render(f):
    n = 1
    parts = []
    for row in f["rows"]:
        if isinstance(row, list):  # deux colonnes
            cols = []
            for sec in row:
                h, n = section(sec, n)
                cols.append(f'<div class="col">{h}</div>')
            parts.append(f'<div class="row">{"".join(cols)}</div>')
        else:
            h, n = section(row, n)
            parts.append(f'<div style="margin-bottom:2.5mm">{h}</div>')
    for a in f.get("alerts", []):
        parts.append(f'<div class="box alert"><div class="lab">{a[0]}</div><div>{nb(a[1])}</div></div>')
    ret = "".join(f"<p>{nb(p)}</p>" for p in f["retenir"])
    parts.append(f'<div class="box retenir"><div class="lab">À retenir</div><div>{ret}</div></div>')
    return f"""<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>{CSS}</style></head><body>
<div class="page"><div class="frame"></div><div class="inner">
<header><img src="data:image/png;base64,{b64(LOGO)}"><div>
<span class="kicker">{f["kicker"]}</span><h1>{f["title"]}</h1><div class="sub">{f["sub"]}</div></div></header>
<div class="intro">{nb(f["intro"])}</div>
{"".join(parts)}
<div class="spacer"></div>
<footer><div class="fbar"><div><div class="fname">Parasites et Compagnie</div>
<div class="ftag">DÉRATISATION · DÉSINSECTISATION · DÉSINFECTION</div></div>
<div><div class="fphone">04 82 53 06 98</div><div class="fmail">contact@parasites-compagnie.fr · parasites-compagnie.fr</div></div></div>
<div class="legal">{LEGAL}</div></footer>
</div></div></body></html>"""

PI = "Protocole d'intervention"
PREP = "Fiche de préparation à lire avant notre passage"

FICHES = {
"punaises-de-lit": dict(kicker=PI, title="Punaises de lit", sub=PREP,
  intro="La réussite du traitement repose à 50 % sur la préparation de votre logement. Suivez ces étapes à la lettre.",
  rows=[
    dict(title="Avant l'intervention", cols=2, items=[
      ("Linge et textiles", "Videz armoires, tiroirs et penderies des pièces infestées. Ensachez tout (vêtements, draps, rideaux, peluches) dans des sacs fermés <b>dans la pièce</b>, puis : lavage à 60 °C, sèche-linge 30 min chaud ou congélation à −20 °C pendant 72 h. Stockez le linge propre en sacs neufs scellés."),
      ("Désencombrement", "Dégagez le sol au maximum. Ne déplacez aucun objet d'une pièce infestée vers une pièce saine sans l'avoir inspecté. Rangez les petits objets inspectés dans des boîtes hermétiques."),
      ("Mobilier et lits", "Décollez lits, têtes de lit et meubles d'au moins 20 cm des murs. Videz entièrement tables de chevet et commodes proches du lit."),
      ("Aspiration", "Juste avant notre venue, aspirez coutures de matelas, sommiers, lattes, plinthes et fissures. Jetez aussitôt le sac, fermé, dans une poubelle extérieure."),
    ]),
    [dict(title="Le jour J", items=[
      "Laissez matelas et sommiers <b>entièrement nus</b> : ni draps, ni housses, ni taies.",
      "N'utilisez <b>aucun insecticide du commerce</b> : il fait fuir les punaises dans les cloisons et chez les voisins.",
      "Quittez le logement avec vos animaux pendant toute la durée de l'intervention.",
    ]), dict(title="Après l'intervention", items=[
      ("Réentrée", "4 h d'absence minimum, 24 h conseillées pour femmes enceintes, nourrissons, asthmatiques et animaux. Aérez 30 min au retour."),
      ("14 jours sans ménage", "Ni serpillière, ni vapeur, ni aspirateur le long des plinthes, derrière les meubles et sous le lit : le produit agit dans la durée."),
      ("Literie protégée", "Housses intégrales anti-punaises sur matelas et sommier, fermées 1 an. Lit décollé du mur, couette et draps sans contact avec le sol."),
    ])],
  ],
  retenir=["Revoir quelques petites punaises claires entre J+7 et J+14 est normal : ce sont les éclosions. Elles meurent au contact du produit déposé.",
           "<b>2e passage systématique entre J+10 et J+14</b> pour éliminer les jeunes nymphes avant qu'elles ne pondent."]),

"blattes-cafards": dict(kicker=PI, title="Blattes & cafards", sub=PREP,
  intro="Un traitement au gel bien préparé élimine la colonie en quelques semaines. Votre préparation fait la différence.",
  rows=[
    dict(title="Avant l'intervention", cols=2, items=[
      ("Cuisine", "Videz les placards du bas et le dessous d'évier. Rangez les aliments dans des boîtes hermétiques ou au réfrigérateur."),
      ("Nettoyage", "Dégraissez plans de travail, dessous d'électroménager et plinthes. Ni vaisselle sale ni nourriture d'animaux en libre accès."),
      ("Accès", "Dégagez si possible l'arrière du réfrigérateur, du four et du lave-vaisselle."),
      ("Aucun produit du commerce", "Pas de spray ni de fumigène dans les 7 jours précédents : ils repoussent les blattes et rendent notre gel moins attractif."),
    ]),
    [dict(title="Le jour J", items=[
      "Signalez au technicien les zones où vous voyez le plus d'insectes : souvent la nuit, près des sources de chaleur et d'eau.",
      "Éloignez enfants et animaux des pièces traitées pendant l'intervention.",
    ]), dict(title="Après l'intervention", items=[
      ("3 semaines sans nettoyer", "Ne touchez pas aux points de gel ni aux zones traitées, et n'y vaporisez aucun produit ménager."),
      ("Ni eau ni nourriture", "Essuyez l'évier le soir, sortez les poubelles chaque jour, gardez les aliments fermés."),
      ("Colmatage", "Rebouchez fissures et passages de canalisations au joint silicone."),
    ])],
  ],
  retenir=["Voir davantage de blattes les premiers jours est bon signe : le produit les fait sortir de leurs cachettes.",
           "<b>Contrôle et renouvellement du gel entre J+15 et J+21</b> selon le niveau d'infestation. En immeuble, le traitement des logements voisins peut être nécessaire."]),

"rats-souris": dict(kicker=PI, title="Rats & souris", sub=PREP,
  intro="Lutte raisonnée : postes d'appâtage sécurisés, suppression des points d'entrée et suivi jusqu'à disparition.",
  rows=[
    dict(title="Avant l'intervention", cols=2, items=[
      ("Repérage", "Notez les traces : crottes, grignotages, bruits nocturnes, passages sombres le long des murs."),
      ("Denrées", "Rangez céréales, croquettes et graines dans des contenants fermés. Ne laissez rien au sol."),
      ("Accès", "Dégagez l'accès aux combles, caves, gaines techniques et à l'arrière des meubles bas."),
      ("Pas de piège maison", "Ne posez pas vos propres appâts ou tapettes : ils rendent les rongeurs méfiants."),
    ]),
    [dict(title="Le jour J", items=[
      "Le technicien installe des <b>postes d'appâtage sécurisés et numérotés</b>, adaptés à la présence d'enfants et d'animaux.",
      "Il repère avec vous les points d'entrée à reboucher.",
    ]), dict(title="Après l'intervention", items=[
      ("Postes intouchables", "Ne déplacez, n'ouvrez et ne manipulez pas les postes d'appâtage."),
      ("Cadavres", "Ramassez-les avec des gants, ensachez-les et jetez-les aux ordures ménagères."),
      ("Rebouchage", "Grillage fin, laine d'acier ou mortier : une souris passe par un trou de 6 mm."),
    ])],
  ],
  alerts=[("Sécurité", "Tenez enfants et animaux éloignés des postes. En cas d'ingestion suspectée, appelez sans attendre le <b>centre antipoison</b> (personne) ou votre <b>vétérinaire</b> (animal), avec la fiche produit remise par le technicien.")],
  retenir=["Les appâts agissent en 3 à 7 jours : l'activité baisse progressivement.",
           "<b>Passages de contrôle programmés</b> jusqu'à disparition des consommations, puis retrait des postes en fin de traitement."]),

"fourmis": dict(kicker=PI, title="Fourmis", sub=PREP,
  intro="L'objectif est d'atteindre la reine : les ouvrières rapportent l'appât au nid. La patience est la clé.",
  rows=[
    dict(title="Avant l'intervention", cols=3, items=[
      ("Observation", "Repérez les pistes de fourmis et leurs points d'entrée : plinthes, fenêtres, prises, dallage."),
      ("Sucré sous clé", "Sucre, miel, confitures et aliments d'animaux en boîtes hermétiques ; nettoyez les résidus sucrés."),
      ("Gardez les pistes", "Ne pulvérisez rien et ne lessivez pas les pistes : nous en avons besoin pour placer l'appât."),
    ]),
    [dict(title="Le jour J", items=[
      "Le technicien pose un <b>gel appât</b> sur les pistes et traite les entrées extérieures si nécessaire.",
      "Éloignez enfants et animaux des points traités.",
    ]), dict(title="Après l'intervention", items=[
      ("Laissez-les manger", "Ne tuez pas les fourmis et ne nettoyez pas les points de gel pendant 10 à 15 jours."),
      ("Aucune autre nourriture", "Elles doivent privilégier l'appât : gardez tout le reste fermé."),
      ("Colmatage", "Rebouchez fissures et joints une fois l'activité terminée."),
    ])],
  ],
  retenir=["Une affluence accrue les premiers jours est normale : c'est le signe que l'appât est adopté.",
           "<b>Disparition progressive en 1 à 3 semaines.</b> Un 2e passage peut être programmé pour les colonies importantes."]),

"frelons-guepes": dict(kicker=PI, title="Frelons & guêpes", sub="Consignes de sécurité à lire avant notre passage",
  intro="La destruction d'un nid est réservée aux professionnels équipés. Votre rôle : sécuriser la zone et nous guider.",
  rows=[
    dict(title="Avant l'intervention", cols=2, items=[
      ("Ne touchez pas au nid", "Ne l'approchez pas, ne le frappez pas, ne l'arrosez pas, n'y pulvérisez rien : une colonie dérangée attaque en masse."),
      ("Périmètre", "Balisez la zone et tenez enfants et animaux à distance : au moins 5 m pour le frelon asiatique."),
      ("Localisation", "Indiquez l'emplacement exact, la hauteur et l'accès (toiture, combles, haie, arbre). Une photo prise de loin nous aide."),
      ("Fenêtres", "Gardez fermées les fenêtres proches du nid."),
    ]),
    [dict(title="Le jour J", items=[
      "Intervention de préférence en <b>début de matinée ou en soirée</b>, quand la colonie est rentrée au nid.",
      "Restez à l'intérieur, fenêtres fermées, pendant toute l'intervention.",
    ]), dict(title="Après l'intervention", items=[
      ("24 à 48 h à distance", "Les insectes qui rentrent de butinage tournent autour du nid avant de mourir."),
      ("Nid traité", "N'y touchez pas : il sera retiré quand c'est possible et sans risque."),
    ])],
  ],
  alerts=[("Urgence", "Personne allergique piquée, piqûres multiples, gonflement du visage ou gêne respiratoire : <b>appelez immédiatement le 15</b>.")],
  retenir=["Quelques insectes isolés les jours suivants sont normaux. Un nid détruit n'est pas réoccupé.",
           "<b>Au printemps</b>, surveillez les petits nids primaires (abris de jardin, avant-toits) et appelez-nous tôt : l'intervention est plus simple."]),

"moustique-tigre": dict(kicker="Protocole d'installation", title="Moustique tigre", sub="Pièges à moustiques · sans insecticide",
  intro="Nos pièges capturent les moustiques tigres. Leur efficacité dépend aussi de la suppression des eaux stagnantes.",
  rows=[
    dict(title="Avant l'installation", cols=3, items=[
      ("Eaux stagnantes", "Videz soucoupes, seaux, arrosoirs, jouets, bâches et pneus."),
      ("Gouttières et réserves", "Curez gouttières et regards ; couvrez les récupérateurs d'eau (moustiquaire ou couvercle)."),
      ("Alimentation", "Prévoyez une prise électrique ou un emplacement abrité selon le modèle retenu."),
    ]),
    [dict(title="Le jour J", items=[
      "Le technicien définit avec vous l'implantation : zones de repos ombragées, terrasse, abords de piscine.",
      "Installation propre : tous les câbles sont enterrés ou masqués.",
    ]), dict(title="Après l'installation", items=[
      ("En continu", "Laissez les pièges fonctionner jour et nuit pendant toute la saison."),
      ("Ne rien déplacer", "Ne déplacez pas les pièges et ne les recouvrez pas."),
      ("Chaque semaine", "Continuez à vider les eaux stagnantes : un bouchon d'eau suffit à une ponte."),
    ])],
  ],
  retenir=["La population baisse progressivement en 2 à 4 semaines, le temps de casser le cycle de reproduction.",
           "<b>Contrat d'entretien</b> : changement des attractifs, remplacement des bouteilles de CO2 et vidage des filets."]),

"insectes-du-bois": dict(kicker=PI, title="Insectes du bois", sub="Petite vrillette · parquets, charpentes, meubles",
  intro="Les larves vivent au cœur du bois. Le traitement se déroule en deux temps selon le résultat obtenu.",
  rows=[
    dict(title="Avant l'intervention", cols=3, items=[
      ("Pièces dégagées", "Retirez meubles, tapis et objets au sol des pièces à traiter."),
      ("Zones actives", "Signalez où apparaissent trous d'envol et petits tas de sciure."),
      ("Finitions", "Précisez la nature du bois et sa finition : vitrifiée, huilée, cirée."),
    ]),
    [dict(title="Étape 1 · Surface", items=[
      "Traitement à la <b>vapeur haute température</b>, puis application d'un insecticide sur les zones touchées.",
      "Absence de 4 h minimum après l'application ; aérez 30 min au retour.",
    ]), dict(title="Étape 2 · Si besoin", items=[
      "Si l'activité persiste : traitement du bois à nu par un produit de préservation certifié <b>CTB-P+</b>, entre le ponçage et la vitrification.",
      "Ponçage et vitrification sont réalisés par une entreprise de parqueterie. Respectez le temps de séchage indiqué.",
    ])],
    dict(title="Après l'intervention", cols=2, items=[
      ("Surveillance", "Marquez les trous existants (crayon ou cire) pour repérer facilement tout nouveau trou d'envol."),
      ("Aération", "Maintenez une ventilation correcte : le bois humide favorise les insectes xylophages."),
    ]),
  ],
  retenir=["Les adultes sortent du bois au printemps et en été : l'efficacité se juge sur la saison suivante.",
           "<b>Nouveaux trous ou sciure fraîche après traitement ?</b> Contactez-nous pour programmer l'étape 2."]),

# ---------- nouvelles fiches ----------
"multi-nuisibles": dict(kicker=PI, title="Multi-nuisibles", sub=PREP,
  intro="Plusieurs nuisibles à traiter : ces consignes communes préparent le terrain, le technicien les complète sur place.",
  rows=[
    dict(title="Avant l'intervention", cols=2, items=[
      ("Repérage", "Notez où et quand vous voyez les nuisibles ou leurs traces : insectes, crottes, grignotages, bruits nocturnes."),
      ("Denrées sous clé", "Rangez aliments, croquettes et graines dans des boîtes hermétiques ou au réfrigérateur. Rien ne doit traîner au sol."),
      ("Accès dégagés", "Dégagez plinthes, dessous d'évier, arrière des meubles et de l'électroménager, accès aux caves et combles."),
      ("Aucun produit du commerce", "Pas de spray, fumigène ni piège maison dans les 7 jours précédents : ils dispersent les nuisibles et les rendent méfiants."),
    ]),
    [dict(title="Le jour J", items=[
      "Montrez au technicien <b>les zones les plus touchées</b> pour chaque nuisible.",
      "Éloignez enfants et animaux des pièces traitées pendant toute l'intervention.",
    ]), dict(title="Après l'intervention", items=[
      ("Réentrée", "Respectez le délai d'absence indiqué par le technicien, puis aérez 30 min au retour."),
      ("Zones traitées", "Ne nettoyez pas les zones traitées et ne déplacez ni gels, ni appâts, ni postes d'appâtage."),
      ("Colmatage", "Rebouchez fissures, trous et passages de canalisations une fois le traitement terminé."),
    ])],
  ],
  alerts=[("Sécurité", "Tenez enfants et animaux éloignés des produits et des postes. En cas d'ingestion suspectée, appelez sans attendre le <b>centre antipoison</b> (personne) ou votre <b>vétérinaire</b> (animal).")],
  retenir=["Une hausse d'activité les premiers jours est fréquente : les produits font sortir les nuisibles de leurs cachettes.",
           "<b>Passages de contrôle programmés</b> selon les nuisibles traités. Les fiches détaillées par nuisible sont disponibles sur simple demande."]),

"fouines": dict(kicker=PI, title="Fouines", sub="Piégeage par un piégeur agréé · capture sans blessure",
  intro="Le piégeage de la fouine est réglementé : il est réalisé par un piégeur agréé, après déclaration en mairie.",
  rows=[
    dict(title="Avant l'intervention", cols=2, items=[
      ("Indices", "Notez les signes de passage : cavalcades nocturnes dans les combles, crottes torsadées, odeurs, isolant ou câbles abîmés."),
      ("Accès aux combles", "Dégagez un passage sûr vers les combles, greniers et faux plafonds, avec un point d'éclairage si possible."),
      ("Ne bouchez rien", "Ne fermez pas les accès avant la capture : vous risqueriez d'enfermer l'animal ou ses petits à l'intérieur."),
      ("Ni répulsif ni piège maison", "N'utilisez aucun produit répulsif et ne posez pas vos propres pièges : la fouine deviendrait méfiante."),
    ]),
    [dict(title="Le jour J", items=[
      "Le technicien pose des <b>pièges-cages sélectifs</b> sur les lieux de passage, sans danger pour vous.",
      "Il réalise avec vous la déclaration en mairie et repère les points d'entrée du bâtiment.",
      "Pendant la période de piégeage, gardez vos <b>chats à l'intérieur</b> la nuit.",
    ]), dict(title="Après l'intervention", items=[
      ("Pièges intouchables", "Ne manipulez pas les pièges : un animal capturé, même petit, mord et griffe."),
      ("Prévenez-nous", "Signalez-nous immédiatement tout animal capturé ou piège déclenché : les pièges sont relevés chaque jour."),
      ("Rebouchage", "Après la capture, obstruez les accès : grillage, chatières de toit, branches proches de la toiture taillées."),
    ])],
  ],
  retenir=["La capture peut demander plusieurs nuits : la fouine change souvent d'itinéraire.",
           "<b>Après la capture</b>, nous pouvons nettoyer et désinfecter les combles et remplacer l'isolant souillé, sur devis."]),

"diogene": dict(kicker=PI, title="Syndrome de Diogène", sub="Débarras, désinsectisation et désinfection du logement",
  intro="Une intervention discrète et respectueuse : tri, évacuation, traitement des nuisibles puis désinfection.",
  rows=[
    dict(title="Avant l'intervention", cols=2, items=[
      ("Objets à conserver", "Signalez-nous ce qui doit être gardé : papiers administratifs, photos, bijoux, objets de valeur ou de souvenir."),
      ("Un référent", "Désignez une personne présente ou joignable le jour J (proche, tuteur, bailleur) pour valider les choix de tri."),
      ("Accès et stationnement", "Prévoyez clés, badges, réservation d'ascenseur et une place pour notre véhicule. Prévenez le syndic ou le gardien si besoin."),
      ("Compteurs", "Laissez si possible l'eau et l'électricité en service : elles sont nécessaires au nettoyage."),
    ]),
    [dict(title="Le jour J", items=[
      "Notre équipe, équipée de protections, <b>trie pièce par pièce</b> et met de côté documents et objets personnels retrouvés.",
      "Les déchets et encombrants sont évacués vers des filières de traitement adaptées.",
      "Les nuisibles présents (blattes, punaises, rongeurs) sont traités avant le nettoyage.",
    ]), dict(title="Après l'intervention", items=[
      ("Désinfection", "Nettoyage et désinfection des sols, sanitaires et cuisine ; désodorisation du logement."),
      ("Réentrée", "Respectez le délai d'absence indiqué, puis aérez largement au retour."),
      ("Suivi", "Un passage de contrôle des nuisibles est programmé si nécessaire. Un accompagnement social aide à éviter la récidive."),
    ])],
  ],
  retenir=["Les documents et objets de valeur retrouvés sont remis au référent désigné.",
           "<b>Confidentialité totale</b> : nous intervenons avec discrétion vis-à-vis du voisinage. La durée dépend du volume, précisée au devis."]),
}

if __name__ == "__main__":
    only = sys.argv[2:] or list(FICHES)
    for slug in only:
        html = os.path.join(OUT, f"{slug}.html")
        pdf = os.path.join(OUT, f"protocole-{slug}.pdf")
        open(html, "w").write(render(FICHES[slug]))
        subprocess.run(["google-chrome", "--headless=new", "--no-sandbox", "--disable-gpu",
                        "--no-pdf-header-footer", f"--print-to-pdf={pdf}", f"file://{html}"],
                       check=True, capture_output=True)
        os.remove(html)
        print(slug, os.path.getsize(pdf))

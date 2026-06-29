#!/usr/bin/env bash
#
# Parasites et Compagnie — téléchargement des photos d'espèces (Wikimedia Commons)
# -------------------------------------------------------------------------------
# Toutes les images sont sous licence Creative Commons ou domaine public.
# L'attribution est obligatoire pour les licences CC BY / CC BY-SA :
# voir ATTRIBUTIONS.md (à conserver dans le dépôt).
#
# Usage :
#   chmod +x download-photos.sh
#   ./download-photos.sh                # écrit dans ./public/especes
#   DEST=chemin/perso ./download-photos.sh
#
set -euo pipefail

DEST="${DEST:-public/especes}"
# User-Agent descriptif requis par la politique Wikimedia.
UA="ParasitesEtCompagnie/1.0 (image fetch script; contact: alex.chaume@gmail.com)"

mkdir -p "$DEST"

# Format : "fichier_local|URL_source"
images=(
  "frelon-asiatique.jpg|https://upload.wikimedia.org/wikipedia/commons/5/58/Asian_predatory_wasp_%28Vespa_velutina_var._nigrithorax%29.jpg"
  "frelon-europeen.jpg|https://upload.wikimedia.org/wikipedia/commons/0/06/Vespa_crabro_germana_lateralview_02_HQ.jpg"
  "guepe-commune.jpg|https://upload.wikimedia.org/wikipedia/commons/9/98/Vespula_vulgaris_portrait.jpg"
  "guepe-germanique.jpg|https://upload.wikimedia.org/wikipedia/commons/6/6c/German_Wasp%2C_Vespula_germanica%2C_Duitse_wesp_02.jpg"
  "poliste.jpg|https://upload.wikimedia.org/wikipedia/commons/c/cf/Polistes_%28paper_wasp%29%2C_Skala_Kalloni%2C_Lesbos%2C_Greece.jpg"
  "fourmi-noire.jpg|https://upload.wikimedia.org/wikipedia/commons/3/35/Lasius_niger.jpg"
  "fourmi-charpentiere.jpg|https://upload.wikimedia.org/wikipedia/commons/6/6e/Hercules_Ant_%28Camponotus_herculeanus%29.jpg"
  "fourmi-pharaon.jpg|https://upload.wikimedia.org/wikipedia/commons/9/9b/M.pharaonis.jpg"
  "fourmi-odorante.jpg|https://upload.wikimedia.org/wikipedia/commons/5/52/Tapinoma_erraticum_casent0173152_profile_1.jpg"
  "fourmi-acrobate.jpg|https://upload.wikimedia.org/wikipedia/commons/3/37/Crematogaster_scutellaris_%28Formicidae_sp.%29%2C_Sardegna%2C_Italy.jpg"
)

echo "Téléchargement de ${#images[@]} photos vers : $DEST/"
echo

fail=0
for entry in "${images[@]}"; do
  name="${entry%%|*}"
  url="${entry#*|}"
  printf '  %-26s ' "$name"
  if curl -fsSL -A "$UA" "$url" -o "$DEST/$name"; then
    echo "OK"
  else
    echo "ECHEC"
    fail=1
  fi
done

echo
if [ "$fail" -eq 0 ]; then
  echo "Terminé. Les 10 photos sont dans $DEST/"
else
  echo "Terminé avec au moins une erreur — vérifie la connexion ou l'URL concernée."
  exit 1
fi

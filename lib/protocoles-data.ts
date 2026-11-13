// Fiches de préparation par type d'intervention (fichiers dans public/protocoles/).
// Module sans dépendance serveur : utilisable côté client.

export const PROTOCOLES: Record<string, { fichier: string; titre: string }> = {
  rats:           { fichier: 'protocole-rats-souris.pdf',      titre: 'Rats & souris' },
  cafards:        { fichier: 'protocole-blattes-cafards.pdf',  titre: 'Blattes & cafards' },
  punaises_lit:   { fichier: 'protocole-punaises-de-lit.pdf',  titre: 'Punaises de lit' },
  fourmis:        { fichier: 'protocole-fourmis.pdf',          titre: 'Fourmis' },
  frelons_guepes: { fichier: 'protocole-frelons-guepes.pdf',   titre: 'Frelons & guêpes' },
  moustiques:     { fichier: 'protocole-moustique-tigre.pdf',  titre: 'Moustique tigre' },
  mixte:          { fichier: 'protocole-multi-nuisibles.pdf',  titre: 'Multi-nuisibles' },
}

// Fiches disponibles sans type d'intervention dédié (envoi manuel / lien direct) :
// protocole-fouines.pdf, protocole-diogene.pdf, protocole-insectes-du-bois.pdf

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://logiciel-parasitesetcie.vercel.app').replace(/\/$/, '')
}

export function protocoleUrl(type: string): string | null {
  const p = PROTOCOLES[type]
  return p ? `${siteUrl()}/protocoles/${p.fichier}` : null
}

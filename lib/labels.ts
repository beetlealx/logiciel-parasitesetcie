export const DOSSIER_STATUT: Record<string, { label: string; cls: string }> = {
  a_typer: { label: 'À typer', cls: 'bg-amber-50 text-amber-800' },
  actif: { label: 'Actif', cls: 'bg-[#d1f5ed] text-[#064e44]' },
  termine: { label: 'Terminé', cls: 'bg-primary/10 text-primary' },
  annule: { label: 'Annulé', cls: 'bg-[#f5f5f4] text-[#78716c]' },
}

export const PLANNING_STATUT: Record<string, { label: string; cls: string }> = {
  a_planifier: { label: 'À planifier', cls: 'bg-amber-50 text-amber-800' },
  planifie: { label: 'Planifié', cls: 'bg-blue-50 text-blue-700' },
  confirme: { label: 'Confirmé', cls: 'bg-blue-50 text-blue-700' },
  en_cours: { label: 'En cours', cls: 'bg-blue-50 text-blue-700' },
  realise: { label: 'Réalisé', cls: 'bg-[#d1f5ed] text-[#064e44]' },
  reporte: { label: 'Reporté', cls: 'bg-orange-50 text-orange-700' },
  absent: { label: 'Absent', cls: 'bg-orange-50 text-orange-700' },
  annule: { label: 'Annulé', cls: 'bg-[#f5f5f4] text-[#78716c]' },
}

export const FACTURATION: Record<string, string> = {
  par_passage: 'Une facture par passage',
  par_contrat: 'Une facture par contrat',
}

export const TYPAGE_SOURCE: Record<string, string> = {
  produit: 'Réf. produit',
  mot_cle: 'Mot-clé',
  manuel: 'Manuel',
}

export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso))
}

export function formatEur(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n))
}

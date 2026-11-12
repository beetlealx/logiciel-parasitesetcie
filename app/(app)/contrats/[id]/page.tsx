import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteContrat, updateContrat } from '@/app/actions/contrats'
import { createInterventionFromSite } from '@/app/actions/create-from-site'

const TYPE_LABELS: Record<string, string> = {
  rats: 'Dératisation', frelons_guepes: 'Frelons & Guêpes',
  punaises_lit: 'Punaises de lit', fourmis: 'Fourmis',
  cafards: 'Cafards / Blattes', moustiques: 'Moustiques', mixte: 'Multi-nuisibles',
}
const FREQ_LABELS: Record<string, string> = {
  mensuel: 'Mensuel', bimestriel: 'Bimestriel', trimestriel: 'Trimestriel',
  semestriel: 'Semestriel', annuel: 'Annuel',
}
const FREQ_MONTHS: Record<string, number> = {
  mensuel: 1, bimestriel: 2, trimestriel: 3, semestriel: 6, annuel: 12,
}

function addMonths(date: Date, n: number) {
  const d = new Date(date); d.setMonth(d.getMonth() + n); return d
}
function fmt(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtShort(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-[#f5f5f4] text-[#57534e]',
  signed: 'bg-emerald-50 text-emerald-700',
  sent: 'bg-primary/10 text-primary',
}
const STATUS_LABEL: Record<string, string> = { draft: 'Brouillon', signed: 'Signé', sent: 'Envoyé' }

export default async function ContratDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: contrat } = await supabase
    .from('contrats')
    .select('*')
    .eq('id', id)
    .single()

  if (!contrat) notFound()

  const admin = createAdminClient()
  const { data: interventions } = await admin
    .from('interventions')
    .select('id, reference, intervention_date, status, technician_name, synthese')
    .eq('dolibarr_tiers_id', contrat.dolibarr_tiers_id)
    .eq('intervention_type', contrat.intervention_type)
    .in('status', ['signed', 'sent'])
    .order('intervention_date', { ascending: false })
    .limit(20)

  const lastDate = interventions?.[0]?.intervention_date
    ? new Date(interventions[0].intervention_date)
    : new Date(contrat.date_debut)
  const freqMonths = FREQ_MONTHS[contrat.frequence] ?? 3
  const nextVisit = addMonths(lastDate, freqMonths)
  const now = new Date()
  const diff = (nextVisit.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  const statut = diff < 0 ? 'retard' : diff <= 14 ? 'bientot' : 'ok'
  const statutStyle = {
    ok:      { badge: 'bg-emerald-50 text-emerald-700', label: 'À jour' },
    bientot: { badge: 'bg-amber-50 text-amber-700',     label: 'Bientôt dû' },
    retard:  { badge: 'bg-red-50 text-red-700',          label: 'En retard' },
  }[statut]

  const archiveAction = async () => {
    'use server'
    await updateContrat(id, { actif: false })
    redirect('/contrats')
  }

  const deleteAction = async () => {
    'use server'
    await deleteContrat(id)
    redirect('/contrats')
  }

  const createFromContrat = createInterventionFromSite.bind(null, interventions?.[0]?.id ?? '')

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/contrats" className="text-xs text-[#a8a29e] hover:text-primary transition-colors">
        ← Contrats
      </Link>

      {/* Header */}
      <div className="mt-2 mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">{contrat.client_name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-[#57534e]">{TYPE_LABELS[contrat.intervention_type] ?? contrat.intervention_type}</span>
            <span className="text-[#d6d3d1]">·</span>
            <span className="text-sm text-[#57534e]">{FREQ_LABELS[contrat.frequence] ?? contrat.frequence}</span>
            {contrat.dolibarr_contract_ref && (
              <>
                <span className="text-[#d6d3d1]">·</span>
                <span className="font-mono text-xs text-[#a8a29e]">{contrat.dolibarr_contract_ref}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statutStyle.badge}`}>{statutStyle.label}</span>
          <Link
            href={`/contrats/${id}/modifier`}
            className="text-sm px-3 py-2 border border-[#e7e5e4] rounded-lg hover:bg-[#f5f5f4] transition-colors"
          >
            Modifier
          </Link>
        </div>
      </div>

      {/* Prochaine visite */}
      <div className={`rounded-xl px-4 py-3.5 mb-4 flex items-center justify-between ${
        statut === 'retard' ? 'bg-red-50 border border-red-100' :
        statut === 'bientot' ? 'bg-amber-50 border border-amber-100' :
        'bg-emerald-50 border border-emerald-100'
      }`}>
        <div>
          <div className="text-[12px] text-[#78716c]">Prochaine visite prévue</div>
          <div className="font-semibold text-[15px]">{fmt(nextVisit)}</div>
          {interventions?.[0] && (
            <div className="text-[11.5px] text-[#78716c] mt-0.5">
              Dernière visite : {fmtShort(interventions[0].intervention_date)}
            </div>
          )}
        </div>
        <form action={createFromContrat}>
          <button
            type="submit"
            className="flex items-center gap-1.5 bg-primary text-white text-sm px-3.5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors min-h-[44px]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nouvelle intervention
          </button>
        </form>
      </div>

      {/* Infos */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-3.5 mb-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide mb-0.5">Début</div>
            <div>{fmtShort(contrat.date_debut)}</div>
          </div>
          {contrat.date_fin && (
            <div>
              <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide mb-0.5">Fin</div>
              <div>{fmtShort(contrat.date_fin)}</div>
            </div>
          )}
          {contrat.client_address && (
            <div className="col-span-2">
              <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide mb-0.5">Adresse</div>
              <div className="text-[#57534e]">{contrat.client_address}</div>
            </div>
          )}
          {contrat.notes && (
            <div className="col-span-2">
              <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide mb-0.5">Notes</div>
              <div className="text-[#57534e] whitespace-pre-wrap">{contrat.notes}</div>
            </div>
          )}
        </div>
      </div>

      {/* Historique */}
      <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold mb-2">
        Historique — {interventions?.length ?? 0} intervention{(interventions?.length ?? 0) !== 1 ? 's' : ''}
      </div>
      {interventions && interventions.length > 0 ? (
        <div className="flex flex-col gap-2">
          {interventions.map(iv => (
            <Link
              key={iv.id}
              href={`/interventions/${iv.id}`}
              className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-3 hover:border-primary hover:shadow-sm transition-all flex items-center justify-between gap-3"
            >
              <div>
                <div className="text-[13px] font-medium">{fmtShort(iv.intervention_date)}</div>
                <div className="text-[11.5px] text-[#a8a29e] mt-0.5 flex items-center gap-2">
                  <span className="font-mono">{iv.reference}</span>
                  {iv.technician_name && <span>· {iv.technician_name}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${STATUS_CLASS[iv.status] ?? STATUS_CLASS.draft}`}>
                  {STATUS_LABEL[iv.status] ?? iv.status}
                </span>
                <svg className="w-3.5 h-3.5 text-[#a8a29e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#e7e5e4] rounded-xl p-8 text-center text-[#a8a29e] text-sm">
          Aucune intervention enregistrée pour ce contrat.
        </div>
      )}

      {/* Actions danger */}
      <div className="mt-8 pt-4 border-t border-[#f5f5f4] flex gap-3">
        <form action={archiveAction}>
          <button type="submit" className="text-sm text-[#78716c] hover:text-[#1c1917] transition-colors px-3 py-2 border border-[#e7e5e4] rounded-lg">
            Archiver
          </button>
        </form>
        <form action={deleteAction}>
          <button type="submit" className="text-sm text-red-600 hover:text-red-700 transition-colors px-3 py-2 border border-red-100 rounded-lg">
            Supprimer
          </button>
        </form>
      </div>
    </div>
  )
}

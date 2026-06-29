'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import ClientSearch, { type ClientData } from '@/components/interventions/client-search'
import { createContrat, updateContrat, getDolibarrContrats, type ContratPayload } from '@/app/actions/contrats'

const TYPE_OPTIONS = [
  { value: 'rats', label: 'Dératisation' },
  { value: 'frelons_guepes', label: 'Frelons & Guêpes' },
  { value: 'punaises_lit', label: 'Punaises de lit' },
  { value: 'fourmis', label: 'Fourmis' },
  { value: 'cafards', label: 'Cafards / Blattes' },
  { value: 'moustiques', label: 'Moustiques' },
  { value: 'mixte', label: 'Multi-nuisibles' },
]

const FREQ_OPTIONS = [
  { value: 'mensuel', label: 'Mensuel' },
  { value: 'bimestriel', label: 'Bimestriel' },
  { value: 'trimestriel', label: 'Trimestriel' },
  { value: 'semestriel', label: 'Semestriel' },
  { value: 'annuel', label: 'Annuel' },
]

interface Contrat {
  id: string
  dolibarr_tiers_id: number
  dolibarr_contract_id?: number | null
  dolibarr_contract_ref?: string | null
  client_name: string
  client_address?: string | null
  intervention_type: string
  frequence: string
  date_debut: string
  date_fin?: string | null
  notes?: string | null
}

interface DolibarrContrat {
  id: number
  ref: string
  date_start: number | null
  date_end: number | null
  statut: number
}

interface Props {
  contrat?: Contrat
}

function toDateInput(ts: number | null): string {
  if (!ts) return ''
  return new Date(ts * 1000).toISOString().slice(0, 10)
}

export default function ContratForm({ contrat }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [client, setClient] = useState<ClientData>({
    dolibarr_tiers_id: contrat?.dolibarr_tiers_id ?? null,
    client_name: contrat?.client_name ?? 'Client à définir',
    client_address: contrat?.client_address ?? '',
    client_email: '',
  })

  const [interventionType, setInterventionType] = useState(contrat?.intervention_type ?? 'rats')
  const [frequence, setFrequence] = useState(contrat?.frequence ?? 'trimestriel')
  const [dateDebut, setDateDebut] = useState(contrat?.date_debut ?? new Date().toISOString().slice(0, 10))
  const [dateFin, setDateFin] = useState(contrat?.date_fin ?? '')
  const [notes, setNotes] = useState(contrat?.notes ?? '')
  const [dolibarrContractId, setDolibarrContractId] = useState<number | null>(contrat?.dolibarr_contract_id ?? null)
  const [dolibarrContractRef, setDolibarrContractRef] = useState(contrat?.dolibarr_contract_ref ?? '')

  const [dolibarrContrats, setDolibarrContrats] = useState<DolibarrContrat[]>([])
  const [loadingDolibarr, setLoadingDolibarr] = useState(false)

  useEffect(() => {
    const tiersId = client.dolibarr_tiers_id
    if (!tiersId) { setDolibarrContrats([]); return }
    setLoadingDolibarr(true)
    getDolibarrContrats(tiersId).then(data => {
      setDolibarrContrats(data ?? [])
      setLoadingDolibarr(false)
    }).catch(() => setLoadingDolibarr(false))
  }, [client.dolibarr_tiers_id])

  function handleDolibarrSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    if (!val) { setDolibarrContractId(null); setDolibarrContractRef(''); return }
    const found = dolibarrContrats.find(c => String(c.id) === val)
    if (found) {
      setDolibarrContractId(found.id)
      setDolibarrContractRef(found.ref)
      if (found.date_start && !contrat) setDateDebut(toDateInput(found.date_start))
      if (found.date_end && !contrat) setDateFin(toDateInput(found.date_end))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!client.dolibarr_tiers_id) { setError('Veuillez sélectionner un client Dolibarr.'); return }
    if (!client.client_name.trim() || client.client_name === 'Client à définir') { setError('Le nom du client est requis.'); return }

    const payload: ContratPayload = {
      dolibarr_tiers_id: client.dolibarr_tiers_id,
      dolibarr_contract_id: dolibarrContractId,
      dolibarr_contract_ref: dolibarrContractRef || null,
      client_name: client.client_name.trim(),
      client_address: client.client_address?.trim() || null,
      intervention_type: interventionType,
      frequence,
      date_debut: dateDebut,
      date_fin: dateFin || null,
      notes: notes.trim() || null,
    }

    setError(null)
    startTransition(async () => {
      if (contrat) {
        const res = await updateContrat(contrat.id, payload)
        if (res?.error) { setError(res.error); return }
        router.push(`/contrats/${contrat.id}`)
      } else {
        const res = await createContrat(payload)
        if (res?.error) { setError(res.error); return }
        router.push('/contrats')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Client */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-4 flex flex-col gap-4">
        <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold">Client</div>
        <ClientSearch initialData={client} onChange={setClient} />
      </div>

      {/* Liaison Dolibarr */}
      {client.dolibarr_tiers_id && (
        <div className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-4 flex flex-col gap-3">
          <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold">Contrat Dolibarr (optionnel)</div>
          {loadingDolibarr ? (
            <div className="text-sm text-[#a8a29e]">Chargement des contrats...</div>
          ) : dolibarrContrats.length === 0 ? (
            <div className="text-sm text-[#a8a29e]">Aucun contrat Dolibarr trouvé pour ce tiers.</div>
          ) : (
            <select
              value={dolibarrContractId ? String(dolibarrContractId) : ''}
              onChange={handleDolibarrSelect}
              className="w-full border border-[#e7e5e4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              <option value="">— Aucun lien Dolibarr —</option>
              {dolibarrContrats.map(c => (
                <option key={c.id} value={String(c.id)}>
                  {c.ref}{c.date_start ? ` · début ${toDateInput(c.date_start)}` : ''}
                </option>
              ))}
            </select>
          )}
          {dolibarrContractRef && (
            <div className="text-[11.5px] text-[#78716c]">
              Lié au contrat <span className="font-mono font-medium">{dolibarrContractRef}</span>
            </div>
          )}
        </div>
      )}

      {/* Type & Fréquence */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-4 flex flex-col gap-4">
        <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold">Prestation</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] text-[#78716c] mb-1 block">Type d'intervention *</label>
            <select
              value={interventionType}
              onChange={e => setInterventionType(e.target.value)}
              className="w-full border border-[#e7e5e4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[12px] text-[#78716c] mb-1 block">Fréquence *</label>
            <select
              value={frequence}
              onChange={e => setFrequence(e.target.value)}
              className="w-full border border-[#e7e5e4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
            >
              {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-4 flex flex-col gap-4">
        <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold">Durée</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] text-[#78716c] mb-1 block">Date de début *</label>
            <input
              type="date"
              value={dateDebut}
              onChange={e => setDateDebut(e.target.value)}
              required
              className="w-full border border-[#e7e5e4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="text-[12px] text-[#78716c] mb-1 block">Date de fin</label>
            <input
              type="date"
              value={dateFin}
              onChange={e => setDateFin(e.target.value)}
              className="w-full border border-[#e7e5e4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white border border-[#e7e5e4] rounded-xl px-4 py-4 flex flex-col gap-3">
        <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold">Notes</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Informations complémentaires..."
          className="w-full border border-[#e7e5e4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-white text-sm font-medium px-4 py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 min-h-[44px]"
      >
        {isPending ? 'Enregistrement...' : contrat ? 'Mettre à jour' : 'Créer le contrat'}
      </button>
    </form>
  )
}

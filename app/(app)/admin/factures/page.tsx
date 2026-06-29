import Link from 'next/link'
import { getFactures } from '@/lib/dolibarr'

const STATUT_LABEL: Record<number, { label: string; cls: string }> = {
  0: { label: 'Brouillon',  cls: 'bg-[#f5f5f4] text-[#78716c]' },
  1: { label: 'Validée',    cls: 'bg-blue-50 text-blue-700' },
  2: { label: 'Payée',      cls: 'bg-[#d1f5ed] text-[#0a5e53]' },
  3: { label: 'Abandonnée', cls: 'bg-red-50 text-red-600' },
}

function fmt(ts: number) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtMoney(v: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)
}

export default async function FacturesPage() {
  const { items: factures, error } = await getFactures({ limit: 200 })

  // Group by client
  const byClient: Record<string, { nom: string; socid: number; factures: typeof factures }> = {}
  for (const f of factures) {
    const key = String(f.socid)
    if (!byClient[key]) byClient[key] = { nom: f.nom_client || `Client #${f.socid}`, socid: f.socid, factures: [] }
    byClient[key].factures.push(f)
  }
  const clients = Object.values(byClient).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))

  const noDolibarr = !process.env.DOLIBARR_API_URL

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/admin" className="text-xs text-[#a8a29e] hover:text-primary transition-colors">
          ← Administration
        </Link>
        <h1 className="text-xl font-semibold text-[#1c1917] mt-1">Factures</h1>
        <p className="text-sm text-[#78716c] mt-1">{factures.length} facture{factures.length !== 1 ? 's' : ''} · groupées par client</p>
      </div>

      {(noDolibarr || error) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 mb-6 space-y-1">
          <p className="font-medium">Impossible de contacter Dolibarr</p>
          <p className="font-mono text-xs break-all">{error ?? 'DOLIBARR_API_URL non configuré'}</p>
        </div>
      )}

      {clients.length === 0 && !error && !noDolibarr && (
        <p className="text-center py-16 text-sm text-[#a8a29e]">Aucune facture trouvée dans Dolibarr.</p>
      )}

      <div className="space-y-4">
        {clients.map(client => {
          const total = client.factures.reduce((s, f) => s + f.total_ttc, 0)
          return (
            <div key={client.socid} className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-[#fafaf9] border-b border-[#f5f5f4]">
                <div className="flex items-center gap-2.5">
                  <Link
                    href={`/sites/${client.socid}`}
                    className="font-medium text-sm text-[#1c1917] hover:text-primary transition-colors"
                  >
                    {client.nom}
                  </Link>
                  <span className="text-[11px] text-[#a8a29e]">{client.factures.length} facture{client.factures.length !== 1 ? 's' : ''}</span>
                </div>
                <span className="text-sm font-semibold text-[#1c1917]">{fmtMoney(total)}</span>
              </div>
              <div className="divide-y divide-[#f5f5f4]">
                {client.factures.map(f => {
                  const st = STATUT_LABEL[f.statut] ?? { label: `Statut ${f.statut}`, cls: 'bg-[#f5f5f4] text-[#78716c]' }
                  return (
                    <div key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-[13px] font-mono text-[#57534e] w-28 shrink-0">{f.ref}</span>
                      <span className="text-[12px] text-[#a8a29e] w-24 shrink-0">{fmt(f.date)}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${st.cls}`}>{st.label}</span>
                      <span className="ml-auto text-[13px] font-medium text-[#1c1917]">{fmtMoney(f.total_ttc)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

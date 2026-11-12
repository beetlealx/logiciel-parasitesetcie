import { requireGerant } from '@/lib/auth'
import type { PrestationTypeDef } from '@/lib/typage'
import TypeRow from '@/components/parametres/type-row'
import MappingsEditor from '@/components/parametres/mappings-editor'
import MembreRow from '@/components/parametres/membre-row'

export default async function ParametresPage() {
  const { supabase, user } = await requireGerant()

  const [{ data: types }, { data: mappings }, { data: membres }, { data: logs }] = await Promise.all([
    supabase.from('prestation_types').select('*').order('ordre'),
    supabase.from('product_mappings').select('dolibarr_product_ref, prestation_code').order('dolibarr_product_ref'),
    supabase.from('profiles').select('id, email, full_name, role, certibiocide, active').order('created_at'),
    supabase.from('sync_log').select('id, created_at, source, propal_ref, ok, message').order('created_at', { ascending: false }).limit(25),
  ])
  const typeDefs = (types ?? []) as PrestationTypeDef[]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Paramètres</h1>

      <Section
        title="Types de prestation"
        help="Mots-clés (séparés par des virgules) : servent à reconnaître les lignes de devis en texte libre. Passages : jours après la signature (ex. « 0, 15 »)."
      >
        <div className="divide-y divide-[#f5f5f4]">
          {typeDefs.map(t => <TypeRow key={t.code} type={t} />)}
        </div>
      </Section>

      <Section
        title="Correspondances produits Dolibarr"
        help="Une référence produit listée ici est toujours rattachée à ce type, quel que soit son libellé."
      >
        <MappingsEditor
          mappings={mappings ?? []}
          types={typeDefs.map(t => ({ code: t.code, label: t.label }))}
        />
      </Section>

      <Section
        title="Équipe"
        help="Chaque personne apparaît ici après sa première connexion avec son compte Google @parasites-compagnie.fr."
      >
        <div className="divide-y divide-[#f5f5f4]">
          {(membres ?? []).map(m => <MembreRow key={m.id} membre={m} isSelf={m.id === user.id} />)}
        </div>
      </Section>

      <Section
        title="Synchronisation Dolibarr"
        help="Le webhook Dolibarr crée les dossiers en temps réel ; la vérification de rattrapage repasse sur les derniers devis signés."
      >
        {(logs ?? []).length === 0 ? (
          <p className="text-[13px] text-[#a8a29e] py-3">Aucun échange enregistré pour l&apos;instant.</p>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-[#a8a29e]">
                <th className="py-1.5 font-medium">Date</th>
                <th className="py-1.5 font-medium">Source</th>
                <th className="py-1.5 font-medium">Devis</th>
                <th className="py-1.5 font-medium">Résultat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f5f4]">
              {(logs ?? []).map(l => (
                <tr key={l.id}>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-[#57534e]">
                    {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date(l.created_at))}
                  </td>
                  <td className="py-1.5 pr-3 text-[#57534e]">{l.source}</td>
                  <td className="py-1.5 pr-3 font-mono">{l.propal_ref ?? '—'}</td>
                  <td className={`py-1.5 ${l.ok ? 'text-[#57534e]' : 'text-red-700'}`}>{l.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  )
}

function Section({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e7e5e4] rounded-xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-[#f5f5f4] bg-[#fafaf9]">
        <h2 className="font-medium text-sm text-[#1c1917]">{title}</h2>
        {help && <p className="text-[12px] text-[#78716c] mt-0.5">{help}</p>}
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  )
}

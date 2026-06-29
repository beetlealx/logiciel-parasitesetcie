import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import RappelSettingsForm from '@/components/admin/rappel-settings-form'

export default async function RappelsAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: settings } = await supabase
    .from('rappel_settings')
    .select('id, email_dest, jours_avant, actif')
    .eq('user_id', user.id)
    .single()

  const { data: logs } = await supabase
    .from('rappel_log')
    .select('id, jours_avant, sent_at, contrats(client_name, intervention_type)')
    .eq('user_id', user.id)
    .order('sent_at', { ascending: false })
    .limit(10)

  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-6">
        <Link href="/admin" className="text-xs text-[#a8a29e] hover:text-primary transition-colors">
          ← Administration
        </Link>
        <h1 className="text-xl font-semibold text-[#1c1917] mt-1">Rappels automatiques</h1>
        <p className="text-sm text-[#78716c] mt-0.5">
          Recevez un email quand une visite de contrat approche.
        </p>
      </div>

      <RappelSettingsForm
        initialSettings={settings ? {
          id: settings.id,
          email_dest: settings.email_dest,
          jours_avant: settings.jours_avant as number[],
          actif: settings.actif,
        } : null}
        userEmail={user.email ?? ''}
      />

      {logs && logs.length > 0 && (
        <div className="mt-8">
          <div className="text-[11px] text-[#a8a29e] uppercase tracking-wide font-semibold mb-3">
            Derniers rappels envoyés
          </div>
          <div className="bg-white border border-[#e7e5e4] rounded-xl divide-y divide-[#f5f5f4]">
            {logs.map(log => {
              const raw = log.contrats
              const contrat = (Array.isArray(raw) ? raw[0] : raw) as { client_name: string; intervention_type: string } | null
              return (
                <div key={log.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium">{contrat?.client_name ?? '—'}</div>
                    <div className="text-[11px] text-[#a8a29e]">
                      {log.jours_avant === 0 ? 'Jour J' : `J-${log.jours_avant}`}
                    </div>
                  </div>
                  <div className="text-[11.5px] text-[#78716c]">
                    {new Date(log.sent_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

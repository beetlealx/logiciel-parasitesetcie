import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FREQ_MONTHS: Record<string, number> = {
  mensuel: 1, bimestriel: 2, trimestriel: 3, semestriel: 6, annuel: 12,
}
const TYPE_LABELS: Record<string, string> = {
  rats: 'Dératisation', frelons_guepes: 'Frelons & Guêpes',
  punaises_lit: 'Punaises de lit', fourmis: 'Fourmis',
  cafards: 'Cafards', moustiques: 'Moustiques', mixte: 'Multi-nuisibles',
}

function addMonths(date: Date, n: number) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

function fmt(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export async function GET(request: Request) {
  // Vérification du secret cron
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Charge tous les settings actifs
  const { data: settings } = await admin
    .from('rappel_settings')
    .select('user_id, email_dest, jours_avant')
    .eq('actif', true)

  if (!settings?.length) return NextResponse.json({ sent: 0 })

  let totalSent = 0

  for (const setting of settings) {
    const { user_id, email_dest, jours_avant } = setting

    // Contrats actifs de cet utilisateur
    const { data: contrats } = await admin
      .from('contrats')
      .select('id, client_name, intervention_type, frequence, date_debut')
      .eq('user_id', user_id)
      .eq('actif', true)

    if (!contrats?.length) continue

    // Dernière intervention par contrat
    for (const contrat of contrats) {
      const freqMonths = FREQ_MONTHS[contrat.frequence] ?? 3

      const { data: lastIv } = await admin
        .from('interventions')
        .select('intervention_date')
        .eq('dolibarr_tiers_id', -1) // placeholder — on cherche par contrat
        .eq('user_id', user_id)
        .in('status', ['signed', 'sent'])
        .order('intervention_date', { ascending: false })
        .limit(1)
        .single()

      const lastDate = lastIv?.intervention_date
        ? new Date(lastIv.intervention_date)
        : new Date(contrat.date_debut)

      const nextVisit = addMonths(lastDate, freqMonths)
      const diffDays = Math.round((nextVisit.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      for (const j of (jours_avant as number[])) {
        if (diffDays !== j) continue

        // Vérifie si déjà envoyé aujourd'hui pour ce contrat + délai
        const { count } = await admin
          .from('rappel_log')
          .select('id', { count: 'exact', head: true })
          .eq('contrat_id', contrat.id)
          .eq('jours_avant', j)
          .gte('sent_at', today.toISOString())

        if ((count ?? 0) > 0) continue

        // Envoie le rappel
        const typeLabel = TYPE_LABELS[contrat.intervention_type] ?? contrat.intervention_type
        const subject = j === 0
          ? `⚠️ Visite due aujourd'hui — ${contrat.client_name}`
          : `🔔 Rappel : visite prévue dans ${j} jour${j > 1 ? 's' : ''} — ${contrat.client_name}`

        const html = `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1c1917">
            <h2 style="color:#c0392b">Rappel intervention — Parasites et Compagnie</h2>
            <p>La prochaine visite pour <strong>${contrat.client_name}</strong> est prévue le <strong>${fmt(nextVisit)}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:8px;background:#fafaf9;border-radius:4px;color:#78716c;font-size:12px">Client</td><td style="padding:8px;font-weight:600">${contrat.client_name}</td></tr>
              <tr><td style="padding:8px;color:#78716c;font-size:12px">Type</td><td style="padding:8px">${typeLabel}</td></tr>
              <tr><td style="padding:8px;background:#fafaf9;color:#78716c;font-size:12px">Fréquence</td><td style="padding:8px;background:#fafaf9">${contrat.frequence}</td></tr>
              <tr><td style="padding:8px;color:#78716c;font-size:12px">Prochaine visite</td><td style="padding:8px;font-weight:600;color:#c0392b">${fmt(nextVisit)}</td></tr>
            </table>
            <p style="color:#78716c;font-size:13px">Parasites et Compagnie — logiciel d'intervention</p>
          </div>
        `

        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? 'noreply@parasites-compagnie.fr',
          to: email_dest,
          subject,
          html,
        })

        await admin.from('rappel_log').insert({
          user_id,
          contrat_id: contrat.id,
          jours_avant: j,
        })

        totalSent++
      }
    }
  }

  return NextResponse.json({ sent: totalSent, checked_at: new Date().toISOString() })
}

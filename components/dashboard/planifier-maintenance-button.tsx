'use client'

import { useState, useTransition } from 'react'
import {
  planifierGazCalendar,
  planifierAttractifCalendar,
  planifierReleverAppatsCalendar,
} from '@/app/actions/maintenance-cal'

type ActionType = 'gaz' | 'attractif' | 'appat_releve'

interface Props {
  type: ActionType
  clientName: string
  clientAddress?: string | null
  dateRelevePrevue?: string      // pour appat_releve uniquement
  emplacement?: string           // pour appat_releve uniquement
}

export default function PlanifierMaintenanceButton({
  type,
  clientName,
  clientAddress,
  dateRelevePrevue,
  emplacement,
}: Props) {
  const [done, setDone] = useState(false)
  const [, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      if (type === 'gaz') {
        await planifierGazCalendar({ client_name: clientName, client_address: clientAddress })
      } else if (type === 'attractif') {
        await planifierAttractifCalendar({ client_name: clientName, client_address: clientAddress })
      } else if (type === 'appat_releve' && dateRelevePrevue && emplacement) {
        await planifierReleverAppatsCalendar({
          client_name: clientName,
          client_address: clientAddress,
          date_releve_prevue: dateRelevePrevue,
          emplacement,
        })
      }
      setDone(true)
    })
  }

  if (done) {
    return (
      <span className="text-[11px] text-emerald-600 font-semibold shrink-0">
        ✓ Planifié
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-[11px] text-primary hover:text-primary/80 font-semibold shrink-0 transition-colors"
    >
      Planifier →
    </button>
  )
}

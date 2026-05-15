'use client'

import { useFormStatus } from 'react-dom'
import { createIntervention } from '@/app/actions/interventions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 min-h-[44px] flex items-center gap-2"
    >
      {pending ? (
        <>
          <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Création…
        </>
      ) : (
        '+ Nouvelle intervention'
      )}
    </button>
  )
}

export default function NewInterventionButton() {
  return (
    <form action={createIntervention}>
      <SubmitButton />
    </form>
  )
}

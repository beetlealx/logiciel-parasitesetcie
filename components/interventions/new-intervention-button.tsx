'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { createIntervention } from '@/app/actions/interventions'
import TypePickerModal from './type-picker-modal'
import type { InterventionType } from '@/lib/intervention-templates'

export default function NewInterventionButton() {
  const [open, setOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<InterventionType | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSelect(type: InterventionType) {
    setSelectedType(type)
    startTransition(async () => {
      const result = await createIntervention(type)
      if (result?.error) {
        toast.error(result.error)
        setSelectedType(null)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors min-h-[44px] flex items-center gap-2"
      >
        + Nouvelle intervention
      </button>

      {open && (
        <TypePickerModal
          onSelect={handleSelect}
          loading={isPending}
          selectedType={selectedType}
          onClose={() => {
            if (!isPending) setOpen(false)
          }}
        />
      )}
    </>
  )
}

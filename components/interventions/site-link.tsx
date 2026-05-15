'use client'

import { useRouter } from 'next/navigation'

interface Props {
  tiersId: number
  name: string
}

export default function SiteLink({ tiersId, name }: Props) {
  const router = useRouter()
  return (
    <span
      onClick={e => { e.preventDefault(); e.stopPropagation(); router.push(`/sites/${tiersId}`) }}
      className="hover:text-primary hover:underline underline-offset-2 transition-colors cursor-pointer"
    >
      {name}
    </span>
  )
}

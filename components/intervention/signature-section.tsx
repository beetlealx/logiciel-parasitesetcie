'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIntervention } from '@/app/actions/sign'

interface Props {
  interventionId: string
  initialSignatureUrl: string | null
  initialSignataireNom: string | null
  isLocked: boolean
}

type EmailStatus = 'none' | 'sent' | 'no_email' | 'error'

export default function SignatureSection({
  interventionId,
  initialSignatureUrl,
  initialSignataireNom,
  isLocked,
}: Props) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPt = useRef<{ x: number; y: number } | null>(null)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [signataire, setSignataire] = useState(initialSignataireNom ?? '')
  const [signing, setSigning] = useState(false)
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('none')

  // Init canvas context style
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#1c1917'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    isDrawing.current = true
    const pt = getPoint(e)
    lastPt.current = pt
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, 1, 0, Math.PI * 2)
    ctx.fill()
    setHasStrokes(true)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !lastPt.current) return
    const pt = getPoint(e)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(lastPt.current.x, lastPt.current.y)
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
    lastPt.current = pt
  }

  function handlePointerUp() {
    isDrawing.current = false
    lastPt.current = null
  }

  function clearCanvas() {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }

  async function handleSign() {
    if (!signataire.trim() || !hasStrokes || signing) return
    setSigning(true)
    const dataUrl = canvasRef.current!.toDataURL('image/png')
    const result = await signIntervention(interventionId, signataire, dataUrl)
    if (result.emailSent) setEmailStatus('sent')
    else if (!result.clientEmail) setEmailStatus('no_email')
    else setEmailStatus('error')
    router.refresh()
  }

  // Signed view
  if (isLocked && initialSignatureUrl) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-primary font-medium">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          Signé par {initialSignataireNom}
        </div>
        {emailStatus === 'sent' && (
          <div className="flex items-center gap-2 text-[12.5px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
            Rapport envoyé automatiquement par email au client.
          </div>
        )}
        {emailStatus === 'error' && (
          <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg">
            L'envoi automatique a échoué — utilisez le bouton "Envoyer" pour réessayer.
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={initialSignatureUrl}
          alt="Signature"
          className="max-h-[140px] border border-[#e7e5e4] rounded-xl bg-white p-3 object-contain"
        />
      </div>
    )
  }

  // Unsigned view
  return (
    <div className="space-y-4">
      {/* Signataire */}
      <div>
        <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">
          Nom du signataire *
        </label>
        <input
          type="text"
          value={signataire}
          onChange={e => setSignataire(e.target.value)}
          disabled={isLocked}
          placeholder="Prénom Nom du client"
          className="w-full px-3 py-2.5 border border-[#d6d3d1] rounded-lg text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[44px]"
        />
      </div>

      {/* Canvas */}
      <div>
        <label className="block text-[11px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1.5">
          Signature *
        </label>
        <div className="relative border-2 border-dashed border-[#d6d3d1] rounded-xl overflow-hidden bg-[#fafaf9] hover:border-primary/40 transition-colors">
          <canvas
            ref={canvasRef}
            width={800}
            height={220}
            className="w-full h-[140px] touch-none cursor-crosshair block"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
          {!hasStrokes && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-sm text-[#c7c3c0]">Signez ici avec le doigt</p>
            </div>
          )}
          {/* Baseline */}
          <div className="absolute bottom-8 left-6 right-6 border-b border-[#e7e5e4]" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={clearCanvas}
          disabled={!hasStrokes || signing}
          className="flex items-center gap-1.5 text-sm text-[#78716c] hover:text-[#1c1917] disabled:opacity-40 transition-colors px-3 py-2 rounded-lg hover:bg-[#f5f5f4] min-h-[44px]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
          Effacer
        </button>

        <button
          type="button"
          onClick={handleSign}
          disabled={!signataire.trim() || !hasStrokes || signing}
          className="flex items-center gap-2 bg-primary text-white text-sm px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-40 transition-all min-h-[44px] active:scale-95"
        >
          {signing ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Enregistrement…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              Valider la signature
            </>
          )}
        </button>
      </div>

      <p className="text-[11px] text-[#a8a29e]">
        La signature verrouille définitivement le rapport. Le PDF pourra ensuite être généré.
      </p>
    </div>
  )
}

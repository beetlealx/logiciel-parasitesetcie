import sharp from 'sharp'

export interface PlanPoste {
  label: string
  x: number
  y: number
}

// Must match the UI container aspect ratio (4:3, see plan-section.tsx)
const OUT_W = 800
const OUT_H = 600
const CIRCLE_R = 14
const FONT_SIZE = 12

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Fetches a plan image, resizes it to the 4:3 container used in the UI (object-contain),
 * then composites poste markers at their stored x%/y% positions.
 * Returns a base64 data-URL or null on failure.
 */
export async function compositePlan(
  signedUrl: string,
  postes: PlanPoste[]
): Promise<string | null> {
  try {
    const res = await fetch(signedUrl, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())

    // Resize to 4:3 canvas with contain + white background — mirrors the UI exactly
    const base = await sharp(buf)
      .resize(OUT_W, OUT_H, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .png()
      .toBuffer()

    if (postes.length === 0) {
      return `data:image/png;base64,${base.toString('base64')}`
    }

    const circles = postes
      .map(p => {
        const cx = Math.round((p.x / 100) * OUT_W)
        const cy = Math.round((p.y / 100) * OUT_H)
        return `<g filter="url(#shadow)">
  <circle cx="${cx}" cy="${cy}" r="${CIRCLE_R}" fill="white" stroke="#c0392b" stroke-width="2.5"/>
  <text x="${cx}" y="${cy + 1}" text-anchor="middle" dominant-baseline="central"
    font-family="Arial, Helvetica, sans-serif" font-size="${FONT_SIZE}" font-weight="bold" fill="#c0392b">${esc(p.label)}</text>
</g>`
      })
      .join('\n')

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${OUT_H}">
  <defs>
    <filter id="shadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="rgba(0,0,0,0.25)"/>
    </filter>
  </defs>
  ${circles}
</svg>`

    const result = await sharp(base)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .png()
      .toBuffer()

    return `data:image/png;base64,${result.toString('base64')}`
  } catch {
    return null
  }
}

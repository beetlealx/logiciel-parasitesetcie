'use client'

import {
  INTERVENTION_TEMPLATES,
  getTemplateForArticle,
  getArticleColor,
  type InterventionType,
  type TemplateField,
} from '@/lib/intervention-templates'
import type { ArticleRow } from '@/app/actions/plan'

// Color hints for rats v1 values
const VALUE_COLORS: Record<string, string> = {
  Intact: '#059669', Dégradé: '#d97706', Manquant: '#dc2626',
  Nulle: '#78716c', Partielle: '#d97706', Totale: '#dc2626',
  Aucune: '#78716c', Déjections: '#d97706', Rongeurs: '#dc2626',
  RAS: '#78716c', Renouvellement: '#2563eb', Repositionnement: '#2563eb',
}

interface Props {
  interventionType: InterventionType
  articles: ArticleRow[]
  onArticleRelevesChange: (id: string, releves: Record<string, unknown>) => void
  onResetAll: () => void
  disabled?: boolean
}

function FieldInput({
  field,
  value,
  color,
  disabled,
  onChange,
}: {
  field: TemplateField
  value: unknown
  color: string
  disabled?: boolean
  onChange: (val: unknown) => void
}) {
  const baseSelect = `w-full px-2 py-1.5 border border-[#e7e5e4] rounded-lg text-[13px] font-medium focus:outline-none focus:ring-2 min-h-[40px] bg-white disabled:bg-[#f5f5f4] appearance-none cursor-pointer`

  switch (field.type) {
    case 'select': {
      const strVal = (value as string) ?? ''
      const valueColor = VALUE_COLORS[strVal]
      return (
        <select
          value={strVal}
          onChange={e => onChange(e.target.value || null)}
          disabled={disabled}
          className={baseSelect}
          style={{
            color: strVal ? (valueColor ?? color) : '#c7c3c0',
            borderColor: strVal ? `${color}40` : undefined,
          }}
        >
          <option value="">—</option>
          {field.options?.map(o => (
            <option key={o} value={o} className="text-[#1c1917]">{o}</option>
          ))}
        </select>
      )
    }
    case 'number': {
      const numVal = value != null ? String(value) : ''
      return (
        <input
          type="number"
          value={numVal}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
          disabled={disabled}
          className={`${baseSelect} focus:border-[${color}]`}
          style={{ borderColor: numVal ? `${color}40` : undefined }}
        />
      )
    }
    case 'text': {
      const textVal = (value as string) ?? ''
      return (
        <input
          type="text"
          value={textVal}
          onChange={e => onChange(e.target.value || null)}
          disabled={disabled}
          className={`${baseSelect} focus:border-[${color}]`}
          style={{ borderColor: textVal ? `${color}40` : undefined }}
        />
      )
    }
    case 'boolean': {
      const boolVal = value === true
      return (
        <button
          type="button"
          onClick={() => !disabled && onChange(!boolVal)}
          disabled={disabled}
          className="w-full h-[40px] rounded-lg border text-[13px] font-medium transition-colors"
          style={boolVal
            ? { backgroundColor: color, borderColor: color, color: 'white' }
            : { backgroundColor: 'white', borderColor: '#e7e5e4', color: '#a8a29e' }
          }
        >
          {boolVal ? 'Oui' : 'Non'}
        </button>
      )
    }
    default:
      return null
  }
}

function isFieldFilled(field: TemplateField, value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false
  if (field.type === 'boolean') return true // false is still "filled"
  return true
}

export default function RelevesSection({
  interventionType,
  articles,
  onArticleRelevesChange,
  onResetAll,
  disabled,
}: Props) {
  const isRats = interventionType === 'rats'
  const globalTemplate = interventionType !== 'mixte' ? INTERVENTION_TEMPLATES[interventionType] : null

  if (articles.length === 0) {
    const articleLabel = globalTemplate?.article_label ?? 'article'
    return (
      <div className="py-8 text-center text-sm text-[#a8a29e]">
        Ajoutez des {articleLabel.toLowerCase()}s dans le plan (Section 2) pour saisir les relevés.
      </div>
    )
  }

  function handleFieldChange(article: ArticleRow, field: TemplateField, val: unknown) {
    const newReleves = { ...article.releves, [field.key]: val }
    if (val === null || val === '') {
      delete newReleves[field.key]
    }
    onArticleRelevesChange(article.id, newReleves)
  }

  const articlesWithTemplate = articles.map(a => ({
    article: a,
    template: getTemplateForArticle(interventionType, a.article_type),
    color: getArticleColor(interventionType, a.article_type),
  }))

  const filledCount = articlesWithTemplate.filter(({ article, template }) => {
    if (!template) return false
    return template.fields.every(f => {
      const val = article.releves[f.key]
      return isFieldFilled(f, val)
    })
  }).length

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-[#f5f5f4] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: articles.length ? `${(filledCount / articles.length) * 100}%` : '0%',
              backgroundColor: globalTemplate?.color ?? '#0d7d6e',
            }}
          />
        </div>
        <span className="text-[12px] text-[#a8a29e] shrink-0">
          {filledCount}/{articles.length} rempli{filledCount !== 1 ? 's' : ''}
        </span>
        {isRats && !disabled && (
          <button
            type="button"
            onClick={onResetAll}
            className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-[#d6d3d1] text-[#57534e] hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors whitespace-nowrap"
          >
            Aucune présence
          </button>
        )}
      </div>

      {/* Article cards */}
      {articlesWithTemplate.map(({ article, template, color }) => {
        if (!template) return null
        const complete = template.fields.every(f => isFieldFilled(f, article.releves[f.key]))
        const cols = template.fields.length <= 2 ? 1 : 2

        return (
          <div
            key={article.id}
            className="border rounded-xl overflow-hidden transition-colors bg-white"
            style={{ borderColor: complete ? `${color}50` : '#e7e5e4' }}
          >
            {/* Card header */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#fafaf9] border-b border-[#f5f5f4]">
              <span
                className="flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold border-2 shrink-0"
                style={complete
                  ? { backgroundColor: color, color: 'white', borderColor: color }
                  : { backgroundColor: 'white', color, borderColor: color }
                }
              >
                {article.label}
              </span>
              {complete && (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color }}>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
              {interventionType === 'mixte' && (
                <span className="text-[11px] text-[#a8a29e]">{template.label}</span>
              )}
            </div>

            {/* Fields grid */}
            <div
              className="grid gap-px bg-[#f5f5f4]"
              style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
            >
              {template.fields.map(field => (
                <div key={field.key} className="bg-white px-3 py-2.5">
                  <label className="block text-[10px] uppercase tracking-wide text-[#a8a29e] font-medium mb-1">
                    {field.label}
                  </label>
                  <FieldInput
                    field={field}
                    value={article.releves[field.key] ?? null}
                    color={color}
                    disabled={disabled}
                    onChange={val => handleFieldChange(article, field, val)}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

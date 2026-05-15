import { getPhraseTemplates } from '@/app/actions/phrases'
import PhraseList from '@/components/phrases/phrase-list'

export default async function PhrasesPage() {
  const phrases = await getPhraseTemplates()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-16">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1c1917]">Bibliothèque de phrases</h1>
        <p className="text-sm text-[#78716c] mt-1">
          Ces phrases sont disponibles dans la synthèse de chaque intervention.
        </p>
      </div>
      <PhraseList initialPhrases={phrases} />
    </div>
  )
}

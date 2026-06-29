export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-[#f5f5f4] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#a8a29e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-[#1c1917] mb-2">Pas de connexion</h1>
        <p className="text-sm text-[#78716c] mb-6">
          Vous êtes hors ligne. Reconnectez-vous à internet pour accéder à l'application.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}

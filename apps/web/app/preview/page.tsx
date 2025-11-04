'use client'

export default function PreviewPage() {
  const flags = {
    'BATCH 1.5': process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5,
    'Single CTA': process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA,
    'Near Difficulty': process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_NEAR_DIFFICULTY,
    'Batch API': process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_BATCH_API,
    'Sampler Performance': process.env.NEXT_PUBLIC_HOTFIX_BATCH1_5_SAMPLER_PERF,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              🎛️ Preview Mode
            </h1>
            <p className="text-white/80 text-lg">
              Batch 1.5 Hotfix Configuration
            </p>
          </div>

          <div className="space-y-4">
            {Object.entries(flags).map(([name, value]) => (
              <div
                key={name}
                className="flex items-center justify-between p-4 bg-white/10 rounded-xl border border-white/20 hover:bg-white/20 transition-all"
              >
                <span className="text-white font-medium text-lg">{name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono px-3 py-1 rounded-full ${
                    value === 'true' 
                      ? 'bg-green-500/30 text-green-100' 
                      : 'bg-red-500/30 text-red-100'
                  }`}>
                    {value || 'undefined'}
                  </span>
                  {value === 'true' ? (
                    <span className="text-2xl">✅</span>
                  ) : (
                    <span className="text-2xl">❌</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-white/10 rounded-xl border border-white/20">
            <h3 className="text-white font-semibold mb-2">🚀 Quick Links</h3>
            <div className="space-y-2">
              <a
                href="/ask"
                className="block text-white/90 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
              >
                → Ask Page (Single Question Flow)
              </a>
              <a
                href="/community"
                className="block text-white/90 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
              >
                → Community
              </a>
              <a
                href="/backpack"
                className="block text-white/90 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all"
              >
                → Backpack (Error Book)
              </a>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-white/60 text-sm">
              HMR enabled • Changes will reflect instantly
            </p>
            <p className="text-white/60 text-sm mt-1">
              Press <kbd className="px-2 py-1 bg-white/20 rounded text-white/80 font-mono text-xs">F12</kbd> to open DevTools
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


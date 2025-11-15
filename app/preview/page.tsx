import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

type FlagDefinition = {
  label: string
  env: keyof NodeJS.ProcessEnv
  description: string
}

type PreviewCard = {
  title: string
  description: string
  href: string
  highlights: string[]
  gradient: string
  emoji: string
}

type UtilityLink = {
  label: string
  href: string
  note: string
}

const flagDefinitions: FlagDefinition[] = [
  {
    label: 'Batch 1.5',
    env: 'NEXT_PUBLIC_HOTFIX_BATCH1_5',
    description: '主開關，啟用所有 Batch 1.5 體驗',
  },
  {
    label: 'Single CTA',
    env: 'NEXT_PUBLIC_HOTFIX_BATCH1_5_SINGLE_CTA',
    description: '簡化操作，只保留單一 CTA 行為',
  },
  {
    label: 'Near Difficulty',
    env: 'NEXT_PUBLIC_HOTFIX_BATCH1_5_NEAR_DIFFICULTY',
    description: '根據題目難度即時抽題',
  },
  {
    label: 'Batch API',
    env: 'NEXT_PUBLIC_HOTFIX_BATCH1_5_BATCH_API',
    description: '平行處理多題批次請求',
  },
  {
    label: 'Sampler Performance',
    env: 'NEXT_PUBLIC_HOTFIX_BATCH1_5_SAMPLER_PERF',
    description: '優化抽題效能與監控',
  },
]

const previewPages: PreviewCard[] = [
  {
    title: 'Ask · Solver Lab',
    description: '單題即解、Single CTA、批次 API 與抽題監控，一頁看完所有 Batch 1.5 能力。',
    href: '/ask',
    highlights: ['Single CTA', 'Sampler Logs', 'Batch API'],
    gradient: 'from-rose-500/90 via-pink-500/80 to-orange-400/70',
    emoji: '🧠',
  },
  {
    title: 'Community Feed',
    description: '即時社群、互動貼文與動畫流暢度，檢查冬季版 UI/UX 調整。',
    href: '/community',
    highlights: ['動畫測試', '情境貼文', '互動指標'],
    gradient: 'from-sky-500/80 via-cyan-500/80 to-emerald-400/70',
    emoji: '🌐',
  },
  {
    title: 'Backpack · 錯題本',
    description: '錯題整理、主題分類與高亮提示，驗證資料設計與離線模式。',
    href: '/backpack',
    highlights: ['錯題整理', '分類瀏覽', '離線樣式'],
    gradient: 'from-indigo-500/80 via-violet-500/80 to-purple-500/70',
    emoji: '🎒',
  },
  {
    title: 'Play · Battle Mode',
    description: 'Battle/ELO 模式、即時動畫與 Game Loop，確認整合後的操作節奏。',
    href: '/play',
    highlights: ['Battle Flow', 'ELO 更新', '動態提示'],
    gradient: 'from-emerald-500/80 via-lime-500/80 to-yellow-400/80',
    emoji: '🎮',
  },
  {
    title: 'Store & Rewards',
    description: '點數商店、獎勵卡片與換裝動線，檢查激勵系統連動。',
    href: '/store',
    highlights: ['兌換流程', '點數狀態', '激勵提示'],
    gradient: 'from-orange-500/80 via-amber-500/80 to-yellow-400/80',
    emoji: '🏆',
  },
  {
    title: 'Profile & Progress',
    description: '個人資訊、連續登入與任務統計，快速預覽個人化區塊。',
    href: '/profile',
    highlights: ['Streak', 'XP / Coins', '內容捷徑'],
    gradient: 'from-slate-600/80 via-slate-500/80 to-slate-400/80',
    emoji: '👤',
  },
]

const utilityLinks: UtilityLink[] = [
  { label: 'Heartbeat API', href: '/api/heartbeat', note: '確認伺服器與 Supabase 連線' },
  { label: 'AI Router', href: '/api/ai/route-solver', note: 'POST · 混合解題路由 /ask 主流程' },
  { label: 'Sampler', href: '/api/exec/similar', note: 'POST · 類題推薦資料管線' },
  { label: 'Keypoints', href: '/api/exec/keypoints', note: 'POST · 重點整理流程' },
]

const formatFlagValue = (value?: string) => {
  if (value === 'true') return 'ON'
  if (value === 'false') return 'OFF'
  return '未設定'
}

export default function PreviewPage() {
  const flags = flagDefinitions.map((flag) => {
    const raw = process.env[flag.env]
    return {
      ...flag,
      raw,
      enabled: raw === 'true',
    }
  })

  const startedAt = new Intl.DateTimeFormat('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date())

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_20px_120px_rgba(59,130,246,0.25)]">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/70">Preview Hub · Local 3000</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">
                一鍵巡覽全部核心頁面
              </h1>
              <p className="mt-4 max-w-2xl text-base text-white/70">
                Batch 1.5 旗標與錯題本、Battle、社群、Store 等所有入口都整合在同一個
                URL。打開下方頁面即可驗證 UI、API 與資料串接。
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-6 py-4 text-sm text-white/70">
              <div className="text-xs uppercase tracking-[0.25em] text-white/50">Server</div>
              <div className="mt-1 text-lg font-semibold text-white">http://localhost:3000</div>
              <div className="mt-2 text-xs text-white/50">Last refreshed · {startedAt}</div>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/ask"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow"
            >
              立即測試 Solver
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/community"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-transparent px-5 py-2 text-sm text-white/80 transition hover:border-white hover:text-white"
            >
              開啟最新社群動態
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/60">Flags</p>
            <h2 className="mt-1 text-2xl font-semibold">Batch 1.5 狀態總覽</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flags.map((flag) => (
              <div
                key={flag.env}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{flag.label}</p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      flag.enabled ? 'bg-emerald-400/20 text-emerald-200' : 'bg-rose-500/20 text-rose-100'
                    }`}
                  >
                    {formatFlagValue(flag.raw)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/60">{flag.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.3em] text-white/60">Pages</p>
            <h2 className="text-2xl font-semibold">所有核心頁面預覽</h2>
            <p className="text-sm text-white/60">
              點擊任一卡片即可直接帶到對應頁面，所有路由皆在同一個 Next 開發伺服器，
              可以透過熱更新觀察調整。
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {previewPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 transition hover:scale-[1.01]"
              >
                <div
                  className={`pointer-events-none absolute inset-0 opacity-70 blur-3xl transition group-hover:opacity-90 bg-gradient-to-br ${page.gradient}`}
                />
                <div className="relative flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{page.emoji}</span>
                    <ArrowRight className="h-5 w-5 text-white/70 transition group-hover:translate-x-1" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{page.title}</h3>
                    <p className="mt-2 text-sm text-white/70">{page.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {page.highlights.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-[0.3em] text-white/60">Diagnostics</p>
            <h2 className="text-2xl font-semibold">API / 工具快速檢查</h2>
            <p className="text-sm text-white/60">
              直接從同一個 localhost 觸發 API，確保伺服器串接與資料流程皆可即時驗證。
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {utilityLinks.map((tool) => {
              const external = tool.href.startsWith('http')
              return (
                <a
                  key={tool.href}
                  href={tool.href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noreferrer' : undefined}
                  className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-base font-medium">{tool.label}</div>
                    <ArrowRight className="h-4 w-4 text-white/60" />
                  </div>
                  <p className="text-sm text-white/60">{tool.note}</p>
                  <p className="text-xs text-white/40">{tool.href}</p>
                </a>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

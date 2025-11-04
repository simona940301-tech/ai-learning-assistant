import { motion } from 'framer-motion'

interface SummaryCardProps {
  title: string
  bullets: string[]
  onClose?: () => void
}

const SummaryCard = ({ title, bullets, onClose }: SummaryCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="rounded-[26px] border border-white/6 bg-[#141A20] p-6 text-[#F1F5F9] shadow-[0_12px_30px_rgba(0,0,0,0.4)] sm:p-8"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/60 transition hover:bg-white/10"
          >
            關閉
          </button>
        )}
      </header>
      <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[#A9B7C8]">
        {bullets.map((bullet, index) => (
          <li key={index} className="rounded-2xl bg-[#11171D] px-4 py-3">
            {bullet}
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

export default SummaryCard

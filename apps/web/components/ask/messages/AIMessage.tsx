import { motion } from 'framer-motion'

interface AIMessageProps {
  content: string
  tone?: 'mentor' | 'neutral'
}

const AIMessage = ({ content, tone = 'mentor' }: AIMessageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-[86%] rounded-3xl bg-[#141A20] px-5 py-4 text-sm leading-relaxed text-[#E6EDF4] shadow-[0_6px_18px_rgba(0,0,0,0.35)]"
    >
      <p className="whitespace-pre-wrap">
        {tone === 'mentor' ? `🌱 ${content}` : content}
      </p>
    </motion.div>
  )
}

export default AIMessage

import { motion } from 'framer-motion'

interface UserMessageProps {
  content: string
  timestamp?: string
}

const UserMessage = ({ content, timestamp }: UserMessageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="ml-auto max-w-[82%] rounded-3xl bg-[#1E2932] px-5 py-4 text-sm leading-relaxed text-[#F1F5F9] shadow-[0_6px_18px_rgba(0,0,0,0.4)]"
    >
      <p className="whitespace-pre-wrap">{content}</p>
      {timestamp && <span className="mt-2 block text-right text-[10px] uppercase tracking-[0.2em] text-white/30">{timestamp}</span>}
    </motion.div>
  )
}

export default UserMessage

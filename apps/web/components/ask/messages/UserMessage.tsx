import { motion } from 'framer-motion'

interface UserMessageProps {
  content: string
  timestamp?: string
}

const UserMessage = ({ content, timestamp }: UserMessageProps) => {
  const isImage = content.startsWith('data:image/')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`ml-auto max-w-[85%] rounded-3xl border border-companion/60 bg-gradient-to-br from-[hsl(var(--companion)/0.9)] via-[hsl(var(--companion))] to-[hsl(var(--companion)/0.85)] px-4 py-3 text-sm leading-relaxed text-[hsl(var(--companion-foreground))] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)] ${isImage ? 'p-2' : ''
        }`}
    >
      {isImage ? (
        <img
          src={content}
          alt="User uploaded question"
          className="max-h-[300px] w-auto rounded-xl object-contain"
        />
      ) : (
        <p className="whitespace-pre-wrap">{content}</p>
      )}
      {timestamp && (
        <span className="mt-2 block text-right text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--companion-foreground))/0.7]">
          {timestamp}
        </span>
      )}
    </motion.div>
  )
}

export default UserMessage

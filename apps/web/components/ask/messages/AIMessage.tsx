import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AIMessageProps {
  content: string
  tone?: 'mentor' | 'neutral'
}

const AIMessage = ({ content, tone = 'mentor' }: AIMessageProps) => {
  const isMentor = tone === 'mentor'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-[90%] rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm leading-relaxed text-foreground shadow-sm backdrop-blur-sm flex items-start gap-3 prose prose-sm max-w-none prose-headings:mt-2 prose-p:mt-0 prose-li:my-1 prose-ul:my-2 prose-ol:my-2"
    >
      {isMentor && <span className="mt-1 text-lg" aria-hidden>🌱</span>}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="w-full overflow-x-auto rounded-lg border border-border/50 bg-card/60 p-2">
              <table className="min-w-full text-left text-xs sm:text-sm border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-b border-border/60 px-2 py-1 font-semibold whitespace-nowrap">{children}</th>,
          td: ({ children }) => <td className="border-b border-border/40 px-2 py-1 align-top break-words">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </motion.div>
  )
}

export default AIMessage

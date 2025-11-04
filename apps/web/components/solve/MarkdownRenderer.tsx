'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

interface MarkdownRendererProps {
  content: string
}

/**
 * ChatGPT-style Markdown Renderer
 * - Clean typography with proper hierarchy
 * - Breathing space between sections
 * - Natural reading flow
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <article className="prose prose-invert max-w-none leading-relaxed text-[15px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h2: ({ node, ...props }) => (
            <h2
              className="text-base font-semibold text-zinc-100 mt-4 mb-2 flex items-center gap-2"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-sm font-medium text-zinc-200 mt-3 mb-1.5"
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p
              className="text-sm text-zinc-300 leading-relaxed my-2"
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul
              className="space-y-1.5 my-2 list-none pl-0"
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="space-y-1.5 my-2 list-decimal pl-5"
              {...props}
            />
          ),
          li: ({ node, ...props }) => (
            <li
              className="text-sm text-zinc-300 leading-relaxed"
              {...props}
            />
          ),
          hr: ({ node, ...props }) => (
            <hr
              className="my-4 border-t border-zinc-800/30"
              {...props}
            />
          ),
          strong: ({ node, ...props }) => (
            <strong
              className="font-semibold text-zinc-100"
              {...props}
            />
          ),
          em: ({ node, ...props }) => (
            <em
              className="italic text-zinc-200"
              {...props}
            />
          ),
          code: ({ node, inline, ...props }: any) =>
            inline ? (
              <code
                className="px-1.5 py-0.5 rounded bg-zinc-800/60 text-blue-300 text-xs font-mono"
                {...props}
              />
            ) : (
              <code
                className="block px-3 py-2 rounded-lg bg-zinc-900 text-zinc-100 text-xs font-mono overflow-x-auto"
                {...props}
              />
            ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-blue-600/40 pl-3 py-1 my-3 text-zinc-400 italic"
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}

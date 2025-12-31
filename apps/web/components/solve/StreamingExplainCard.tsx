import { useEffect, useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Loader2, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useHighlightStore } from '@/src/store/highlightStore'

interface StreamingExplainCardProps {
  questionText?: string
  streamUrl?: string
  streamBody?: any
  onError?: (error: Error) => void
  className?: string
}

export function StreamingExplainCard({
  questionText,
  streamUrl = '/api/backpack/explain',
  streamBody,
  onError,
  className
}: StreamingExplainCardProps) {
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const setHighlightedId = useHighlightStore((s) => s.setHighlightedId)

  // Function to handle clicks on markdown elements
  const handleContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    // Check if the clicked element or its parent has a data-target-id attribute
    const targetId = target.getAttribute('data-target-id') || target.closest('[data-target-id]')?.getAttribute('data-target-id')

    if (targetId) {
      setHighlightedId(targetId)
    }
  }

  useEffect(() => {
    const fetchStream = async () => {
      try {
        setIsLoading(true)
        setError(null)
        setContent('') // Reset content

        abortControllerRef.current = new AbortController()

        const response = await fetch(streamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionText,
            ...streamBody
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`Stream error: ${response.status}`)
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          setContent(prev => prev + chunk)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Stream aborted')
          return
        }
        console.error('[StreamingExplainCard] Error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load explanation')
        onError?.(err instanceof Error ? err : new Error('Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }

    if (questionText || streamBody) {
      fetchStream()
    }

    return () => {
      abortControllerRef.current?.abort()
    }
  }, [questionText, streamUrl, JSON.stringify(streamBody)])

  if (error) {
    return (
      <Card className={`p-4 border-red-200 bg-red-50 ${className}`}>
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="h-[300px] w-full p-4 overflow-y-auto">
        {isLoading && !content && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>AI 正在思考中...</span>
          </div>
        )}

        <div
          className="prose prose-sm dark:prose-invert max-w-none"
          onClick={handleContentClick}
        >
          <ReactMarkdown
            components={{
              a: ({ node, ...props }) => {
                const href = props.href || ''
                if (href.startsWith('target-id:')) {
                  const id = href.replace('target-id:', '')
                  return (
                    <span
                      className="text-blue-500 cursor-pointer hover:underline font-medium"
                      data-target-id={id}
                    >
                      {props.children}
                    </span>
                  )
                }
                return <a {...props} />
              }
            }}
          >
            {content}
          </ReactMarkdown>

          {isLoading && content && (
            <span className="inline-block ml-2 animate-pulse">▋</span>
          )}
        </div>
      </div>
    </Card>
  )
}

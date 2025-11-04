import { ReactNode, useEffect, useRef } from 'react'

interface ChatContainerProps {
  children: ReactNode
}

const ChatContainer = ({ children }: ChatContainerProps) => {
  const anchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Keep conversation anchored to bottom for chat-like feel
    anchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [children])

  return (
    <div className="flex-1 overflow-y-auto px-4 pb-36 pt-20 sm:px-0">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        {children}
        <div ref={anchorRef} />
      </div>
    </div>
  )
}

export default ChatContainer

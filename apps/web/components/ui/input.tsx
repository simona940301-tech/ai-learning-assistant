import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputMode, enterKeyHint, ...props }, ref) => {
    // Auto-set inputMode based on type if not explicitly provided
    const autoInputMode = inputMode || (
      type === 'email' ? 'email' :
      type === 'tel' ? 'tel' :
      type === 'url' ? 'url' :
      type === 'number' ? 'numeric' :
      type === 'search' ? 'search' :
      undefined
    )

    return (
      <input
        type={type}
        inputMode={autoInputMode}
        enterKeyHint={enterKeyHint}
        className={cn(
          "flex h-11 w-full rounded-lg border border-input bg-background px-4 py-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

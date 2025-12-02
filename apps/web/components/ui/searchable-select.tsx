'use client'

import * as React from "react"
import { ChevronDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  disabled?: boolean
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "請選擇...",
  searchPlaceholder = "搜尋...",
  className,
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  // 過濾選項
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim()) return options
    const lowerQuery = searchQuery.toLowerCase()
    return options.filter(opt =>
      opt.label.toLowerCase().includes(lowerQuery)
    )
  }, [options, searchQuery])

  // 獲取選中的標籤
  const selectedLabel = React.useMemo(() => {
    const selected = options.find(opt => opt.value === value)
    return selected?.label || placeholder
  }, [options, value, placeholder])

  // 點擊外部關閉
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setSearchQuery("")
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [open])

  const handleSelect = (optionValue: string) => {
    onValueChange(optionValue)
    setOpen(false)
    setSearchQuery("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange("")
    setSearchQuery("")
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-xl border border-white/10 bg-[#111317]/95 px-4 py-3 text-base text-white transition-all",
          "focus:outline-none focus:ring-1 focus:ring-[#4A8BFF] focus:border-[#4A8BFF]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-[#4A8BFF] ring-1 ring-[#4A8BFF]",
          className
        )}
      >
        <span className={cn("truncate", !value && "text-white/30")}>
          {selectedLabel}
        </span>
        <div className="flex items-center gap-2 ml-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="h-4 w-4 text-white/60" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-white/40 transition-transform",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Dropdown Content */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setOpen(false)
              setSearchQuery("")
            }}
          />
          <div className="absolute z-50 mt-2 w-full rounded-xl border border-white/10 bg-[#111317]/95 backdrop-blur-xl shadow-lg overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-10 pl-10 pr-4 bg-[#1A1D24] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#4A8BFF] focus:border-[#4A8BFF] text-sm"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-[min(24rem,50vh)] overflow-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-8 text-center text-white/40 text-sm">
                  沒有找到符合的選項
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "w-full text-left px-4 py-3 text-sm text-white/90 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0",
                      value === option.value && "bg-[#4A8BFF]/20 text-[#4A8BFF]"
                    )}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}






























'use client'

import * as React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface SubjectSelectProps {
  value: string
  onValueChange: (value: string) => void
  label?: string
  placeholder?: string
  showOptional?: boolean
  className?: string
}

const subjects = [
  { id: 'chinese', name: '國文' },
  { id: 'english', name: '英文' },
  { id: 'math', name: '數學' },
  { id: 'science', name: '自然' },
  { id: 'social', name: '社會' },
]

export function SubjectSelect({
  value,
  onValueChange,
  label,
  placeholder = '選擇學科',
  showOptional = false,
  className,
}: SubjectSelectProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label>
          {label}
          {showOptional && (
            <span className="ml-1 text-xs text-muted-foreground">(可選)</span>
          )}
        </Label>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {subjects.map((subject) => (
            <SelectItem key={subject.id} value={subject.id}>
              {subject.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

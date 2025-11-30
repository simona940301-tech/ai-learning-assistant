import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    indicatorClassName?: string
  }
>(({ className, value, indicatorClassName, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-stone-100",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn("h-full w-full flex-1 bg-gradient-to-r from-[#FFB01A] to-[#FF6B35] transition-all duration-500 ease-out", indicatorClassName)}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

// Progress with label and percentage
interface ProgressWithLabelProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value: number
  label?: string
  showPercentage?: boolean
  indicatorClassName?: string
}

const ProgressWithLabel = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressWithLabelProps
>(({ className, value = 0, label, showPercentage = true, indicatorClassName, ...props }, ref) => (
  <div className="w-full space-y-2">
    {(label || showPercentage) && (
      <div className="flex items-center justify-between text-sm">
        {label && <span className="font-medium text-foreground">{label}</span>}
        {showPercentage && <span className="text-muted-foreground">{Math.round(value)}%</span>}
      </div>
    )}
    <Progress
      ref={ref}
      value={value}
      className={className}
      indicatorClassName={indicatorClassName}
      {...props}
    />
  </div>
))
ProgressWithLabel.displayName = "ProgressWithLabel"

export { Progress, ProgressWithLabel }

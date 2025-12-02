import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Export field mapping utilities for easy access
export { dbToApiFormat, apiToDbFormat, safeDbToApiTransform } from './utils/field-mapping'

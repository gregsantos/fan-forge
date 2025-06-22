import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | undefined): string {
  if (!date) return "No deadline"
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9)
}

export function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) return "Today"
  if (diffInDays === 1) return "Yesterday"
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  
  return formatDate(date)
}

export function createSearchParams(params: Record<string, string | undefined>): URLSearchParams {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, value)
    }
  })
  return searchParams
}
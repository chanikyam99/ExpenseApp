// lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Safely merges Tailwind class names without conflicts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format a number as Indian Rupees
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Format a date string (YYYY-MM-DD) as "15 Jan 2025"
export function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Human-readable relative time: "2h ago", "3d ago"
export function timeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diffMs / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(isoDate.slice(0, 10))
}

// All supported expense categories
export const CATEGORIES = [
  { id: 'groceries',     label: 'Groceries',     icon: '🛒' },
  { id: 'utilities',     label: 'Utilities',     icon: '⚡' },
  { id: 'rent',          label: 'Rent',          icon: '🏠' },
  { id: 'dining',        label: 'Dining',        icon: '🍽️' },
  { id: 'transport',     label: 'Transport',     icon: '🚗' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { id: 'healthcare',    label: 'Healthcare',    icon: '💊' },
  { id: 'other',         label: 'Other',         icon: '📦' },
] as const

export type CategoryId = typeof CATEGORIES[number]['id']

export function getCategoryIcon(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.icon ?? '📦'
}

export function getCategoryLabel(id: string): string {
  return CATEGORIES.find(c => c.id === id)?.label ?? 'Other'
}

// Avatar colors assigned to group members
export const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#22c55e', '#14b8a6', '#f59e0b', '#ef4444',
]

// Get 1–2 uppercase initials from a display name
export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// Generate a random 8-character invite code (no ambiguous chars)
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
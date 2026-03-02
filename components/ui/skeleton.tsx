'use client'

import { cn } from '@/lib/utils'

export function Skeleton({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('animate-pulse bg-zen-border rounded-[var(--radius)]', className)} {...props}>
      {children}
    </div>
  )
}

// Preset Skeletons
export function SkeletonCard() {
  return (
    <div className="zen-card p-6 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

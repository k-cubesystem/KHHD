'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex h-12 w-full rounded-lg input-manse px-4 py-2 text-sm font-sans',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'shadow-sm hover:shadow-md hover:shadow-primary/5',
        'focus:scale-[1.01] transition-transform',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }

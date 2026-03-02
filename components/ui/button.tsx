'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer relative overflow-hidden active:scale-[0.98] hover:scale-[1.02]',
  {
    variants: {
      variant: {
        default: 'bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#F4E4BA] shadow-[0_4px_20px_rgba(212,175,55,0.3)]',
        destructive: 'bg-seal text-white shadow-sm hover:bg-seal/90',
        outline: 'bg-transparent text-[#D4AF37] border border-[#D4AF37] hover:bg-[#D4AF37]/10',
        secondary: 'bg-surface text-ink-light shadow-sm hover:bg-surface/80 border border-primary/20',
        ghost: 'text-ink-light hover:bg-surface hover:text-primary',
        link: 'text-primary underline-offset-4 hover:underline font-light',
        manse:
          'bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#F4E4BA] hover:scale-[1.05] active:scale-[0.95] font-semibold shadow-[0_4px_20px_rgba(212,175,55,0.3)]',
        'manse-outline':
          'bg-transparent text-[#D4AF37] border border-[#D4AF37] hover:bg-[#D4AF37]/10 hover:border-[#F4E4BA] hover:text-[#F4E4BA] font-semibold',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-8 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Slot>
      )
    }

    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }

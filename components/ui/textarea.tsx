import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-[120px] w-full rounded-lg border border-primary-dim/30",
                    "bg-surface px-4 py-3 text-sm text-ink-light font-sans",
                    "placeholder:text-ink-faint resize-none",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0",
                    "focus-visible:border-primary focus-visible:bg-surface/80",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "transition-all duration-200",
                    "shadow-sm hover:shadow-md hover:shadow-primary/5",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Textarea.displayName = "Textarea"

export { Textarea }

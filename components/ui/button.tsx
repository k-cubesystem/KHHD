import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-gold-500 to-gold-600 text-ink-950 font-semibold shadow-lg shadow-gold-900/20 hover:from-gold-400 hover:to-gold-500 hover:shadow-gold-500/25 border-t border-white/20",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-gold-500/30 bg-background/50 text-gold-500 shadow-sm hover:bg-gold-500/10 hover:border-gold-500 hover:text-gold-400 backdrop-blur-sm",
        secondary:
          "bg-ink-800 text-secondary-foreground shadow-sm hover:bg-ink-700 border border-white/5",
        ghost: "text-muted-foreground hover:bg-gold-500/5 hover:text-gold-500",
        link: "text-gold-500 underline-offset-4 hover:underline",
        // New Variants
        shimmer: "bg-ink-900 text-gold-200 border border-gold-500/30 animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-ink-900 via-gold-900/20 to-ink-900",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

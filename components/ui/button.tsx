"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#F4E4BA] shadow-[0_4px_20px_rgba(212,175,55,0.3)]",
        destructive: "bg-seal text-white shadow-sm hover:bg-seal/90",
        outline: "bg-transparent text-[#D4AF37] border border-[#D4AF37] hover:bg-[#D4AF37]/10",
        secondary: "bg-surface text-ink-light shadow-sm hover:bg-surface/80 border border-primary/20",
        ghost: "text-ink-light hover:bg-surface hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline font-light",
      },
      size: {
        default: "h-11 px-4 py-2",  // 44px - Mobile touch target
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        icon: "h-11 w-11",
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
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    // Remove all event handlers that conflict between React and Framer Motion
    const {
      onDrag,
      onDragStart,
      onDragEnd,
      onAnimationStart,
      onAnimationEnd,
      onAnimationIteration,
      ...buttonProps
    } = props;

    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        {...buttonProps}
      >
        {/* Gold Shimmer Overlay (variant="default"만) */}
        {variant === "default" && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-dim/30 to-transparent"
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        )}
        <span className="relative z-10">{children}</span>
      </motion.button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

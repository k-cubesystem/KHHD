"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    // Remove conflicting props between React and Framer Motion
    const {
      onDrag,
      onDragStart,
      onDragEnd,
      onAnimationStart,
      onAnimationEnd,
      onAnimationIteration,
      ...inputProps
    } = props;

    return (
      <motion.input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-lg input-manse px-4 py-2 text-sm font-sans",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "shadow-sm hover:shadow-md hover:shadow-primary/5",
          className
        )}
        whileFocus={{ scale: 1.01 }}
        ref={ref}
        {...inputProps}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

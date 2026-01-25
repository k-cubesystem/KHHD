"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  // Remove conflicting props between React and Framer Motion
  const {
    onDrag,
    onDragStart,
    onDragEnd,
    onAnimationStart,
    onAnimationEnd,
    onAnimationIteration,
    ...divProps
  } = props;

  return (
    <motion.div
      animate={{
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={cn(
        "bg-zen-border rounded-[var(--radius)]",
        className
      )}
      {...divProps}
    >
      {children}
    </motion.div>
  );
}

// Preset Skeletons
export function SkeletonCard() {
  return (
    <div className="zen-card p-6 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
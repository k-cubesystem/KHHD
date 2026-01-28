import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 font-sans",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-background shadow-sm shadow-primary/20 hover:bg-primary-dark",
        secondary:
          "border-primary-dim/30 bg-surface text-ink-light hover:bg-surface/80",
        destructive:
          "border-transparent bg-seal text-white shadow-sm hover:bg-seal/80",
        outline: "text-ink-light border-primary-dim/30 hover:bg-surface",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

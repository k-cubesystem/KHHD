"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  index?: number;
}

export function AnimatedCard({ children, className, index = 0 }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        delay: index * 0.1,
      }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-colors cursor-pointer group",
          className
        )}
      >
        {/* Shimmer effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </Card>
    </motion.div>
  );
}

interface StatsCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
  index?: number;
}

export function StatsCard({ label, value, sub, icon: Icon, color, index = 0 }: StatsCardProps) {
  return (
    <AnimatedCard index={index} className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2 rounded-lg bg-white/5", color)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-white/50">{label}</h3>
        <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
        <p className="text-xs text-white/30">{sub}</p>
      </div>
    </AnimatedCard>
  );
}

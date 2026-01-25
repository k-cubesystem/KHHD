"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Users, DollarSign, Activity, FileText, LucideIcon } from "lucide-react";

// Icon Mapping for Server -> Client serialization
const ICON_MAP: Record<string, LucideIcon> = {
  users: Users,
  revenue: DollarSign,
  records: FileText,
  system: Activity
};

interface StatCard {
  label: string;
  value: string;
  sub: string;
  iconKey: string; // Changed from LucideIcon component to string key
  color: string;
}

interface DashboardStatsProps {
  cards: StatCard[];
}

export function DashboardStats({ cards }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, i) => {
        const Icon = ICON_MAP[card.iconKey] || Activity; // Fallback to Activity if key not found

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              delay: i * 0.1,
            }}
            whileHover={{
              scale: 1.02,
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.98 }}
          >
            <Card className="p-6 bg-white border-zen-border hover:shadow-lg hover:border-zen-gold/30 transition-all cursor-pointer group relative overflow-hidden">
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zen-gold/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-2 rounded-lg bg-zen-bg border border-zen-border", card.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium text-zen-muted font-sans">{card.label}</h3>
                  <div className="text-2xl font-bold text-zen-text tabular-nums font-serif">
                    {card.value}
                  </div>
                  <p className="text-xs text-zen-muted/80">{card.sub}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

interface AnimatedHeaderProps {
  title: string;
  subtitle: string;
}

export function AnimatedHeader({ title, subtitle }: AnimatedHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <h1 className="text-3xl font-bold text-zen-text font-serif">
        {title}
      </h1>
      <p className="text-zen-muted mt-1 font-sans">{subtitle}</p>
    </motion.div>
  );
}

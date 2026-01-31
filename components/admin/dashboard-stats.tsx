"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Users, DollarSign, Activity, FileText, LucideIcon, TrendingUp } from "lucide-react";

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
  iconKey: string;
  color: string;
}

interface DashboardStatsProps {
  cards: StatCard[];
}

export function DashboardStats({ cards }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {cards.map((card, i) => {
        const Icon = ICON_MAP[card.iconKey] || Activity;

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
            <Card className="p-5 md:p-6 bg-surface/40 backdrop-blur-sm border-primary/20 hover:border-primary/50 transition-all cursor-pointer group relative overflow-hidden shadow-lg">
              {/* Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />

              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-2.5 bg-surface border border-primary/20 group-hover:border-primary/40 transition-colors", card.color)}>
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                  </div>
                  <TrendingUp className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-ink-light/60 font-sans uppercase tracking-wider">{card.label}</h3>
                  <div className="text-3xl md:text-2xl font-bold text-ink-light tabular-nums font-serif tracking-tight">
                    {card.value}
                  </div>
                  <p className="text-[10px] md:text-xs text-ink-light/50 font-light">{card.sub}</p>
                </div>
              </div>

              {/* Bottom Decoration */}
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
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
      className="mb-6"
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 h-8 bg-primary" />
        <h1 className="text-3xl md:text-4xl font-bold text-ink-light font-serif tracking-tight">
          {title}
        </h1>
      </div>
      <p className="text-ink-light/60 mt-2 font-sans pl-4">{subtitle}</p>
    </motion.div>
  );
}

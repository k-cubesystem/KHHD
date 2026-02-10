"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { User } from "lucide-react";
import { MISSION_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { FamilyMemberWithMissions } from "@/app/actions/family-missions";

interface Props {
  member: FamilyMemberWithMissions;
  onClick: () => void;
  index: number;
}

export function MemberMissionCard({ member, onClick, index }: Props) {
  const progress = (member.mission_completed / member.mission_total) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        onClick={onClick}
        className="card-glass-manse cursor-pointer hover:border-primary/40 transition-all p-6 active:scale-[0.98]"
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-serif font-bold text-white text-xl truncate">
              {member.name}
            </h4>
            <p className="text-sm text-white/60 mt-0.5">{member.relationship}</p>
          </div>
          {member.last_analysis_score && (
            <div className="text-2xl font-serif font-bold text-[#D4AF37]">
              {member.last_analysis_score}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-white/70 font-medium">이번 달 운세</span>
            <span className="text-sm font-bold text-[#D4AF37]">
              {progress}% ↑
            </span>
          </div>
          <div className="relative h-2.5 bg-surface/30 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-[#D4AF37]/60 to-[#D4AF37]"
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          </div>
        </div>

        {/* Badge Grid */}
        <div className="grid grid-cols-4 gap-2.5">
          {MISSION_CATEGORIES.map((cat, idx) => {
            const isCompleted = member.completed_categories?.includes(cat.value);
            const Icon = cat.icon;
            return (
              <motion.div
                key={cat.value}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
                className={cn(
                  "aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border p-2",
                  isCompleted
                    ? "bg-[#D4AF37]/10 border-[#D4AF37]/30"
                    : "bg-surface/20 border-white/5 opacity-30"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5",
                  isCompleted ? "text-[#D4AF37]" : "text-white/20"
                )} />
                <span className={cn(
                  "text-[9px] font-bold",
                  isCompleted ? "text-[#D4AF37]/80" : "text-white/20"
                )}>
                  {cat.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}

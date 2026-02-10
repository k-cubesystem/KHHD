"use client";

import { motion } from "framer-motion";
import { Users } from "lucide-react";
import Link from "next/link";
import type { FamilyMemberFortune } from "@/app/actions/fortune-actions";

interface FamilyFortuneStatusProps {
  members: FamilyMemberFortune[];
}

export function FamilyFortuneStatus({ members }: FamilyFortuneStatusProps) {
  const totalFortune = members.reduce((sum, m) => sum + m.fortune, 0);
  const maxPossible = members.length * 800;
  const percentage = maxPossible > 0 ? Math.round((totalFortune / maxPossible) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Family Total Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-ink-light/20 rounded-full" />
          <h3 className="text-sm font-bold text-ink-light/70 uppercase tracking-wide">
            가족 운세 현황
          </h3>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-light/50">가족 총운</div>
          <div className="text-lg font-serif font-bold text-primary">
            {percentage}% ↑
          </div>
        </div>
      </div>

      {/* Member Cards */}
      <div className="space-y-2">
        {members.map((member, index) => {
          const memberPercentage = Math.round((member.fortune / 800) * 100);
          return (
            <motion.div
              key={member.memberId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-surface/30 border border-white/5 rounded-lg p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-serif font-bold text-ink-light text-sm">
                    {member.memberName}
                  </h4>
                  <span className="text-xs text-ink-light/50">
                    {member.relationship}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    {memberPercentage}%
                  </div>
                  <div className="text-xs text-ink-light/60">
                    {member.missionsCompleted}/8
                  </div>
                </div>
              </div>
              <div className="h-1.5 bg-surface/50 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary/60 to-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${memberPercentage}%` }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* View All Link */}
      <Link
        href="/protected/family"
        className="block text-center text-sm text-primary hover:underline py-2"
      >
        가족 전체 운세 보기 →
      </Link>
    </div>
  );
}

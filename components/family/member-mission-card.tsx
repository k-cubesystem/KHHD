"use client";

import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { User, Users } from "lucide-react";
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
        className="card-glass-manse cursor-pointer hover:border-primary/40 transition-all p-4 active:scale-[0.98] group"
      >
        <div className="flex items-center justify-between">
          {/* Left: Avatar & Info */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-serif font-bold text-white text-lg leading-none">
                  {member.name}
                </h4>
                <span className="text-xs text-white/50 bg-white/5 px-1.5 py-0.5 rounded">
                  {member.relationship}
                </span>
              </div>

              {/* Mini Progress Bar Inline */}
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-20 h-1 bg-surface/40 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-primary"
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <span className="text-[10px] text-primary/80 font-medium">{Math.round(progress)}% ↑</span>
              </div>
            </div>
          </div>

          {/* Right: CTA */}
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-white/40">미션 현황</span>
            <div className="flex items-center text-xs text-primary font-medium group-hover:translate-x-1 transition-transform">
              관리하기 <Users className="w-3 h-3 ml-1" />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

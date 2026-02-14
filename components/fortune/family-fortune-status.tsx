"use client";

import { motion } from "framer-motion";
import { Users, ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import type { FamilyMemberFortune } from "@/app/actions/fortune-actions";
import { cn } from "@/lib/utils";

interface FamilyFortuneStatusProps {
  members: FamilyMemberFortune[];
}

export function FamilyFortuneStatus({ members }: FamilyFortuneStatusProps) {
  const totalFortune = members.reduce((sum, m) => sum + m.fortune, 0);
  const maxPossible = members.length * 800;
  const percentage = maxPossible > 0 ? Math.round((totalFortune / maxPossible) * 100) : 0;
  const memberCount = members.length;

  return (
    <Link href="/protected/family" className="block group">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-black/40">
        {/* 배경 효과 */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5 opacity-50 transition-opacity group-hover:opacity-70" />

        {/* 장식용 원 */}
        <div className="absolute -right-12 -top-12 w-40 h-40 bg-primary/5 rounded-full blur-[50px] pointer-events-none" />

        <div className="relative p-5 flex items-center justify-between">
          <div className="space-y-3">
            {/* 상단 뱃지 */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
              <Users className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-medium text-primary tracking-wide">
                가족 운대 관리
              </span>
            </div>

            {/* 메인 텍스트 */}
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold text-ink-light leading-tight">
                당신은 가족의 <br />
                <span className="text-primary">수호신</span>입니다
              </h3>
              <p className="text-xs text-ink-light/60 font-light leading-relaxed">
                가족 {memberCount}명의 운명을 지키는 <br />
                따뜻한 울타리가 되어주세요.
              </p>
            </div>

            {/* 진행률 미니 바 */}
            <div className="flex items-center gap-2 pt-1">
              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </div>
              <span className="text-[10px] text-primary/80 font-medium">{percentage}% 보호 중</span>
            </div>
          </div>

          {/* 오른쪽 아이콘/이미지 영역 */}
          <div className="flex flex-col items-end gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(212,175,55,0.15)] group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>

            <div className="flex items-center gap-1 text-xs text-ink-light/50 group-hover:text-primary transition-colors">
              <span>관리하러 가기</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

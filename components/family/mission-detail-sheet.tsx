"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MISSION_CATEGORIES } from "@/lib/constants";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FamilyMemberWithMissions } from "@/app/actions/family-missions";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  member: FamilyMemberWithMissions | null;
}

export function MissionDetailSheet({ isOpen, onClose, member }: Props) {
  const router = useRouter();

  if (!member) return null;

  const completedMissions = MISSION_CATEGORIES.filter(m =>
    member.completed_categories?.includes(m.value)
  );

  const handleStartMission = (path: string) => {
    router.push(`${path}?target=${member.id}`);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="bg-[#0A0A0A] border-t border-[#D4AF37]/20 w-full max-w-[480px] mx-auto rounded-t-3xl pb-safe px-6 h-auto"
      >
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8 mt-4" />

        <SheetHeader className="text-left mb-6 space-y-4">
          <div>
            <SheetTitle className="text-xl font-serif font-bold text-white leading-snug">
              운명의 빈틈을 메우는 <br />
              <span className="text-[#D4AF37]">8가지 지혜</span>
            </SheetTitle>
            <p className="text-xs text-white/50 font-light mt-1">
              부족한 운을 메우면 <strong className="text-white/80 font-medium">소중한 사람을 지키는 힘</strong>이 됩니다.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-medium">
              <span className="text-primary">운세 완성도</span>
              <span className="text-white/60">
                <span className="text-primary">{completedMissions.length}</span> / {MISSION_CATEGORIES.length}
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${(completedMissions.length / MISSION_CATEGORIES.length) * 100}%` }}
              />
            </div>
          </div>
        </SheetHeader>

        <div className="pb-10">
          <div className="grid grid-cols-4 gap-3">
            {MISSION_CATEGORIES.map((mission) => {
              const isCompleted = member.completed_categories?.includes(mission.value);
              const Icon = mission.icon;

              return (
                <Button
                  key={mission.value}
                  onClick={() => handleStartMission(mission.path)}
                  variant="ghost"
                  className={cn(
                    "h-auto aspect-[3/4] flex-col items-center justify-center p-0 rounded-2xl gap-2 transition-all duration-500 relative overflow-hidden group",
                    isCompleted
                      ? "bg-primary/10 border border-primary/40 shadow-[0_0_20px_rgba(212,175,55,0.15)] hover:bg-primary/20"
                      : "bg-white/5 border border-white/5 hover:bg-white/10 opacity-70 hover:opacity-100"
                  )}
                >
                  {/* Glow Effect for Completed */}
                  {isCompleted && (
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-50" />
                  )}

                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative z-10",
                    isCompleted
                      ? "bg-primary text-black shadow-lg shadow-primary/30 scale-110" // 활성 상태: 골드 배경 + 검정 아이콘 + 반짝임
                      : "bg-white/5 text-white/30 group-hover:bg-white/10 group-hover:text-white/60"
                  )}>
                    <Icon className="w-5 h-5" strokeWidth={isCompleted ? 2 : 1.5} />
                  </div>

                  <span className={cn(
                    "text-[10px] font-medium relative z-10 transition-colors duration-300",
                    isCompleted ? "text-primary font-bold" : "text-white/40 group-hover:text-white/70"
                  )}>
                    {mission.label}
                  </span>

                  {/* Status Indicator */}
                  {!isCompleted && (
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white/10" />
                  )}
                </Button>
              );
            })}
          </div>

          <p className="text-center text-[10px] text-white/20 mt-6 font-light">
            * 모든 미션을 완료하면 특별한 운세 부적이 발급됩니다.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

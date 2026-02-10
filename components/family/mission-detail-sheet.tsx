"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MISSION_CATEGORIES } from "@/lib/constants";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FamilyMemberWithMissions } from "@/app/actions/family-missions";

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

  const pendingMissions = MISSION_CATEGORIES.filter(m =>
    !member.completed_categories?.includes(m.value)
  );

  const handleStartMission = (path: string) => {
    router.push(`${path}?target=${member.id}`);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="bg-[#0A0A0A] border-t border-[#D4AF37]/20 max-h-[85vh] overflow-y-auto pb-safe"
      >
        <SheetHeader className="sticky top-0 bg-[#0A0A0A] pb-4 z-10">
          <SheetTitle className="text-white text-lg">
            {member.name}님의 미션 현황
          </SheetTitle>
        </SheetHeader>

        <div className="mt-2 space-y-6 pb-8">
          {/* Completed */}
          {completedMissions.length > 0 && (
            <section>
              <h4 className="text-sm font-bold text-white/80 mb-3">
                완료한 분석 ({completedMissions.length})
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {completedMissions.map(m => {
                  const Icon = m.icon;
                  return (
                    <div key={m.value} className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#D4AF37]" />
                      </div>
                      <span className="text-xs text-white/60">{m.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Pending */}
          {pendingMissions.length > 0 && (
            <section>
              <h4 className="text-sm font-bold text-white/80 mb-3">
                추천 분석 ({pendingMissions.length})
              </h4>
              <div className="space-y-2">
                {pendingMissions.map(m => {
                  const Icon = m.icon;
                  return (
                    <Button
                      key={m.value}
                      onClick={() => handleStartMission(m.path)}
                      className="w-full justify-between bg-surface/30 hover:bg-surface/50 border border-white/10 h-auto py-3 px-4"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-[#D4AF37]" />
                        <div className="text-left">
                          <p className="font-bold text-white">{m.label}</p>
                          <p className="text-xs text-white/60">
                            {m.cost === 0 ? "무료" : `${m.cost}부적`}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-white/40" />
                    </Button>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

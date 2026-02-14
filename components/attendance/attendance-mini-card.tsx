"use client";

import Link from "next/link";
import { CalendarCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceMiniCardProps {
  canCheckIn: boolean;
  weekCount: number;
  weekDays?: Array<{ checked: boolean; isToday: boolean; isFuture: boolean }>;
}

export function AttendanceMiniCard({ canCheckIn, weekCount, weekDays = [] }: AttendanceMiniCardProps) {
  return (
    <Link href="/protected/profile" className="block">
      <div className="flex flex-col items-center justify-center aspect-square bg-surface/30 border border-white/5 rounded-xl hover:border-primary/10 transition-all p-4 group relative">
        {/* 체크 가능 ping */}
        {canCheckIn && (
          <span className="absolute top-3 right-3 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gold-400" />
          </span>
        )}

        <CalendarCheck
          className={cn(
            "w-7 h-7 mb-2 group-hover:scale-110 transition-transform",
            canCheckIn ? "text-gold-400" : "text-primary"
          )}
          strokeWidth={1}
        />

        <span className="text-sm font-serif font-normal text-ink-light mb-1">일일 출석</span>

        {/* 주간 미니 도트 */}
        <div className="flex gap-0.5 mb-1">
          {Array.from({ length: 7 }).map((_, i) => {
            const day = weekDays[i];
            return (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full",
                  day?.checked
                    ? "bg-gold-400"
                    : day?.isToday && canCheckIn
                    ? "bg-primary/50 border border-primary animate-pulse"
                    : "bg-white/10"
                )}
              />
            );
          })}
        </div>

        <span className="text-[10px] text-ink-light/50 font-light">
          {canCheckIn ? "오늘 체크 가능" : `${weekCount}/7일 완료`}
        </span>
      </div>
    </Link>
  );
}

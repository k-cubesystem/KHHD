"use client";

import { motion } from "framer-motion";
import { Sparkles, User2, Hand, Home, Heart, Sun, Coins } from "lucide-react";
import type { AnalysisHistory, AnalysisCategory } from "@/app/actions/analysis-history";

interface CategoryTabsProps {
  records: AnalysisHistory[];
  selectedCategory: AnalysisCategory | "ALL";
  onCategoryChange: (category: AnalysisCategory | "ALL") => void;
}

type TabConfig = {
  value: AnalysisCategory | "ALL";
  label: string;
  icon: React.ElementType;
};

const tabs: TabConfig[] = [
  { value: "ALL", label: "전체", icon: Sparkles },
  { value: "SAJU", label: "사주", icon: Sun },
  { value: "FACE", label: "관상", icon: User2 },
  { value: "HAND", label: "손금", icon: Hand },
  { value: "FENGSHUI", label: "풍수", icon: Home },
  { value: "COMPATIBILITY", label: "궁합", icon: Heart },
  { value: "WEALTH", label: "재물", icon: Coins },
  { value: "TODAY", label: "오늘의운세", icon: Sun },
];

export function CategoryTabs({
  records,
  selectedCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  // 각 카테고리별 개수 계산
  const getCategoryCount = (category: AnalysisCategory | "ALL"): number => {
    if (category === "ALL") return records.length;
    return records.filter((r) => r.category === category).length;
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-ink-light/60 font-medium uppercase tracking-wide">
        카테고리
      </label>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab) => {
          const count = getCategoryCount(tab.value);
          const isActive = selectedCategory === tab.value;
          const Icon = tab.icon;

          // 개수가 0인 탭은 숨김 (전체 제외)
          if (count === 0 && tab.value !== "ALL") return null;

          return (
            <button
              key={tab.value}
              onClick={() => onCategoryChange(tab.value)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors
                ${
                  isActive
                    ? "text-primary"
                    : "text-ink-light/60 hover:text-ink-light"
                }
                ${isActive ? "bg-primary/10" : "bg-surface/30"}
                border ${isActive ? "border-primary/40" : "border-primary/20"}
                rounded-lg
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full
                ${
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-ink-light/10 text-ink-light/60"
                }
              `}
              >
                {count}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 border-2 border-primary rounded-lg"
                  transition={{ type: "spring", damping: 30, stiffness: 400 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { BookOpen, Sparkles, Coins, Zap } from "lucide-react";
import Link from "next/link";
import { FeatureGuard } from "@/components/feature-guard";
import { FeatureKey } from "@/hooks/use-feature-flag";

// Only for authenticated users
const DASH_TOOLS = [
    { label: "사주풀이", icon: BookOpen, href: "/protected/analysis", featureKey: "feat_saju_today" as FeatureKey },
    { label: "궁합", icon: Sparkles, href: "/protected/family", featureKey: "feat_saju_compat" as FeatureKey },
    { label: "재물운", icon: Coins, href: "/protected/saju/wealth", featureKey: "feat_saju_today" as FeatureKey },
    { label: "AI신당", icon: Zap, href: "/protected/ai-shaman", featureKey: "feat_saju_today" as FeatureKey },
];

export function DashboardGrid() {
    return (
        <section>
            <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-4 bg-ink-light/20 rounded-full" />
                <h2 className="text-xs font-bold text-ink-light/50 tracking-wide uppercase">My Tools</h2>
            </div>
            <div className="grid grid-cols-4 gap-3">
                {DASH_TOOLS.map((tool, idx) => (
                    <FeatureGuard key={idx} feature={tool.featureKey || 'feat_saju_today'} showLockIcon={false}>
                        <Link
                            href={tool.href}
                            className="flex flex-col items-center justify-center aspect-square bg-surface/20 border border-white/5 rounded-lg hover:bg-surface/40 hover:border-primary/30 transition-all group min-h-[80px] p-2 active:scale-95"
                        >
                            <tool.icon className="w-5 h-5 text-ink-light/50 mb-2 group-hover:text-primary transition-colors stroke-[1.2]" />
                            <span className="text-[10px] text-ink-light/70 group-hover:text-ink-light transition-colors tracking-tight">{tool.label}</span>
                        </Link>
                    </FeatureGuard>
                ))}
            </div>
        </section>
    );
}

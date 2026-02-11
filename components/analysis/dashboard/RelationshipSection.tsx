"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export function RelationshipSection() {
    const router = useRouter();

    return (
        <Card className="group relative overflow-hidden card-glass-manse transition-all duration-300 h-full min-h-[160px] flex flex-col justify-between p-5">
            {/* Hover Decor */}
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-rose-400" strokeWidth={1} />
                    </div>
                </div>

                <h3 className="text-lg font-serif font-light text-white mb-1">
                    관계의 매듭
                </h3>
                <p className="text-xs text-white/70 font-light leading-relaxed line-clamp-2">
                    갈등의 원인을 오행으로 풀어내는 관계 해법
                </p>
            </div>

            <div className="relative z-10 pt-2 flex justify-end">
                <Button
                    onClick={() => router.push('/protected/analysis/cheonjiin?tab=compatibility')}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-0 text-rose-400 hover:text-rose-300 hover:bg-transparent text-xs font-light"
                >
                    매듭 풀기 <ArrowRight className="w-3 h-3 ml-1" strokeWidth={1} />
                </Button>
            </div>
        </Card>
    );
}

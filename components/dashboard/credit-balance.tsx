"use client";

import { useEffect, useState } from "react";
import { getAvailableCredits } from "@/app/actions/payment-actions";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreditBalanceProps {
    className?: string;
    showLabel?: boolean;
}

export function CreditBalance({ className, showLabel = true }: CreditBalanceProps) {
    const [credits, setCredits] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshCredits = async () => {
        setIsLoading(true);
        try {
            const count = await getAvailableCredits();
            setCredits(count);
        } catch (error) {
            console.error("[CreditBalance] Fail:", error);
            setCredits(0);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshCredits();
    }, []);

    return (
        <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20",
            className
        )}>
            <Sparkles className={cn("w-4 h-4 text-primary", !isLoading && "animate-pulse")} />
            <div className="flex items-center gap-1.5">
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                    <span className="font-black text-primary tabular-nums text-sm">
                        {credits ?? 0}
                    </span>
                )}
                {showLabel && (
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Credits
                    </span>
                )}
            </div>
        </div>
    );
}

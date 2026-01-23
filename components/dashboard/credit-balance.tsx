"use client";

import { useEffect, useState } from "react";
import { getWalletBalance } from "@/app/actions/wallet-actions";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TalismanBalanceProps {
    className?: string;
    showLabel?: boolean;
}

export function CreditBalance({ className, showLabel = true }: TalismanBalanceProps) {
    const [talismans, setTalismans] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshBalance = async () => {
        setIsLoading(true);
        try {
            const count = await getWalletBalance();
            setTalismans(count);
        } catch (error) {
            console.error("[TalismanBalance] Fail:", error);
            setTalismans(0);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshBalance();
    }, []);

    return (
        <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/20",
            className
        )}>
            <span className="text-xl">🧧</span>
            <div className="flex items-center gap-1.5">
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                    <span className="font-black text-[#D4AF37] tabular-nums text-sm">
                        {talismans ?? 0}
                    </span>
                )}
                {showLabel && (
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        부적
                    </span>
                )}
            </div>
        </div>
    );
}

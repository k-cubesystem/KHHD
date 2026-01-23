"use client";

import { useEffect, useState } from "react";
import { getWalletBalance } from "@/app/actions/wallet-actions";
import { Button } from "./ui/button";
import Link from "next/link";
import { Loader2, Ticket } from "lucide-react";

export function TalismanBalance() {
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBalance();
    }, []);

    const loadBalance = async () => {
        try {
            const bal = await getWalletBalance();
            setBalance(bal);
        } catch (error) {
            console.error("Failed to load balance:", error);
            setBalance(0);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-zen-bg border border-zen-border">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-zen-gold" />
            </div>
        );
    }

    return (
        <Link href="/protected/billing">
            <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-white border border-zen-border hover:border-zen-gold cursor-pointer transition-all shadow-sm group"
            >
                <Ticket className="w-3.5 h-3.5 text-zen-gold group-hover:rotate-12 transition-transform" />
                <span className="font-serif font-bold text-zen-text text-sm">{balance || 0}</span>
            </div>
        </Link>
    );
}

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function LiveMemberCounter() {
    const [count, setCount] = useState(12403);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        // Random increment every 3-7 seconds
        const interval = setInterval(() => {
            setCount(prev => prev + 1);
        }, 4500);

        return () => clearInterval(interval);
    }, []);

    // Format number with commas
    const formattedCount = count.toLocaleString();

    if (!isClient) return <span className="font-bold">12,403</span>; // SSR fallback

    return (
        <span className={cn("font-bold tabular-nums transition-all duration-300")}>
            {formattedCount}
        </span>
    );
}

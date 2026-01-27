"use client";

import { Agentation } from "agentation";
import { useEffect, useState } from "react";

export function AgentationWrapper() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (process.env.NODE_ENV !== "development") {
        return null;
    }

    if (!mounted) return null;

    return <Agentation />;
}

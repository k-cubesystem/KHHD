"use client";

import { Suspense } from "react";
import { TodayFortuneContent } from "./today-fortune-content";

export default function TodayFortunePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        }>
            <TodayFortuneContent />
        </Suspense>
    );
}

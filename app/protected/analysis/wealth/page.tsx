"use client";

import { Suspense } from "react";
import { WealthAnalysisContent } from "./wealth-analysis-content";

export default function WealthAnalysisPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        }>
            <WealthAnalysisContent />
        </Suspense>
    );
}

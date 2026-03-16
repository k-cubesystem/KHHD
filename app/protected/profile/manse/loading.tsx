import { Skeleton } from "@/components/ui/skeleton";
import { ScrollText } from "lucide-react";

export default function Loading() {
    return (
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
            {/* Header */}
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/10 border border-gold-500/20">
                    <ScrollText className="w-4 h-4 text-gold-500 animate-pulse" />
                    <span className="text-xs font-bold text-gold-500 uppercase tracking-wider">Manse-ryok Pro</span>
                </div>
                <Skeleton className="h-12 w-64 mx-auto" />
                <Skeleton className="h-6 w-96 mx-auto" />
            </div>

            {/* Member Selector */}
            <div className="flex justify-center">
                <Skeleton className="h-10 w-64" />
            </div>

            {/* Birth Info Card */}
            <Skeleton className="h-24 w-full rounded-2xl" />

            {/* Four Pillars Card */}
            <Skeleton className="h-96 w-full rounded-2xl" />

            {/* Wuxing Distribution */}
            <Skeleton className="h-80 w-full rounded-2xl" />

            {/* Additional Cards */}
            <div className="space-y-6">
                <Skeleton className="h-64 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        </div>
    );
}

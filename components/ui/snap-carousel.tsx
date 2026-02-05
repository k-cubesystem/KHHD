"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SnapCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    itemWidth?: string; // e.g., "w-[85%]" or "w-[300px]"
    snapAlign?: "start" | "center" | "end";
}

export function SnapCarousel({
    children,
    className,
    itemWidth = "w-[85%]",
    snapAlign = "center",
    ...props
}: SnapCarouselProps) {
    return (
        <div
            className={cn(
                "flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-4 no-scrollbar -mx-6",
                className
            )}
            {...props}
        >
            {React.Children.map(children, (child) => (
                <div
                    className={cn(
                        "flex-none snap-always",
                        snapAlign === "center" && "snap-center",
                        snapAlign === "start" && "snap-start",
                        snapAlign === "end" && "snap-end",
                        itemWidth
                    )}
                >
                    {child}
                </div>
            ))}

            {/* Spacer for end padding */}
            <div className="flex-none w-2" />
        </div>
    );
}

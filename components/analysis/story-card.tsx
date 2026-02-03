"use client";

import { motion } from "framer-motion";
import { ArrowRight, LucideIcon } from "lucide-react";
import Link from "next/link";

export interface StoryCardProps {
    title: string;
    story: string; // Main emotional copy
    tagline: string; // Call-to-action tagline
    icon: LucideIcon;
    href?: string;
    onClick?: (e: React.MouseEvent) => void;
    visual?: {
        gradient?: string;
        image?: string;
        color?: string;
    };
    isGuest?: boolean;
}

export function StoryCard({
    title,
    story,
    tagline,
    icon: Icon,
    href,
    onClick,
    visual,
    isGuest = false,
}: StoryCardProps) {
    const cardContent = (
        <motion.div
            className="group relative bg-surface/50 backdrop-blur-md border border-primary/20 rounded-xl p-6 md:p-8 hover:border-primary/50 hover:bg-surface/70 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 min-h-[220px] flex flex-col overflow-hidden"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Visual Background Layer */}
            {visual && (
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                    {visual.gradient && (
                        <div
                            className="w-full h-full"
                            style={{ background: visual.gradient }}
                        />
                    )}
                    {visual.image && (
                        <div
                            className="w-full h-full bg-cover bg-center"
                            style={{ backgroundImage: `url(${visual.image})` }}
                        />
                    )}
                </div>
            )}

            {/* Noise Texture Overlay */}
            <div className="absolute inset-0 opacity-5 mix-blend-overlay pointer-events-none rounded-xl">
                <div
                    className="w-full h-full"
                    style={{
                        backgroundImage:
                            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")',
                        backgroundRepeat: "repeat",
                    }}
                />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full">
                {/* Icon */}
                <Icon
                    className="w-10 h-10 md:w-12 md:h-12 text-primary mb-4"
                    strokeWidth={1.5}
                />

                {/* Title */}
                <h3 className="text-xl md:text-2xl font-serif font-bold text-ink-light mb-3">
                    {title}
                </h3>

                {/* Story (Emotional Copy) */}
                <p className="text-sm md:text-base text-ink-light/70 font-light leading-relaxed mb-4 flex-grow">
                    {story}
                </p>

                {/* Tagline (CTA) */}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-primary/10">
                    <span className="text-sm font-serif text-primary italic">
                        {tagline}
                    </span>

                    {/* Guest Badge or Arrow */}
                    {isGuest ? (
                        <div className="inline-flex items-center gap-2 text-xs text-primary/70 font-medium">
                            <span>로그인 필요</span>
                            <ArrowRight className="w-3 h-3" />
                        </div>
                    ) : (
                        <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    )}
                </div>
            </div>
        </motion.div>
    );

    // Wrap in Link if href is provided
    if (href && !onClick) {
        return (
            <Link href={href} className="block">
                {cardContent}
            </Link>
        );
    }

    // Use onClick handler
    return (
        <div onClick={onClick} className="cursor-pointer">
            {cardContent}
        </div>
    );
}

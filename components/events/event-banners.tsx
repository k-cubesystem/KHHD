"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface EventBanner {
  id: string;
  title: string;
  description: string;
  cta_text: string;
  cta_link: string;
  icon: string;
  background_color: string;
  priority: number;
}

interface EventBannersProps {
  banners: EventBanner[];
}

export function EventBanners({ banners }: EventBannersProps) {
  if (!banners || banners.length === 0) return null;

  // priority 순으로 정렬
  const sortedBanners = [...banners].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-3">
      {sortedBanners.map((banner, idx) => (
        <motion.div
          key={banner.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <Link href={banner.cta_link}>
            <div
              className="relative overflow-hidden rounded-lg border border-primary/20 p-4 backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-[0_0_20px_rgba(236,182,19,0.2)]"
              style={{
                background: `linear-gradient(135deg, ${banner.background_color}15, ${banner.background_color}05)`
              }}
            >
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-50" />

              <div className="relative flex items-center gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 text-4xl">
                  {banner.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-ink-light mb-1">
                    {banner.title}
                  </h3>
                  <p className="text-xs text-ink-light/60 line-clamp-1">
                    {banner.description}
                  </p>
                </div>

                {/* CTA Arrow */}
                <div className="flex-shrink-0">
                  <div className="flex items-center gap-1 text-xs font-bold text-primary">
                    <span className="hidden sm:inline">{banner.cta_text}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

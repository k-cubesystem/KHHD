"use client";

import { motion } from "framer-motion";

export function OrbBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Primary Orb - Gold */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-0 left-1/2 w-96 h-96 bg-gold-500/20 blur-[100px] rounded-full"
      />
      
      {/* Secondary Orb - Wood */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute bottom-0 right-1/4 w-80 h-80 bg-zen-wood/15 blur-[120px] rounded-full"
      />
    </div>
  );
}
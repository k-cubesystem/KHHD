"use client";

export function OrbBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Primary Orb - Gold — CSS animation */}
      <div
        className="absolute top-0 left-1/2 w-96 h-96 bg-gold-500/20 blur-[100px] rounded-full anim-orb-gold"
        style={{ animation: 'orb-pulse-gold 8s ease-in-out infinite' }}
      />

      {/* Secondary Orb - Wood — CSS animation */}
      <div
        className="absolute bottom-0 right-1/4 w-80 h-80 bg-zen-wood/15 blur-[120px] rounded-full anim-orb-wood"
        style={{ animation: 'orb-pulse-wood 10s ease-in-out 2s infinite' }}
      />
    </div>
  );
}

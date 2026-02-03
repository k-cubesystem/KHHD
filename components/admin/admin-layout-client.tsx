"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Database,
  Bell,
  ArrowLeft,
  Sparkles,
  Menu,
  X,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, any> = {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Database,
  Bell,
  Sparkles,
};

interface MenuItem {
  href: string;
  label: string;
  icon: string;
}

interface AdminLayoutClientProps {
  children: React.ReactNode;
  menuItems: MenuItem[];
}

export function AdminLayoutClient({ children, menuItems }: AdminLayoutClientProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-ink-light font-sans relative flex flex-col w-full max-w-[480px] mx-auto shadow-2xl overflow-hidden selection:bg-primary/30">
      {/* Background Texture */}
      <div className="hanji-overlay" />

      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-primary/20">
        {/* Branding Row */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-surface border border-primary/30 flex items-center justify-center font-serif font-black text-primary shadow-sm">
              海
            </div>
            <div>
              <div className="font-serif font-bold text-ink-light flex items-center gap-2 text-base">
                <Shield className="w-4 h-4 text-seal" />
                해화당 Admin
              </div>
              <div className="text-[10px] text-ink-light/40 tracking-widest font-sans">
                SYSTEM CONTROL
              </div>
            </div>
          </div>

          <Link href="/protected">
            <button className="p-2 -mr-2 text-ink-light/50 hover:text-primary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </Link>
        </div>

        {/* Horizontal Scrollable Menu */}
        <div className="w-full overflow-x-auto no-scrollbar border-b border-white/5 bg-surface/30">
          <div className="flex px-4 min-w-max pb-0.5">
            {menuItems.map((item) => {
              const Icon = ICON_MAP[item.icon] || Sparkles;
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 px-4 py-3 min-w-[72px] relative group transition-all",
                    isActive ? "opacity-100" : "opacity-50 hover:opacity-80"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-xl transition-all duration-300",
                    isActive ? "bg-primary text-background shadow-lg scale-110" : "text-ink-light bg-transparent group-hover:bg-white/5"
                  )}>
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-sans font-bold whitespace-nowrap transition-colors",
                    isActive ? "text-primary" : "text-ink-light"
                  )}>
                    {item.label}
                  </span>

                  {/* Active Indicator Line */}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-t-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 p-6 pb-24">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>

    </div>
  );
}

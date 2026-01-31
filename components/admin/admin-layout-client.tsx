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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background text-ink-light font-sans relative overflow-hidden">
      {/* Background Texture */}
      <div className="hanji-overlay" />

      {/* Desktop Sidebar - Midnight in Cheongdam Theme */}
      <aside className="w-64 border-r border-primary/20 bg-surface/30 backdrop-blur-md hidden md:flex flex-col z-30 shadow-xl relative">
        {/* Top Decoration */}
        <div className="h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

        {/* Header */}
        <div className="p-6 border-b border-primary/20">
          <Link href="/protected" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-surface border border-primary/30 flex items-center justify-center font-serif font-black text-primary group-hover:bg-primary group-hover:text-background transition-all">
              海
            </div>
            <div>
              <div className="font-serif font-bold text-ink-light flex items-center gap-2">
                <Shield className="w-4 h-4 text-seal" />
                해화당 Admin
              </div>
              <div className="text-[10px] text-ink-light/60 group-hover:text-primary transition-colors flex items-center gap-1 font-sans mt-0.5">
                <ArrowLeft className="w-2.5 h-2.5" /> 서비스로 돌아가기
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = ICON_MAP[item.icon] || Sparkles;
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 relative group",
                  isActive
                    ? "text-primary bg-primary/10 border-l-2 border-primary"
                    : "text-ink-light/70 hover:text-primary hover:bg-surface/50 border-l-2 border-transparent"
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                <span className="font-serif">{item.label}</span>

                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute right-3 w-1 h-1 bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-primary/20">
          <div className="px-4 py-3 bg-surface/30 border border-primary/10">
            <div className="text-xs text-ink-light/50 font-mono mb-1">Admin System</div>
            <div className="text-[10px] text-primary font-bold tracking-widest">v2.0 MIDNIGHT</div>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 w-72 bg-surface/95 backdrop-blur-md border-r border-primary/20 z-50 md:hidden transition-transform duration-300 shadow-2xl",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Top Decoration */}
        <div className="h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

        {/* Header */}
        <div className="p-6 border-b border-primary/20 flex items-center justify-between">
          <Link href="/protected" className="flex items-center gap-3 group" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-10 h-10 bg-surface border border-primary/30 flex items-center justify-center font-serif font-black text-primary">
              海
            </div>
            <div>
              <div className="font-serif font-bold text-ink-light flex items-center gap-2">
                <Shield className="w-4 h-4 text-seal" />
                해화당 Admin
              </div>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 hover:bg-surface/50 transition-colors"
          >
            <X className="w-5 h-5 text-ink-light/70" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = ICON_MAP[item.icon] || Sparkles;
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 relative",
                  isActive
                    ? "text-primary bg-primary/10 border-l-2 border-primary"
                    : "text-ink-light/70 hover:text-primary hover:bg-surface/50 border-l-2 border-transparent"
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                <span className="font-serif">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-primary/20">
          <Link href="/protected" onClick={() => setMobileMenuOpen(false)}>
            <div className="px-4 py-3 bg-surface/30 border border-primary/10 hover:border-primary/30 transition-colors cursor-pointer text-center">
              <div className="text-xs text-ink-light/70 font-sans flex items-center justify-center gap-2">
                <ArrowLeft className="w-3 h-3" />
                서비스로 돌아가기
              </div>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative z-10">
        {/* Mobile Header */}
        <header className="sticky top-0 h-16 border-b border-primary/20 bg-background/90 backdrop-blur-md flex items-center justify-between px-4 md:hidden z-20">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 hover:bg-surface/50 transition-colors"
          >
            <Menu className="w-6 h-6 text-ink-light" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-seal" />
            <span className="font-serif font-bold text-ink-light">해화당 ADMIN</span>
          </div>
          <div className="w-10" />
        </header>

        {/* Content Area */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}

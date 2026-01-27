import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Database,
  Bell,
  ArrowLeft,
  Sparkles,
  Crown
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Middleware에서 이미 체크하지만, Double Check for Safety
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect("/protected");
  }

  const menuItems = [
    { href: "/admin", label: "대시보드", icon: LayoutDashboard },
    { href: "/admin/users", label: "회원 관리", icon: Users },
    { href: "/admin/payments", label: "결제 내역", icon: CreditCard },
    { href: "/admin/membership/plans", label: "스토어 관리", icon: Package },
    { href: "/admin/notifications", label: "알림 및 자동화", icon: Bell },
    { href: "/admin/prompts", label: "AI 프롬프트 관리", icon: Sparkles },
    { href: "/admin/database", label: "데이터베이스", icon: Database },
  ];

  return (

    <div className="flex min-h-screen bg-background text-foreground bg-hanji relative overflow-hidden">

      {/* Sidebar - Oriental Style */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col z-20 shadow-sm">
        <div className="p-6 border-b border-border">
          <Link href="/protected" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center font-serif font-black text-primary-foreground group-hover:bg-primary/80 transition-colors">
              H
            </div>
            <div>
              <div className="font-serif font-bold text-foreground">해화당 Admin</div>
              <div className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1 font-sans">
                <ArrowLeft className="w-2 h-2" /> 서비스로 돌아가기
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted transition-all duration-200"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="px-4 py-2 text-xs text-muted-foreground font-mono">
            Admin System v1.0
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative z-10">
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur flex items-center px-6 md:hidden">
          {/* Mobile Header (Simplified) */}
          <div className="font-serif font-bold text-foreground">해화당 ADMIN</div>
        </header>
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Database,
  ArrowLeft
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
    { href: "/admin/products", label: "상품(가격) 관리", icon: Package },
    { href: "/admin/database", label: "데이터베이스", icon: Database },
  ];

  return (
    <div className="flex min-h-screen bg-zen-bg text-zen-text bg-hanji relative overflow-hidden">

      {/* Sidebar - Zen Style */}
      <aside className="w-64 border-r border-zen-border bg-white hidden md:flex flex-col z-20 shadow-sm">
        <div className="p-6 border-b border-zen-border">
          <Link href="/protected" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-sm bg-zen-wood flex items-center justify-center font-serif font-black text-white group-hover:bg-zen-gold transition-colors">
              H
            </div>
            <div>
              <div className="font-serif font-bold text-zen-text">해화당 Admin</div>
              <div className="text-[10px] text-zen-muted group-hover:text-zen-wood transition-colors flex items-center gap-1 font-sans">
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
              className="flex items-center gap-3 px-4 py-3 rounded-sm text-sm font-medium text-zen-text/70 hover:text-zen-wood hover:bg-zen-bg transition-all duration-200"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zen-border">
          <div className="px-4 py-2 text-xs text-zen-muted font-mono">
            Admin System v1.0
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative z-10">
        <header className="h-16 border-b border-zen-border bg-white/80 backdrop-blur flex items-center px-6 md:hidden">
          {/* Mobile Header (Simplified) */}
          <div className="font-serif font-bold text-zen-text">해화당 ADMIN</div>
        </header>
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}

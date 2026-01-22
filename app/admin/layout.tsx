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
    <div className="flex min-h-screen bg-[#050505] text-white relative overflow-hidden">
      {/* Background Orbs for TUI Effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#D4AF37]/5 rounded-full blur-[150px] animate-pulse"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#D4AF37]/3 rounded-full blur-[120px] animate-pulse"
          style={{ animationDuration: '12s', animationDelay: '2s' }}
        />
      </div>

      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-[#0A0A0A] hidden md:flex flex-col">
        <div className="p-6 border-b border-white/10">
          <Link href="/protected" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#D4AF37] to-[#8C6D1F] flex items-center justify-center font-serif font-black text-[#0A0A0A]">
              H
            </div>
            <div>
              <div className="font-bold text-[#D4AF37]">해화당 Admin</div>
              <div className="text-[10px] text-muted-foreground group-hover:text-white transition-colors">서비스로 돌아가기 &rarr;</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-[#D4AF37] hover:bg-white/5 transition-all duration-200"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="px-4 py-2 text-xs text-white/40">
            Admin System v1.0
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b border-white/10 flex items-center px-6 md:hidden">
          {/* Mobile Header (Simplified) */}
          <div className="font-bold">해화당 ADMIN</div>
        </header>
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { User, ScrollText, Users, Map, Cloud, Sparkles, BookOpen, Clock, Settings, CreditCard, ChevronRight } from "lucide-react";
import Marquee from "@/components/ui/marquee";

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Handle Guest Logic
  const masterName = user?.email?.split('@')[0] || "Guest";
  const isGuest = !user;

  const menuGroups = [
    {
      title: "Essential Tools",
      items: [
        { label: "운명 분석", sub: "Fate Analysis", href: isGuest ? "/auth/sign-up" : "/protected/analysis", icon: Cloud, span: "col-span-1" },
        { label: "정통 만세력", sub: "Manse-ryok", href: isGuest ? "/auth/sign-up" : "/protected/profile/manse", icon: ScrollText, span: "col-span-1" },
      ]
    },
    {
      title: "Deep Insight",
      items: [
        { label: "풍수 지리", sub: "Feng Shui", href: isGuest ? "/auth/sign-up" : "/protected/saju/fengshui", icon: Map, span: "col-span-1" },
        { label: "관상 분석", sub: "Face Reading", href: isGuest ? "/auth/sign-up" : "/protected/saju/face", icon: User, span: "col-span-1" },
      ]
    },
    {
      title: "Personal Space",
      items: [
        { label: "마이 아카이브", sub: "My Profile & History", href: isGuest ? "/auth/sign-up" : "/protected/profile", icon: BookOpen, span: "col-span-2" },
        { label: "인연 관리", sub: "Relationships", href: isGuest ? "/auth/sign-up" : "/protected/relationships", icon: Users, span: "col-span-2" },
      ]
    },
  ];

  return (
    <div className="relative min-h-[90vh] w-full bg-hanji text-ink overflow-auto pb-20">

      {/* Top Banner: Marquee */}
      <div className="w-full bg-ink/5 border-y border-ink/10 py-3 overflow-hidden backdrop-blur-sm sticky top-0 z-30">
        <Marquee pauseOnHover className="[--duration:30s]">
          <span className="mx-8 font-gungseo text-sm text-ink/60 tracking-[0.2em]">운명의 결을 읽는 시간, 청담해화당</span>
          <span className="mx-8 font-playfair text-xs text-cinnabar/80 tracking-[0.2em] uppercase">Private VVIP Service</span>
          <span className="mx-8 font-gungseo text-sm text-ink/60 tracking-[0.2em]">당신의 서사를 잇다</span>
          <span className="mx-8 font-playfair text-xs text-gold-600/80 tracking-[0.2em] uppercase">Premium Fortune Engineering</span>
        </Marquee>
      </div>

      {/* Header Section */}
      <div className="px-6 py-8 space-y-2">
        <h1 className="font-gungseo text-3xl font-bold text-ink-texture">
          {masterName}<span className="text-lg font-light opacity-50">님,</span>
        </h1>
        <p className="font-sans text-xs text-ink/40 tracking-widest uppercase pb-2">Welcome to your sanctuary</p>
        <div className="h-px w-12 bg-cinnabar" />
      </div>

      {/* Grid Menu (App Style) */}
      <div className="px-6 max-w-md mx-auto lg:max-w-4xl">

        <div className="space-y-10">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-4">
              <h2 className="text-[10px] font-sans font-bold tracking-[0.3em] text-ink/30 uppercase pl-1">{group.title}</h2>
              <div className="grid grid-cols-2 gap-4">
                {group.items.map((item, itemIdx) => (
                  <Link
                    key={itemIdx}
                    href={item.href}
                    className={`
                            relative group overflow-hidden bg-white border border-ink/5 rounded-[2px] p-5 
                            shadow-sm hover:shadow-md hover:border-gold-400/50 transition-all duration-300
                            flex flex-col justify-between h-32
                            ${item.span === "col-span-2" ? "col-span-2" : "col-span-1"}
                          `}
                  >
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gold-50/0 group-hover:bg-gold-50/30 transition-colors duration-300" />

                    <div className="flex justify-between items-start z-10">
                      <div className="w-8 h-8 rounded-full bg-ink/5 flex items-center justify-center text-ink/50 group-hover:text-cinnabar group-hover:bg-cinnabar/10 transition-colors">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <ChevronRight className="w-3 h-3 text-ink/20 group-hover:text-gold-500 transition-colors" />
                    </div>

                    <div className="z-10 mt-auto">
                      <h3 className="font-gungseo text-lg font-bold text-ink group-hover:text-ink-texture transition-colors">{item.label}</h3>
                      <p className="font-playfair text-[10px] text-ink/40 uppercase tracking-wider group-hover:text-gold-600 transition-colors">{item.sub}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer / Logout Area */}
        <div className="mt-12 pt-8 border-t border-ink/5 text-center">
          <p className="font-gungseo text-xs text-ink/30">海花堂 VVIP Membership</p>
        </div>

      </div>

    </div>
  );
}
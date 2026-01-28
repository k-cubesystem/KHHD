import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import {
    ChevronLeft,
    Settings,
    Star,
    ArrowRight,
    Calendar,
    Droplets,
    Flame,
    Bell,
    Shield,
    Headphones,
    User as UserIcon
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default async function MyPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/auth/login");
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // Fallback display name
    const displayName = profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Guest";

    return (
        <div className="min-h-screen w-full bg-background text-ink-light font-sans selection:bg-primary/30 pb-20 overflow-x-hidden relative">
            <div className="hanji-overlay" />

            {/* Header */}
            <header className="flex items-center justify-between px-6 py-5 sticky top-0 bg-background/90 backdrop-blur-md z-50 border-b border-primary/20">
                <Link href="/protected" className="p-1 -ml-1 hover:bg-surface/10 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6 text-ink-light/90" />
                </Link>
                <h1 className="text-sm font-serif tracking-[0.2em] text-ink-light/90 uppercase">My Page</h1>
                <Link href="/protected/settings" className="p-1 -mr-1 hover:bg-surface/10 rounded-full transition-colors">
                    <Settings className="w-5 h-5 text-ink-light/60" />
                </Link>
            </header>

            {/* Profile Section */}
            <section className="flex flex-col items-center pt-10 pb-10 animate-in fade-in slide-in-from-bottom-5 duration-700 relative z-10">
                {/* Avatar */}
                <div className="relative mb-6 group cursor-pointer">
                    <div className="w-28 h-28 rounded-full border-2 border-primary/20 overflow-hidden bg-surface flex items-center justify-center shadow-lg group-hover:border-primary/50 transition-colors">
                        {/* Placeholder for Avatar Image */}
                        <span className="font-serif text-4xl text-primary">{displayName[0]}</span>
                    </div>
                    {/* Star Badge */}
                    <div className="absolute bottom-1 right-1 bg-primary text-background rounded-full p-1.5 shadow-lg border-2 border-background group-hover:scale-110 transition-transform">
                        <Star className="w-3.5 h-3.5 fill-current" />
                    </div>
                </div>

                {/* Name & Tier */}
                <h2 className="text-2xl font-serif text-ink-light mb-3 tracking-wide">{displayName}</h2>
                <div className="flex items-center gap-3">
                    <div className="h-px w-8 bg-primary/30" />
                    <span className="text-primary text-[10px] tracking-[0.3em] uppercase font-bold">VVIP Member</span>
                    <div className="h-px w-8 bg-primary/30" />
                </div>
            </section>

            {/* Stats Row */}
            <section className="px-6 mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100 relative z-10">
                <div className="bg-surface/10 border border-primary/10 rounded-2xl p-6 grid grid-cols-3 divide-x divide-primary/10 backdrop-blur-sm shadow-xl">
                    {/* Stat Items */}
                    <div className="flex flex-col items-center gap-1.5 hover:bg-surface/10 transition-colors rounded-lg py-1">
                        <span className="text-xl font-serif text-ink-light font-medium">12</span>
                        <span className="text-[9px] text-ink-light/40 tracking-widest uppercase font-bold">Readings</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 hover:bg-surface/10 transition-colors rounded-lg py-1">
                        <span className="text-xl font-serif text-ink-light font-medium">4</span>
                        <span className="text-[9px] text-ink-light/40 tracking-widest uppercase font-bold">Saved</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5 hover:bg-surface/10 transition-colors rounded-lg py-1">
                        <span className="text-xl font-serif text-primary font-medium">Gold</span>
                        <span className="text-[9px] text-ink-light/40 tracking-widest uppercase font-bold">Tier</span>
                    </div>
                </div>
            </section>

            {/* Recent Consultations */}
            <section className="px-6 mb-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200 relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-bold tracking-widest text-ink-light/50 uppercase">Recent Consultations</h3>
                    <Link href="#" className="text-[10px] text-primary tracking-wider font-bold hover:text-ink-light transition-colors">VIEW ALL</Link>
                </div>

                <div className="space-y-4">
                    {/* Completed Card */}
                    <Link href="#" className="block group">
                        <div className="bg-surface/5 border border-primary/10 rounded-xl p-5 flex items-center justify-between hover:bg-surface/10 hover:border-primary/20 transition-all duration-300">
                            <div>
                                <span className="inline-block px-2 py-0.5 bg-primary/20 text-primary text-[9px] font-bold rounded-sm mb-2 uppercase tracking-wide">Completed</span>
                                <h4 className="text-base font-serif text-ink-light/90 mb-1 group-hover:text-primary transition-colors">2026 Annual Destiny</h4>
                                <p className="text-[10px] text-ink-light/40">Jan 14, 2026 • Master Lee</p>
                            </div>
                            <div className="w-8 h-8 rounded-full border border-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary group-hover:text-background text-ink-light/50 transition-all">
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                    {/* Scheduled Card */}
                    <Link href="#" className="block group">
                        <div className="bg-surface/5 border border-primary/10 rounded-xl p-5 flex items-center justify-between hover:bg-surface/10 hover:border-primary/20 transition-all duration-300">
                            <div>
                                <span className="inline-block px-2 py-0.5 bg-surface/20 text-ink-light/60 text-[9px] font-bold rounded-sm mb-2 uppercase tracking-wide">Scheduled</span>
                                <h4 className="text-base font-serif text-ink-light/90 mb-1">Career Path Insight</h4>
                                <p className="text-[10px] text-ink-light/40">Feb 22, 2026 • Master Park</p>
                            </div>
                            <div className="w-8 h-8 rounded-full border border-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-background text-ink-light/50 transition-all">
                                <Calendar className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>
                </div>
            </section>

            {/* Saved Destiny Results */}
            <section className="px-6 mb-12 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 relative z-10">
                <h3 className="text-xs font-bold tracking-widest text-ink-light/50 uppercase mb-6">Saved Destiny Results</h3>
                <div className="grid grid-cols-2 gap-4">
                    {/* Water Card */}
                    <div className="bg-surface/5 border border-primary/10 rounded-xl p-5 aspect-[4/3] flex flex-col justify-between hover:bg-surface/10 hover:border-primary/20 transition-all cursor-pointer group">
                        <Droplets className="w-6 h-6 text-primary/70 group-hover:text-primary transition-colors" />
                        <div>
                            <h4 className="font-serif text-ink-light/90 text-sm mb-1 group-hover:text-primary transition-colors">The Flow of Water</h4>
                            <p className="text-[9px] text-ink-light/30">Saved 2 days ago</p>
                        </div>
                    </div>
                    {/* Fire Card */}
                    <div className="bg-surface/5 border border-primary/10 rounded-xl p-5 aspect-[4/3] flex flex-col justify-between hover:bg-surface/10 hover:border-primary/20 transition-all cursor-pointer group">
                        <Flame className="w-6 h-6 text-primary/70 group-hover:text-primary transition-colors" />
                        <div>
                            <h4 className="font-serif text-ink-light/90 text-sm mb-1 group-hover:text-primary transition-colors">Passion & Career</h4>
                            <p className="text-[9px] text-ink-light/30">Saved 1 month ago</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Settings Menu */}
            <section className="px-6 mb-16 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-500 relative z-10">
                <div className="space-y-1">
                    {/* Notifications */}
                    <div className="flex items-center justify-between p-4 hover:bg-surface/10 rounded-lg transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <Bell className="w-5 h-5 text-ink-light/50 group-hover:text-ink-light transition-colors" />
                            <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">Notifications</span>
                        </div>
                        <Switch id="notify" className="data-[state=checked]:bg-primary" />
                    </div>

                    {/* Privacy */}
                    <Link href="/policy/privacy" className="flex items-center justify-between p-4 hover:bg-surface/10 rounded-lg transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <Shield className="w-5 h-5 text-ink-light/50 group-hover:text-ink-light transition-colors" />
                            <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">Privacy & Security</span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-ink-light/30 rotate-180 group-hover:text-ink-light transition-colors" />
                    </Link>

                    {/* Support */}
                    <Link href="/support" className="flex items-center justify-between p-4 hover:bg-surface/10 rounded-lg transition-colors cursor-pointer group">
                        <div className="flex items-center gap-4">
                            <Headphones className="w-5 h-5 text-ink-light/50 group-hover:text-ink-light transition-colors" />
                            <span className="text-sm text-ink-light/80 group-hover:text-ink-light font-light">Support</span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-ink-light/30 rotate-180 group-hover:text-ink-light transition-colors" />
                    </Link>
                </div>
            </section>

            {/* Logout */}
            <div className="text-center animate-in fade-in duration-1000 delay-700 relative z-10">
                <LogoutButton
                    variant="ghost"
                    className="text-ink-light/30 text-[10px] tracking-[0.2em] hover:text-ink-light hover:bg-transparent transition-colors uppercase font-serif"
                >
                    Log Out
                </LogoutButton>
            </div>

        </div>
    );
}

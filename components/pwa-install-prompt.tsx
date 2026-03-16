"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Monitor, Smartphone, X } from "lucide-react";
import { toast } from "sonner";

/** BeforeInstallPromptEvent -- not yet in lib.dom.d.ts */
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
    prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Device Detection
        const userAgent = window.navigator.userAgent.toLowerCase();
        const mobile = /iphone|ipad|ipod|android|blackberry|windows phone/g.test(userAgent);
        const ios = /iphone|ipad|ipod/.test(userAgent);

        setIsMobile(mobile);
        setIsIOS(ios);

        // Check if already installed
        const isApp = window.matchMedia('(display-mode: standalone)').matches;
        if (isApp) return;

        // Chrome/Android Install Prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Show prompt only if not dismissed recently (could use localStorage)
            setIsVisible(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // Determine if we should show iOS guide (since iOS doesn't support beforeinstallprompt)
        if (ios && !isApp) {
            // iOS doesn't support programmatic install prompts, 
            // usually we show a specific guide "Tap Share -> Add to Home Screen"
            // For now, we will handle this via specific UI
            setIsVisible(true);
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            toast.info("화면 하단의 '공유' 버튼을 누르고 '홈 화면에 추가'를 선택하세요.", {
                duration: 5000,
                icon: <Smartphone className="w-5 h-5" />
            });
            return;
        }

        if (!deferredPrompt) {
            // Fallback if prompt is missing but user clicked button
            toast.error("설치 기능이 지원되지 않는 브라우저입니다.");
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
            toast.success("앱이 설치되었습니다!");
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
            <div className="mx-auto max-w-md bg-zinc-900/90 backdrop-blur-md border border-gold-500/30 p-4 rounded-xl shadow-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-gold-500/20 p-2 rounded-lg">
                        {isMobile ? (
                            <Smartphone className="w-6 h-6 text-gold-500" />
                        ) : (
                            <Monitor className="w-6 h-6 text-gold-500" />
                        )}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">
                            {isMobile ? "해화당 앱 설치하기" : "PC 버전 설치하기"}
                        </h3>
                        <p className="text-xs text-zinc-400">
                            {isMobile
                                ? "홈 화면에 추가하여 더 빠르게 이용하세요"
                                : "바탕화면에 바로가기를 만들어보세요"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        onClick={handleInstallClick}
                        className="bg-gold-500 hover:bg-gold-300 text-black font-bold h-9 px-4"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        {isIOS ? "안내" : "설치"}
                    </Button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>
            </div>
        </div>
    );
}

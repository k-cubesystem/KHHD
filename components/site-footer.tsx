import Link from "next/link";

export function SiteFooter() {
    return (
        <footer className="w-full max-w-[480px] mx-auto border-t border-primary/10 bg-background py-8 text-sm text-ink-light/60">
            {/* Brand */}
            <div className="px-6 mb-6 text-center">
                <h3 className="text-base font-serif font-bold text-primary mb-2">해화당 (海華堂)</h3>
                <p className="text-xs leading-relaxed text-ink-light/50">
                    전통 명리학과 AI 기술의 만남
                </p>
            </div>

            {/* Links */}
            <div className="px-6 mb-6 flex justify-center gap-4 text-xs">
                <Link href="/terms" className="hover:text-primary transition-colors">
                    이용약관
                </Link>
                <span className="text-ink-light/30">|</span>
                <Link href="/privacy" className="hover:text-primary transition-colors">
                    개인정보처리방침
                </Link>
            </div>

            {/* Company Info */}
            <div className="px-6 mb-6 text-center space-y-1 text-[10px] text-ink-light/40">
                <p>큐브시스템 | 대표: 박대건</p>
                <p>사업자등록번호: 205-16-69546</p>
                <p>통신판매업신고: 제 2024-의정부흥선-0264호</p>
                <p className="pt-1">경기도 의정부시 신촌로 39번길 50-20</p>
            </div>

            {/* CS Center */}
            <div className="px-6 mb-6 text-center space-y-1 text-[10px] text-ink-light/40">
                <p>고객센터: 평일 10:00 - 18:00 (주말/공휴일 휴무)</p>
                <p>문의: 카카오톡채널 | 전화: 010-2311-2010</p>
            </div>

            {/* Copyright */}
            <div className="text-center text-[9px] text-ink-light/30 border-t border-primary/5 pt-6">
                Copyright © 2026 Haehwadang AI. All rights reserved.
            </div>
        </footer>
    );
}

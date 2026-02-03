import Link from "next/link";

export function SiteFooter() {
    return (
        <footer className="w-full border-t border-border bg-background py-12 text-sm text-muted-foreground">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Brand */}
                <div className="space-y-4">
                    <h3 className="text-lg font-serif font-bold text-primary">해화당 (海華堂)</h3>
                    <p className="text-xs leading-relaxed">
                        전통 명리학과 현대 AI 기술의 만남.<br />
                        당신의 운명을 공학적으로 분석하고 해답을 제시합니다.
                    </p>
                </div>

                {/* Sitemap */}
                <div className="space-y-4">
                    <h4 className="font-bold text-foreground">서비스</h4>
                    <ul className="space-y-2 text-xs">
                        <li><Link href="/protected/saju/today" className="hover:text-primary">오늘의 운세</Link></li>
                        <li><Link href="/protected/saju/detail" className="hover:text-primary">정통 사주 분석</Link></li>
                        <li><Link href="/protected/saju/compatibility" className="hover:text-primary">AI 궁합 분석</Link></li>
                        <li><Link href="/protected/saju/face" className="hover:text-primary">관상 성형 (개운)</Link></li>
                    </ul>
                </div>

                {/* Company Info */}
                <div className="space-y-4">
                    <h4 className="font-bold text-foreground">사업자 정보</h4>
                    <ul className="space-y-2 text-xs">
                        <li>큐브시스템</li>
                        <li>대표: 박대건</li>
                        <li>사업자등록번호: 205-16-69546</li>
                        <li>통신판매업신고: 제 2024-의정부흥선-0264호</li>
                        <li>주소: 경기도 의정부시 신촌로 39번길 50-20</li>
                    </ul>
                </div>

                {/* CS Center */}
                <div className="space-y-4">
                    <h4 className="font-bold text-foreground">고객센터</h4>
                    <ul className="space-y-2 text-xs">
                        <li>운영시간: 평일 10:00 - 18:00 (주말/공휴일 휴무)</li>
                        <li>문의: 카카오톡채널문의</li>
                        <li>전화: 010-2311-2010</li>
                        <li className="pt-2">
                            <Link href="/terms" className="mr-4 hover:text-foreground underline">이용약관</Link>
                            <Link href="/privacy" className="hover:text-foreground underline">개인정보처리방침</Link>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="mt-8 text-center text-[10px] text-muted-foreground/60 w-full">
                Copyright © 2026 Haehwadang AI. All rights reserved.
            </div>
        </footer>
    );
}

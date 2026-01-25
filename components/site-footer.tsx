import Link from "next/link";

export function SiteFooter() {
    return (
        <footer className="w-full border-t border-white/5 bg-black py-12 text-sm text-zinc-400">
            <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Brand */}
                <div className="space-y-4">
                    <h3 className="text-lg font-serif font-bold text-[#D4AF37]">해화당 (海華堂)</h3>
                    <p className="text-xs leading-relaxed">
                        전통 명리학과 현대 AI 기술의 만남.<br />
                        당신의 운명을 공학적으로 분석하고 해답을 제시합니다.
                    </p>
                </div>

                {/* Sitemap */}
                <div className="space-y-4">
                    <h4 className="font-bold text-white">서비스</h4>
                    <ul className="space-y-2 text-xs">
                        <li><Link href="/protected/saju/today" className="hover:text-[#D4AF37]">오늘의 운세</Link></li>
                        <li><Link href="/protected/saju/detail" className="hover:text-[#D4AF37]">정통 사주 분석</Link></li>
                        <li><Link href="/protected/saju/compatibility" className="hover:text-[#D4AF37]">AI 궁합 분석</Link></li>
                        <li><Link href="/protected/destiny/face" className="hover:text-[#D4AF37]">관상 성형 (개운)</Link></li>
                    </ul>
                </div>

                {/* Company Info */}
                <div className="space-y-4">
                    <h4 className="font-bold text-white">사업자 정보</h4>
                    <ul className="space-y-2 text-xs">
                        <li>(주) 해화당</li>
                        <li>대표: 홍길동</li>
                        <li>사업자등록번호: 123-45-67890</li>
                        <li>통신판매업신고: 제 2026-서울종로-1234호</li>
                        <li>주소: 서울특별시 종로구 종로 1, 10층</li>
                    </ul>
                </div>

                {/* CS Center */}
                <div className="space-y-4">
                    <h4 className="font-bold text-white">고객센터</h4>
                    <ul className="space-y-2 text-xs">
                        <li>운영시간: 평일 10:00 - 18:00 (주말/공휴일 휴무)</li>
                        <li>이메일: support@haehwadang.com</li>
                        <li>전화: 1544-0000</li>
                        <li className="pt-2">
                            <Link href="/terms" className="mr-4 hover:text-white underline">이용약관</Link>
                            <Link href="/privacy" className="hover:text-white underline">개인정보처리방침</Link>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="mt-12 text-center text-[10px] text-zinc-600 border-t border-white/5 pt-8">
                Copyright © 2026 Haehwadang AI. All rights reserved.
            </div>
        </footer>
    );
}

import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="w-full max-w-[480px] mx-auto border-t border-primary/10 bg-background pt-6 pb-24 text-sm text-ink-light/60 px-5">
      <div className="grid grid-cols-2 gap-4">
        {/* Left Column: Brand & Company Info */}
        <div className="flex flex-col justify-between gap-3 text-left">
          {/* Brand */}
          <div>
            <h3 className="text-[14px] font-serif font-bold text-primary mb-0.5">
              해화당 (海華堂)
            </h3>
            <p className="text-[8px] leading-tight text-ink-light/50">
              전통 명리학과 AI 기술의 만남
            </p>
          </div>

          {/* Company Info */}
          <div className="space-y-0.5 text-[6px] text-ink-light/40 leading-tight">
            <p>큐브시스템 | 대표: 박대건</p>
            <p>사업자등록번호: 205-16-69546</p>
            <p>통신판매업신고: 제 2024-의정부흥선-0264호</p>
            <p>경기도 의정부시 신촌로 39번길 50-20</p>
          </div>
        </div>

        {/* Right Column: CS & Links */}
        <div className="flex flex-col justify-between items-end gap-3 text-right">
          {/* CS Center */}
          <div className="space-y-0.5 text-[6px] text-ink-light/40 leading-tight">
            <p className="font-semibold text-ink-light/60 mb-0.5">고객센터</p>
            <p>평일 10:00 - 18:00 (주말/공휴일 휴무)</p>
            <p>문의: 카카오톡채널</p>
            <p>전화: 010-2311-2010</p>
          </div>

          {/* Links */}
          <div className="flex gap-2 text-[7px]">
            <Link href="/terms" className="hover:text-primary transition-colors">
              이용약관
            </Link>
            <span className="text-ink-light/30">|</span>
            <Link href="/privacy" className="hover:text-primary transition-colors">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

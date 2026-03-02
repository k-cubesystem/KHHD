import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="w-full max-w-[480px] mx-auto pb-28">
      {/* 링크 바 */}
      <div className="flex items-center justify-center gap-4 py-4 border-t border-primary/10 mb-4">
        <Link href="/terms" className="text-[10px] text-ink-light/40 hover:text-primary transition-colors">
          이용약관
        </Link>
        <span className="w-px h-3 bg-primary/20" />
        <Link href="/privacy" className="text-[10px] text-ink-light/40 hover:text-primary transition-colors">
          개인정보처리방침
        </Link>
        <span className="w-px h-3 bg-primary/20" />
        <Link href="/protected/support" className="text-[10px] text-ink-light/40 hover:text-primary transition-colors">
          고객센터
        </Link>
        <span className="w-px h-3 bg-primary/20" />
        <Link href="/business" className="text-[10px] text-ink-light/40 hover:text-primary transition-colors">
          기업 도입
        </Link>
      </div>

      {/* 브랜드 + 사업자 정보 */}
      <div className="px-5 space-y-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[13px] font-serif text-primary/70">해화당 (海華堂)</h3>
          <p className="text-[9px] text-ink-light/30">전통 명리학 × AI</p>
        </div>

        <div className="text-[9px] text-ink-light/25 leading-relaxed space-y-0.5">
          <p>큐브시스템 · 대표 박대건 · 사업자 205-16-69546</p>
          <p>통신판매업 제 2024-의정부흥선-0264호</p>
          <p>경기도 의정부시 신촌로 39번길 50-20</p>
          <p>📞 010-2311-2010 · 평일 10:00–18:00 (주말·공휴일 휴무)</p>
        </div>

        <p className="text-[8px] text-ink-light/20 pt-1">© 2026 해화당. All rights reserved.</p>
      </div>
    </footer>
  )
}

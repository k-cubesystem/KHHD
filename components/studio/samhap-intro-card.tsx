'use client'

import { AmbientVideo } from '@/components/shared/AmbientVideo'

/**
 * 종합사주풀이 소개 카드 — 대작 카드 문법(앰비언트 영상·한자 라벨·세리프 헤드라인·명언·단청).
 *
 * 페이지(`app/protected/studio/samhap/page.tsx`)의 요건 확인 단계 맨 위에 앉는다.
 * 값을 받지 않는 순수 표현부라, 로그인·요건 조회 없이 `/dev-preview/samhap-intro` 가
 * 그대로 세워 찍는다 — 영상 위 글씨 가독(CEO 「글이 안 보여」)이 여기서 갈린다.
 */
export function SamhapIntroCard() {
  return (
    <div
      className="relative overflow-hidden rounded-xl hanji-card dancheong-border-top"
      style={{
        background: 'linear-gradient(165deg, #170C0E 0%, #241014 45%, #120909 100%)',
        boxShadow: '0 12px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(201,168,76,0.07)',
      }}
    >
      <AmbientVideo
        id="journey-bok"
        rate={0.5}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.3, mixBlendMode: 'screen' }}
      />
      {/* 텍스트 가독용 하단 그라데이션 */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(18,9,9,0.45) 0%, rgba(18,9,9,0.72) 55%, rgba(18,9,9,0.88) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute right-0 bottom-0 select-none pointer-events-none font-serif text-gold-500"
        style={{ fontSize: '11rem', lineHeight: 1, opacity: 0.04, fontWeight: 700, transform: 'translate(12%, 18%)' }}
      >
        복
      </div>
      <div className="relative z-10 px-6 py-7 flex flex-col gap-4">
        <p className="text-[10px] font-serif tracking-[0.5em] text-gold-500/50">복 주 머 니 다 섯</p>
        <h2
          className="text-[1.35rem] font-serif font-bold leading-[1.45] text-ink-light tracking-tight"
          style={{ wordBreak: 'keep-all' }}
        >
          네 기운이 <span className="text-gold-500">같은 말을 하는 지점</span>을
          <br />
          하나의 풀이로 엮어드립니다
        </h2>
        <p className="text-[11px] italic font-serif text-gold-500/40 leading-relaxed">
          &ldquo;다섯 주머니가 가득할 때, 기운이 정점에 오릅니다&rdquo;
        </p>
        <div className="dancheong-divider" />
        {/* 「이미 모였습니다」는 재료가 없는 사람에게 거짓이 된다 — 통합 입구가 되면서
            재료 0 인 사람도 이 카드를 본다(CEO 2026-08-22 사주·종합 통합). */}
        <p
          className="text-[12px] text-ink-light/50 font-sans font-light leading-relaxed"
          style={{ wordBreak: 'keep-all' }}
        >
          하늘의 기운(사주), 사람의 기운(관상·손금), 터의 기운(풍수). 넷이 모이면 새 사진 촬영 없이,
          저장된 네 분석을 겹쳐 종합사주풀이 한 권으로 정리합니다.
        </p>
      </div>
    </div>
  )
}

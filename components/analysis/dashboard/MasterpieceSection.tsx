'use client'

import { ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AmbientVideo } from '@/components/shared/AmbientVideo'

/**
 * 허브의 대작 카드 — **종합사주풀이의 메인 입구**(CEO 2026-08-22).
 *
 * «사주만 따로 있고 종합사주 따로 있고 이렇게 있을 필요가 없어. 두 가지 내용을 합쳐서
 * 종합사주풀이를 메인 기획으로 가줘.» 그래서 이 카드는 `cheonjiin`(사주 단독)이 아니라
 * 통합 입구(`/protected/studio/samhap`)로 간다. 그 화면이 재료 상태를 보고 갈린다 —
 * 재료가 없으면 거기서 「사주풀이부터 시작하기」가 주 행동으로 뜬다.
 *
 * 🔴 헤드라인 「태어난 순간 새겨진 / 당신만의 운명의 지도를 / 펼쳐드립니다」는 CEO 가 문구를
 *    명시한 자리다. 카피를 다듬을 때도 이 세 줄은 건드리지 않는다.
 */
const SAMHAP_ENTRANCE = '/protected/studio/samhap'

export function MasterpieceSection() {
  const router = useRouter()

  return (
    <div
      onClick={() => router.push(SAMHAP_ENTRANCE)}
      className="relative overflow-hidden rounded-xl cursor-pointer group hanji-card dancheong-border-top"
      style={{
        background: 'linear-gradient(160deg, #0e0b07 0%, #16140F 50%, #0a0807 100%)',
        boxShadow: '0 12px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(201,168,76,0.07)',
      }}
    >
      {/* 앰비언트 배경 영상 — 흐르는 먹·금가루. 없으면 폴백(기존 그라디언트 유지), reduced-motion 존중 */}
      <AmbientVideo
        id="analysis-ambient"
        rate={0.5}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.16, mixBlendMode: 'screen' }}
      />

      {/* 「명」 워터마크 — 화면에 한자를 쓰지 않는다(2026-08-22 정정, 구 命). */}
      <div
        aria-hidden="true"
        className="absolute right-0 bottom-0 select-none pointer-events-none font-serif text-gold-500"
        style={{
          fontSize: '16rem',
          lineHeight: 1,
          opacity: 0.03,
          fontWeight: 700,
          transform: 'translate(15%, 15%)',
        }}
      >
        명
      </div>

      {/* 앰비언트 글로우 (도장 레드) */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: '-40%',
          right: '-20%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(158,43,43,0.08) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }}
      />

      {/* 콘텐츠 */}
      <div className="relative z-10 px-6 py-7 flex flex-col gap-4">
        {/* 라벨 — 한글로만 적는다(구 「天 地 人 · 四 柱 八 字」). */}
        <p className="text-[10px] font-serif tracking-[0.5em] text-gold-500/50">
          천 지 인 · 사 주 팔 자
        </p>

        {/* 헤드라인 */}
        <h2
          className="text-[1.4rem] font-serif font-bold leading-[1.4] text-ink-light tracking-tight"
          style={{ wordBreak: 'keep-all' }}
        >
          태어난 순간 새겨진
          <br />
          당신만의{' '}
          <span className="text-gold-500">운명의 지도</span>를
          <br />
          펼쳐드립니다
        </h2>

        {/* 명언 */}
        <p className="text-[11px] italic font-serif text-gold-500/40 leading-relaxed">
          &ldquo;하늘의 뜻을 알면, 땅 위의 길이 보인다&rdquo;
        </p>

        {/* 단청 구분선 */}
        <div className="dancheong-divider" />

        {/* 서브 카피 — 이 카드가 «종합사주풀이의 메인 입구»임이 읽혀야 한다(CEO 08-22 통합). */}
        <p
          className="text-[12.5px] leading-[1.8] font-light text-ink-light/50"
          style={{ wordBreak: 'keep-all' }}
        >
          사주에서 시작해 관상·손금·풍수까지,
          <br />
          <span className="text-ink-light/70">네 기운이 같은 말을 하는 지점</span>을
          <br />
          청담해화당이 한 권으로 엮어드립니다.
        </p>

        {/* CTA 버튼 (도장 스타일) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            router.push(SAMHAP_ENTRANCE)
          }}
          className="tap-glow-gold relative overflow-hidden w-full h-13 rounded-sm group/btn hover:scale-[1.01] border border-seal/[0.5] bg-seal"
          style={{
            boxShadow: '3px 3px 0 0 rgba(158,43,43,0.3)',
          }}
        >
          {/* 시머 */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out"
            style={{
              background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.15) 50%, transparent 65%)',
            }}
          />

          <span className="relative z-10 flex items-center justify-center gap-2.5 py-3.5">
            <span className="text-[14px] font-serif font-bold tracking-[0.15em] text-white">
              종합사주풀이 시작하기
            </span>
            <ArrowRight
              className="w-4 h-4 text-white/80 group-hover/btn:translate-x-0.5 transition-transform duration-300"
              strokeWidth={2}
            />
          </span>
        </button>

        {/* 여정 연결 — 재료가 없어도 헛걸음이 아님을 미리 알린다(통합 입구가 갈라 준다) */}
        <p className="text-[10.5px] text-ink-light/40 font-light text-center -mt-1.5">
          처음이시라면 사주풀이부터 — 「나의 복주머니」 첫 칸에 담깁니다
        </p>
      </div>
    </div>
  )
}

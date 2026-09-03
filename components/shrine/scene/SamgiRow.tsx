'use client'

/**
 * 삼기(三旗) 앞줄 — 뽑힌 세 기가 **차례로** 나와 펼쳐지는 자리.
 *
 * ObangkiSheet 에서 떼어낸 이유는 순전히 **검증 가능성**이다. 시트는 서버 액션을 import 해
 * jsdom 에서 렌더할 수 없는데, 이 줄에는 아래 구조 불변식이 걸려 있어 눈이 아니라 테스트가
 * 지켜야 한다(__tests__/SamgiRow.test.tsx).
 *
 * ⚠️ **불변식: 물린 기(.obangki-purified)는 .obangki-samgi 의 자손이면 안 된다.**
 *    .obangki-samgi 는 `both` 채우기라 지연 구간 내내 0% 키프레임(opacity:0)을 유지한다.
 *    부정풀이는 바로 그 지연 동안 일어나므로, 물린 기를 그 안에 두면 흩어지는 장면이 통째로
 *    투명해져 **아무 일도 없었던 것처럼 보인다** — 콘솔도 테스트도 조용한 채로 연출만 죽는,
 *    이 프로젝트가 반복해 맞은 무증상 사망 그대로다.
 *    그래서 바깥 칸은 정적으로 두고 **안쪽 칸만** 늦게 올라온다.
 *
 * 순서는 setTimeout 체인이 아니라 --ob-delay 가 준다(국면 전환과 같은 규율).
 */

import { OBANGKI_COLOR_INFO, OBANGKI_MS, OBANGKI_SAMGI_STEP_MS, type ObangkiColor } from '@/lib/domain/ritual/obangki'
import { SAMGI_SLOT_INFO, samgiOrder, type SamgiReading } from '@/lib/domain/ritual/obangki-reading'

/** 이 회차가 부정풀이를 거쳤으면 그만큼 전부 뒤로 밀린다(물린 기가 흩어질 시간). */
export function purifyLeadMs(reading: SamgiReading): number {
  return reading.draw.purified ? OBANGKI_MS.purify : 0
}

/**
 * 마지막 기의 자리 번호 — 이 기가 펴지는 순간이 곧 「셈이 끝난 때」다.
 *
 * 종전에는 두루마리를 지연(scrollDelayMs)으로 띄웠는데, 지연 구간 동안 **보이지 않는 카드가
 * 클릭을 받아** 신당으로 튕기는 원인이 됐다. 이제 이 번호의 animationend 가 마운트를 몬다 —
 * 시각을 두 곳에서 세지 않으므로 어긋날 자리도 없다.
 */
export const SAMGI_LAST_INDEX = 2

/**
 * 천의 결 — 기폭을 세로 띠로 자르는 규격.
 * 왼쪽 POLE_PCT 는 깃대라 가만히 있고, 나머지를 CLOTH_STRIPS 띠로 잘라 깃대에서 멀수록 크게·늦게 흔든다.
 * 그러면 파도가 깃대에서 바깥 변으로 지나간다 — 스프라이트 게임의 천 리그와 같은 수법이다.
 * 띠는 STRIP_OVERLAP 만큼 겹친다(경계에 실금이 서지 않게).
 */
const POLE_PCT = 8
const CLOTH_STRIPS = 5
const STRIP_PCT = (100 - POLE_PCT) / CLOTH_STRIPS
const STRIP_OVERLAP = 0.6
/** 띠 번호 k 의 진폭(px)·기울기(deg)·박자 지연(ms) — 깃대 쪽이 작고 빠르다 */
const WAVE_AMP_PX = 1.05
const WAVE_SHEAR_DEG = 0.55
const WAVE_LAG_MS = 140

/**
 * 기 한 폭의 창 하나 — 창은 넘침을 자르고, 안쪽에 기 전체를 창 폭 대비로 키워 -left 만큼 밀어 넣는다.
 * k=0 은 깃대(정지), k≥1 은 천(물결).
 */
function FlagStrip({
  left,
  width,
  k,
  baseDelayMs,
  image,
}: {
  left: number
  width: number
  k: number
  baseDelayMs: number
  image: React.CSSProperties
}) {
  const wave =
    k > 0
      ? ({
          '--ob-amp': `${(k * WAVE_AMP_PX).toFixed(2)}px`,
          '--ob-shear': `${(k * WAVE_SHEAR_DEG).toFixed(2)}deg`,
          '--ob-delay': `${baseDelayMs + k * WAVE_LAG_MS}ms`,
        } as React.CSSProperties)
      : undefined
  return (
    <span
      aria-hidden
      className={`absolute bottom-0 top-0 block overflow-hidden ${k > 0 ? 'obangki-wave' : ''}`}
      style={{ left: `${left}%`, width: `${width}%`, ...wave }}
    >
      <span
        className="absolute bottom-0 top-0 block"
        style={{
          left: `-${((left / width) * 100).toFixed(3)}%`,
          width: `${((100 / width) * 100).toFixed(3)}%`,
          ...image,
        }}
      />
    </span>
  )
}

/**
 * 펼쳐진 기 한 폭 — 말린 기와 달리 색·인장이 드러난다.
 *
 * 두 겹인 이유: 펼침(.obangki-unfurl, 유한)과 펄럭임(.obangki-flutter, 무한)이 **같은 요소의
 * transform 을 두고 다투기 때문**이다(CEO 8차d: "조금 펄럭이는 효과가 있으면 좋겠어").
 * 한 요소에 둘을 얹으면 뒤엣것이 앞엣것을 지워 펼침이 통째로 사라진다 — 바깥이 펄럭이고 안이 펴진다.
 * 펄럭임은 펼침이 끝나는 박자에 시작하도록 같은 지연을 쓴다.
 *
 * 그 안에서 천은 세로 띠 다섯으로 잘려 결을 따라 물결친다(2026-09-04, FlagStrip) —
 * 한 장이 통째로 기울던 것(«종이쪼가리»)을 천처럼 움직이게 한 것이 이번 개편의 핵심이다.
 */
export function UnfurledFlag({ color, size, delayMs }: { color: ObangkiColor; size: number; delayMs: number }) {
  const info = OBANGKI_COLOR_INFO[color]
  const waveBase = delayMs + 400
  // 에셋이 없어도(404) 기폭 자리에 오방색 면이 남는다 — 깃대·자루 자리까지 칠하지는 않는다
  const image: React.CSSProperties = {
    backgroundImage: `url('/shrine/ritual/obangki-${color}.webp'), linear-gradient(${info.hex},${info.hex})`,
    backgroundSize: '100% 100%, 94% 54%',
    backgroundPosition: 'left top, right top',
    backgroundRepeat: 'no-repeat, no-repeat',
  }
  const strips = [{ left: 0, width: POLE_PCT + STRIP_OVERLAP, k: 0 }]
  for (let k = 1; k <= CLOTH_STRIPS; k += 1) {
    const left = POLE_PCT + (k - 1) * STRIP_PCT
    strips.push({ left, width: Math.min(100 - left, STRIP_PCT + STRIP_OVERLAP), k })
  }
  // 인장은 가운데 띠(3)와 같은 박자로 흔들린다 — 천은 물결치는데 글자만 붙박이면 스티커로 보인다
  const sealK = Math.ceil(CLOTH_STRIPS / 2)
  return (
    <span
      aria-hidden
      className="obangki-flutter block"
      style={{ '--ob-delay': `${waveBase}ms` } as React.CSSProperties}
    >
      <span
        aria-hidden
        className="obangki-unfurl relative block"
        style={{
          // 1:1 — 에셋(512×512)과 같은 비. 어긋나면 깃발 천이 늘어나 붓결이 뭉갠다.
          // 실물 오방기는 기폭 가로(70cm)와 깃대 길이(72cm)가 거의 같아 외곽이 정사각이다.
          width: size,
          height: size,
          animationDelay: `${delayMs}ms`,
          // 상자가 아니라 깃발 실루엣을 따라 그림자가 지도록 — 정사각 상자의 빈 아랫쪽까지
          // 빛나면 유령 사각형이 보인다
          filter: `drop-shadow(0 6px 9px rgba(0,0,0,0.8)) drop-shadow(0 0 7px ${info.accent}66)`,
        }}
      >
        {strips.map((s) => (
          <FlagStrip key={s.k} left={s.left} width={s.width} k={s.k} baseDelayMs={waveBase} image={image} />
        ))}
        <span
          className="obangki-wave absolute inset-x-0 top-[18%] text-center font-serif text-[13px] font-bold"
          style={
            {
              color: 'rgba(28,20,12,0.72)',
              '--ob-amp': `${(sealK * WAVE_AMP_PX).toFixed(2)}px`,
              '--ob-shear': `${(sealK * WAVE_SHEAR_DEG).toFixed(2)}deg`,
              '--ob-delay': `${waveBase + sealK * WAVE_LAG_MS}ms`,
            } as React.CSSProperties
          }
        >
          {info.seal}
        </span>
      </span>
    </span>
  )
}

/** 기 한 폭의 변(px) — 88 칸 안에 여백을 남긴다. */
const FLAG_SIZE = 62

export function SamgiRow({
  reading,
  onFlagShown,
  onPurify,
}: {
  reading: SamgiReading
  /** 기 하나가 다 펴진 순간 — 화면이 그 자리에서 색을 터뜨린다(파티클도 연출이 몬다) */
  onFlagShown?: (index: number) => void
  /** 물린 기가 흩어지기 시작한 순간 — 연기·바람 소리는 여기서 난다(타이머가 아니라 연출이 몬다) */
  onPurify?: () => void
}) {
  const lead = purifyLeadMs(reading)
  return (
    <div className="absolute inset-x-0 bottom-1 flex items-end justify-center gap-2" data-samgi-row>
      {samgiOrder(reading.draw).map(({ slot, color }, i) => {
        const info = OBANGKI_COLOR_INFO[color]
        const delay = lead + i * OBANGKI_SAMGI_STEP_MS
        return (
          // 바깥 칸은 정적이다 — 파일 머리의 불변식 참고(물린 기가 지연 구간에 투명해지지 않게)
          <span key={slot} className="relative flex flex-col items-center" style={{ width: 88 }}>
            {slot === 'seat' && reading.draw.purified && (
              <span
                className="obangki-purified absolute left-1/2 top-5"
                style={{ marginLeft: -FLAG_SIZE / 2 }}
                data-purified
                onAnimationStart={(e) => {
                  if (e.target === e.currentTarget && e.animationName === 'obangkiPurify') onPurify?.()
                }}
              >
                <UnfurledFlag color={reading.draw.purified} size={FLAG_SIZE} delayMs={0} />
              </span>
            )}
            <span
              className="obangki-samgi flex w-full flex-col items-center"
              style={{ '--ob-delay': `${delay}ms` } as React.CSSProperties}
              onAnimationEnd={(e) => {
                if (e.target !== e.currentTarget || e.animationName !== 'obangkiSamgiRise') return
                onFlagShown?.(i)
              }}
            >
              <span className="mb-1 font-serif text-[9.5px] tracking-[0.18em] text-gold-500/70">
                {SAMGI_SLOT_INFO[slot].title}
              </span>
              <UnfurledFlag color={color} size={FLAG_SIZE} delayMs={delay} />
              <span className="mt-1 font-serif text-[10px] font-bold" style={{ color: info.accent }}>
                {info.label}
              </span>
            </span>
          </span>
        )
      })}
    </div>
  )
}

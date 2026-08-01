/**
 * 창방 팻말(懸板) — 신당 벽에 걸린 의식 전용 페이지 진입점의 기하·문구 단일 출처.
 *
 * 좌표계가 특이하다: 팻말 위치는 화면 % 도 world 좌표도 아닌 **벽 무라 픽셀 좌표**(4096×640)다.
 * 이유는 무라가 그려지는 방식에 있다 —
 *   StageLayers 는 벽 무라를 `.absolute.inset-x-0.top-0.h-[62%].w-full.object-cover` 로 그린다.
 *   띠 종횡비(= 3.2·방폭 / 0.62·방높이)는 기기마다 다르고 무라는 6.4:1 고정이라, cover 배율과
 *   가로 크롭 폭이 방 종횡비를 따라 **매번 달라진다**. 그래서 world 좌표에 팻말을 못박으면
 *   기기가 바뀔 때 팻말만 제자리에 남고 벽이 미끄러진다
 *   (실측: 기준 방 520×620 ↔ 폰 380×607 사이에서 같은 창이 world 96.8 ↔ 75.5 로 21 단위 = 약 110px 이동).
 *
 * 그래서 팻말은 무라와 **같은 cover 변환**을 타게 만든다. 배율 s = max(띠폭/4096, 띠높이/640) 는
 * CSS 컨테이너 질의 단위로 그대로 쓸 수 있고(app/shrine-scene.css `.shrine-plaque`),
 * 여기서는 그 식에 넣을 **무라 중심 기준 오프셋**만 내려보낸다. JS 측정도 리사이즈 구독도 없다.
 *
 * ⚠️ 이 값들은 반가(banga) 벽 무라 한 장에 매인 좌표다. 다른 테마(레거시 room.webp·다른 벽지)에는
 *    이 창이 없으므로 팻말을 걸지 않는다 — 그 판정이 `hasPlaqueWall()` 이다.
 */

/** 팻말을 걸 수 있는 벽 — 반가 와이드 무라. 이 벽지가 아니면 창 위치를 알 수 없다. */
export const PLAQUE_WALL_URL = '/shrine/stage/banga/room-wall-mural.webp'

/** 무라 원본 규격(px). CSS 의 cover 배율 식과 짝이다 — 한쪽만 바뀌면 팻말이 벽에서 떨어진다. */
export const PLAQUE_WALL_PX = { w: 4096, h: 640 } as const

/** 빈 널 스프라이트 (scripts/shrine-assets/ritual-plaque.mjs 산출). 글자는 DOM 이 얹는다. */
export const PLAQUE_SPRITE_URL = '/shrine/ritual/plaque.webp'

/**
 * 널 한 장의 무라 좌표계 크기·세로 위치.
 *  - `w`/`h`  120×48 — 창방(윗인방 y94 ~ 아랫인방 y168, 두께 74) 안에 위아래 13px 여유로 들어간다.
 *
 *    ⚠️ 175×70 → 140×56 → **120×48**. 팻말이 2개 → 3개 → **4개**가 될 때마다 줄었다.
 *       비율 2.5:1 은 그대로 유지한다 — 널 스프라이트를 `background-size:100% 100%` 로 늘려 쓰므로
 *       비율이 달라지면 몰딩과 놋쇠 못이 찌그러진다.
 *  - `cy` 131 — 그 띠의 한가운데. 세로는 방 종횡비와 무관하게 방 높이 9.1~16.3% 로 고정된다
 *    (띠 높이도 배율도 방 높이에 비례하므로 세로만은 기기 불변이다).
 */
export const PLAQUE_BOX = { w: 120, h: 48, cy: 131 } as const

/** 방을 떠나지 않고 그 자리에서 여는 의식 — 팻말이 페이지가 아니라 시트를 켠다. */
export type PlaqueSheet = 'aekmak'

interface PlaqueBase {
  key: string
  /** 널에 새길 한글 (본문) */
  ko: string
  /** 널 윗줄 한자 — 장식. 자간을 위해 공백을 넣어 둔다 */
  hanja: string
  ariaLabel: string
  /** 무라 픽셀 x (칸 중심). 화면에서는 무라와 같은 배율로 따라간다 */
  cx: number
}

/**
 * 팻말이 하는 일은 둘 중 하나다 — 판별 유니온이라 둘 다 들거나 둘 다 비는 상태가 타입에서 막힌다.
 *  - `page`  전용 페이지로 나간다(오방기·백일기도).
 *  - `sheet` **방 안에서** 시트를 연다. 액막이가 그렇다 — 촛불에서 불을 받아 부적을 태우는 의식이라
 *            불이 없는 곳으로 나가면 행위 자체가 성립하지 않는다.
 */
export type ShrinePlaque = PlaqueBase & ({ kind: 'page'; href: string } | { kind: 'sheet'; sheet: PlaqueSheet })

/**
 * 창방 띠에 네 장.
 *
 * ⚠️ **칸 정렬을 포기했다**(2026-08-01, 척전 합류). 종전 셋은 벽 무라의 칸 중심(1859·2012·2166,
 *    간격 153)에 맞춰 걸었는데, 그 격자로 넷째를 놓으려면 1693 또는 2319 여야 하고 **둘 다 좁은
 *    폰에서 잘린다**(가장 좁은 기기에서 널 중심이 설 수 있는 범위는 방 중심 ±264 = 1784~2312).
 *    창방은 창 위에 얹힌 **인방(가로 띠)**이라 널은 본디 칸이 아니라 띠에 거는 것이므로,
 *    칸 격자 대신 **방 중심 기준 균등 배치**(간격 130)로 바꿨다. 널을 120 으로 줄여 겹침도 없앴다.
 *
 * 순서는 **의식의 주기**다 — 왼쪽에서 오른쪽으로 호흡이 길어진다:
 *   엽전(하루 10회) → 액막이(하루 3회) → 오방기(하루 3회·무겁다) → 백일기도(100일).
 */
export const SHRINE_PLAQUES: readonly ShrinePlaque[] = Object.freeze([
  {
    key: 'chuljeon',
    kind: 'page',
    href: '/protected/shrine/chuljeon',
    ko: '엽전',
    hanja: '擲 錢',
    ariaLabel: '엽전 세 닢으로 갈림길 정하러 가기',
    cx: 1853,
  },
  {
    key: 'aekmak',
    kind: 'sheet',
    sheet: 'aekmak',
    ko: '액막이',
    hanja: '厄 막 이',
    ariaLabel: '액막이 의식 열기',
    cx: 1983,
  },
  {
    key: 'obangki',
    kind: 'page',
    href: '/protected/shrine/obangki',
    ko: '오방기',
    hanja: '五 方 旗',
    ariaLabel: '오방기 점괘 보러 가기',
    cx: 2113,
  },
  {
    key: 'baekil',
    kind: 'page',
    href: '/protected/shrine/baekil',
    ko: '백일기도',
    hanja: '百 日 祈 禱',
    ariaLabel: '백일기도 보러 가기',
    cx: 2243,
  },
])

/** 무라 중심 기준 가로 오프셋(무라 px). CSS `--plq-dx` 로 나가 cover 배율과 곱해진다. */
export function plaqueOffsetX(cx: number): number {
  return Math.round(cx - PLAQUE_WALL_PX.w / 2)
}

/**
 * 띠에 한 번만 얹는 공용 기하 변수(무라 px, 단위 없음).
 *
 * 종전에는 널 크기·세로 위치가 CSS 에 175/70/189 로 박혀 있어 이 파일의 PLAQUE_BOX 와 **두 벌**이었다.
 * 팻말이 3개가 되며 크기가 바뀌자마자 그 이중화가 곧바로 문제가 됐다 — 한쪽만 고치면 널이 창방을
 * 벗어나는데 타입도 테스트도 잡아 주지 않는다. 그래서 값은 여기서만 정하고 CSS 는 곱하기만 한다.
 * (`--plq-dy` 는 무라 중심 기준 세로 오프셋 = cy − 무라높이/2.)
 */
export function plaqueBandVars(): { '--plq-w': number; '--plq-h': number; '--plq-dy': number } {
  return {
    '--plq-w': PLAQUE_BOX.w,
    '--plq-h': PLAQUE_BOX.h,
    '--plq-dy': PLAQUE_BOX.cy - PLAQUE_WALL_PX.h / 2,
  }
}

/** 이 벽지에 팻말을 걸 수 있는가 — 창 좌표를 아는 무라일 때만. */
export function hasPlaqueWall(wallpaperUrl: string | null | undefined): boolean {
  return wallpaperUrl === PLAQUE_WALL_URL
}

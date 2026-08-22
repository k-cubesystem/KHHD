/**
 * 「이달의 복」 매월 판(版) — 소재 로테이션 12개월 표와 생성 프롬프트(순수).
 *
 * 크론(`app/api/cron/wallpaper-monthly`)이 이 표에서 이번 달 소재를 꺼내 그림 한 장을 만든다.
 * 사람이 매달 손으로 갈아끼우던 자리를 대신하는 것이므로, **12개월이 빠짐없이 있어야** 한다
 * (단위테스트가 강제한다 — 한 달이라도 비면 그 달에 크론이 설 자리가 없다).
 *
 * 🔴 프롬프트 함정 2건 — `scripts/media-assets/generate-wallpapers.mjs` 의 실측 기록을 승계한다.
 *   ① «phone» · «lock screen» · «wallpaper» 라고 부르면 모델이 **잠금화면 목업**을 준다
 *      (시계 「12:03」과 전화·카메라 아이콘을 그려 넣었다, 2026-08-22). → 「세로 회화 한 점」으로 부른다.
 *   ② «art print» 는 **안쪽 금색 액자 테두리 + 매트 여백**을 부른다. → 네 변까지 꽉 찬다고 못 박는다.
 *   두 함정 모두 회귀 테스트가 프롬프트 문자열을 직접 훑어 막는다.
 */

/** 한 달치 소재 — 그 달의 계절감을 지는 한국 전통 소재. */
export interface MonthlyWallpaperMotif {
  /** 1~12. */
  month: number
  /** 사람이 읽는 이름(로그·검수용). 화면에는 쓰지 않는다 — 한자 금지 규율 대상. */
  name: string
  /** 그림 소재 서술(영문) — 프롬프트의 SUBJECT 절. */
  subject: string
}

/** 공통 화풍 — 해화당 다크·금 팔레트. 폰 아이콘이 얹히므로 어둡고 조용해야 한다. */
export const WALLPAPER_PROMPT_STYLE = [
  'A single vertical 9:16 painting, portrait orientation, much taller than wide.',
  'Korean traditional fine-art aesthetic rendered as a luxury modern painting:',
  'Joseon-dynasty motifs, hand-painted mineral pigment texture, subtle hanji paper grain.',
  'Very dark near-black ground (#0A0A08 to #16140F) filling most of the canvas.',
  'Thin antique gold (#C9A84C) linework and gold-leaf accents as the only bright element.',
  'The upper third is empty unbroken dark ground; the motif sits in the lower two thirds.',
  'Museum-quality, restrained, elegant, high detail, soft depth, no harsh highlights.',
].join(' ')

/** 금지 목록 — 글자·인물·목업·액자. 글자 금지는 두 번 말한다(모델이 현판으로 오해한다). */
export const WALLPAPER_PROMPT_NEGATIVE = [
  'ABSOLUTELY NO text, NO letters, NO Korean hangul, NO Chinese hanja characters, NO calligraphy,',
  'NO signage, NO seals with writing, NO watermark, NO logo, NO numbers, NO digits.',
  'The image contains no clock, no time display, and no app icons of any kind.',
  'NO people, NO faces, NO human figures, NO animals with faces.',
  'Not a photograph, not 3D render, not cartoon, no screen mockup, no device frame, no border.',
  'The painting bleeds off all four edges of the canvas; there is no inner frame,',
  'no mat, no matting margin, and no rectangular outline anywhere in the image.',
].join(' ')

/**
 * 12개월 소재 표. 절기와 세시 풍속을 따라간다.
 * 8월은 라이브에 나간 번들 판(자수 복주머니)과 같은 소재를 유지해 판이 갑자기 딴 그림이 되지 않게 한다.
 */
export const MONTHLY_WALLPAPER_MOTIFS: readonly MonthlyWallpaperMotif[] = [
  {
    month: 1,
    name: '설빛 — 눈 덮인 솔가지와 복조리',
    subject:
      'A near-black winter field. Snow-laden pine branches lean in from the lower edge, each needle cluster edged in fine gold. A woven bamboo bokjori (new-year fortune strainer) hangs from a gold cord, and a pale paper lantern glows cold behind falling snow. Blue-white snow washes over deep charcoal, restrained gold.',
  },
  {
    month: 2,
    name: '입춘 — 첫 매화 봉오리',
    subject:
      'A deep charcoal field. A single gnarled plum branch rises from the lower left, its bark drawn in gold, bearing a handful of pale ivory blossoms and tight buds. Thin meltwater ripples catch gold light at the very bottom. Ink-wash grays with the faintest warm blush.',
  },
  {
    month: 3,
    name: '봄볕 — 진달래와 실버들',
    subject:
      'A dark moss-and-black field. A slope of azalea (jindallae) blossoms in muted rose spreads across the lower third, outlined in gold. Slender willow withes trail down from the upper right in long gold strokes. Soft spring haze between them, deep green washes.',
  },
  {
    month: 4,
    name: '꽃비 — 벚꽃 흩날림',
    subject:
      'A deep plum-black field. A heavy cherry bough crosses the lower half, its blossoms rendered in pale blush with gold-outlined petals. Loose petals drift upward through the dark ground like slow snow, some catching gold leaf. Night-garden depth, faint mist.',
  },
  {
    month: 5,
    name: '단오 — 창포와 모란',
    subject:
      'A deep oxblood field. Broad iris (changpo) leaves rise in gold-edged blades from the lower edge; beside them one full peony blooms in deep crimson with heavy gold-thread veining. A single swing rope of twisted gold cord descends from above and disappears. Rich lacquer-red washes.',
  },
  {
    month: 6,
    name: '녹음 — 청보리밭과 대발',
    subject:
      'A dark forest-black field. Rows of green barley ears bend together across the lower third, each awn a thin gold line. Above, a rolled bamboo blind hangs partly lowered, its slats drawn as fine parallel gold rules. Deep emerald and pine washes, still summer air.',
  },
  {
    month: 7,
    name: '연꽃 — 빗방울 든 연잎',
    subject:
      'A deep ink-blue field. Large round lotus leaves float across the lower half, their rims edged in gold, beads of rain gathering at the centers as small gold points. One lotus blossom opens pale above them. Fine slanting rain drawn as sparse gold threads. Midnight teal washes.',
  },
  {
    month: 8,
    name: '복주머니 — 자수 비단 주머니와 엽전',
    subject:
      'A deep oxblood-and-black field. An embroidered silk bokjumeoni (Korean fortune pouch) hangs at center-lower, its drawstring tassels falling long, stitched with gold thread in a lotus pattern. Around it, square-holed brass coins and fine gold dust drift upward. A late-summer full moon glows faintly behind. Rich crimson silk sheen, heavy gold embroidery.',
  },
  {
    month: 9,
    name: '한가위 — 보름달과 송편, 억새',
    subject:
      'A near-black autumn field. A large harvest full moon hangs low in warm ivory. Below it, plumes of silver-grass (eoksae) sway across the lower third in pale gold strokes, and a small stack of half-moon songpyeon rice cakes rests on a lacquered dish edged in gold. Deep umber and slate washes.',
  },
  {
    month: 10,
    name: '단풍 — 붉은 잎과 홍시',
    subject:
      'A deep russet-black field. Maple branches reach in from the upper right, their lobed leaves in burnt vermilion outlined with gold. From a bare persimmon bough at the lower left hang two ripe persimmons, glowing amber. Scattered fallen leaves drift below. Rust and ember washes.',
  },
  {
    month: 11,
    name: '서리 — 서리 내린 국화',
    subject:
      'A cold charcoal field. A cluster of chrysanthemums stands at the lower center, petals in muted ivory and dull gold, their edges rimed with pale frost. Dry reeds lean behind them in thin gold lines. A low frost mist pools at the bottom. Steel-gray and bone washes, sparse gold.',
  },
  {
    month: 12,
    name: '설매 — 눈 속의 매화와 화로',
    subject:
      'A deep midnight field. Snow falls in fine pale flecks across the whole canvas. A plum branch in bloom crosses the lower half, blossoms ivory against dark bark drawn in gold. Below it a small brazier glows, its ember light warming the snow in a narrow gold pool. Indigo-black and ash washes.',
  },
]

/** 그 달의 소재. 1~12 밖의 값은 12로 나눈 나머지로 감아 항상 한 장을 돌려준다. */
export function monthlyWallpaperMotif(month: number): MonthlyWallpaperMotif {
  const idx = (((Math.trunc(month) - 1) % 12) + 12) % 12
  const motif = MONTHLY_WALLPAPER_MOTIFS[idx]
  if (!motif) throw new Error(`이달의 복 소재 없음: ${month}`)
  return motif
}

/** 'YYYYMM' → 그 달의 생성 프롬프트. 화풍 + 소재 + 금지 목록을 한 덩이로 붙인다. */
export function buildMonthlyWallpaperPrompt(ym: string): string {
  const motif = monthlyWallpaperMotif(Number(ym.slice(4, 6)))
  return `${WALLPAPER_PROMPT_STYLE}\n\nSUBJECT: ${motif.subject}\n\n${WALLPAPER_PROMPT_NEGATIVE}`
}

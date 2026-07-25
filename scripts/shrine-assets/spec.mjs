// 신위/테마 이미지 제작 스펙 문서 생성기 (외부 제작 핸드오프용).
// manifest.mjs의 실제 프롬프트 로직을 그대로 사용 → 파이프라인과 정합.
// 실행: node scripts/shrine-assets/spec.mjs > TEAM_G_DESIGN/shrine-image-production-spec.md
import { DEITIES, EMOTIONS, STYLE_PREFIX, basePrompt } from './manifest.mjs'

// DB shrine_deities에서 확보한 한글명/한자/등급/도메인/accent
const META = {
  samsin:   { name: '삼신할매', hanja: '三神', tier: '수호신(무료)', domains: '자녀·출산·가정화목', accent: '#E8A0A0' },
  jowang:   { name: '조왕신',   hanja: '竈王', tier: '수호신(무료)', domains: '건강·식복·집안평안', accent: '#D96C3F' },
  seongju:  { name: '성주신',   hanja: '城主', tier: '수호신(무료)', domains: '새출발·이사·가장운', accent: '#4A7C59' },
  teoju:    { name: '터주대감', hanja: '基主', tier: '수호신(무료)', domains: '재물안정·집터·부동산', accent: '#D4A017' },
  dongja:   { name: '동자신',   hanja: '童子', tier: '수호신(무료)', domains: '인연·소통·시험운', accent: '#6FA8DC' },
  seonnyeo: { name: '선녀신',   hanja: '仙女', tier: '수호신(무료)', domains: '애정·아름다움·예술', accent: '#5B8DBE' },
  daegam:   { name: '대감신',   hanja: '大監', tier: '명신(1복채)', domains: '재물증식·사업번창', accent: '#C9A84C' },
  dokkaebi: { name: '도깨비 대장', hanja: '', tier: '명신(1복채)', domains: '횡재·역전운·승부', accent: '#3FBF9F' },
  bari:     { name: '바리공주', hanja: '', tier: '명신(1복채)', domains: '치유·회복·마음위로', accent: '#B8A8D9' },
  eopsin:   { name: '업신',     hanja: '業神', tier: '명신(1복채)', domains: '재물지킴·저축', accent: '#8C8478' },
  choiyoung:{ name: '최영 장군', hanja: '', tier: '장군신(2복채)', domains: '관재·소송·승진경쟁', accent: '#C0C8D0' },
  gwanseong:{ name: '관성제군', hanja: '關聖', tier: '장군신(2복채)', domains: '사업·계약·의리', accent: '#9E2B2B' },
  baekma:   { name: '백마신장', hanja: '白馬', tier: '장군신(2복채)', domains: '액막이·삼재방어', accent: '#E8E4DC' },
  chilseong:{ name: '칠성신',   hanja: '七星', tier: '천신(3복채)', domains: '수명·소원성취·자녀대운', accent: '#2D5F8A' },
  yongwang: { name: '용왕신',   hanja: '龍王', tier: '천신(3복채)', domains: '큰재물흐름·해외운', accent: '#3F8FA8' },
  sansin:   { name: '산신령',   hanja: '山神', tier: '천신(3복채)', domains: '건강대운·학업대성', accent: '#7C9A6E' },
  okhwang:  { name: '옥황상제', hanja: '玉皇', tier: '천신(4복채·시즌한정)', domains: '전 영역 가호', accent: '#E8D5A0' },
}

// 표정별 서술(외부 단독 제작용 — 참조 이미지 없이도 동작하도록 full prompt)
const EMO_DESC = {
  neutral:   'calm gentle neutral expression, soft eyes',
  smile:     'warm bright smile, softly curved eyes, cheerful',
  stern:     'serious firm expression, focused steady eyes, dignified (not scary)',
  sad:       'sorrowful downcast eyes, slight frown, tender melancholy',
  surprised: 'wide open eyes, raised eyebrows, slightly open mouth, startled',
  bless:     'serene benevolent expression, eyes softly half-closed, gentle blessing look',
  angry:     'righteous fierce frown, intense determined eyes, brave (dignified, not frightening)',
}

const BUST_SUFFIX =
  'bust portrait framing (head and shoulders), front facing, ' +
  'solid chroma green background #00FF00, no text, no watermark, high detail'

function expressionPrompt(d, emo) {
  return `${STYLE_PREFIX}, "${d.code}" deity, ${d.appearance}, ${EMO_DESC[emo]}, ${BUST_SUFFIX}`
}
function portraitPrompt(d) {
  return `${STYLE_PREFIX}, "${d.code}" deity, ${d.appearance}, warm gentle expression, ` +
    `bust portrait (head and chest), front facing, soft warm bokeh background with golden light, ` +
    `no chroma green, no text, no watermark, high detail, refined key-art quality`
}

const THEMES = [
  { code: 'choga',    name: '초가 신당', el: '무속성(기본)', mood: 'humble thatched-roof village shrine, warm earthen tones, straw and wood', accent: '#c9a84c' },
  { code: 'banga',    name: '조선 반가', el: '목(wood)',    mood: 'noble Joseon hanok interior, dark wood beams, folk-painting (minhwa) accents, dignified', accent: '#e8d5a0' },
  { code: 'yonggung', name: '용궁',      el: '수(water)',   mood: 'underwater dragon palace, teal and jade, pearl light, flowing water and coral', accent: '#7fd4c1' },
  { code: 'dokkaebi', name: '도깨비 불', el: '화(fire)',    mood: 'eerie-yet-playful dokkaebi realm, deep violet dark, green goblin-fire glow', accent: '#c84040' },
]
const THEME_STYLE =
  'Korean traditional shrine room interior, warm painterly anime background, soft watercolor, ' +
  'atmospheric depth, empty altar space in center for a deity to stand, no characters, no text, no watermark'

// ── 출력 ──────────────────────────────────────────────
const L = []
const p = (s = '') => L.push(s)

p('# 신위·테마 이미지 제작 스펙 (외부 제작 핸드오프)')
p('')
p('> 스타일: 「설빛 온기」 — 따뜻한 수채 K-애니. 큰 갈색 눈망울·밝은 하이라이트, 홍조 볼, 골드 역광·림라이트, 한복/털 디테일, semi-deformed, 포근함(무섭지 않게).')
p('> 배경 규칙: 캐릭터는 **크로마 그린 #00FF00** 단색 배경(투명 키잉용). 초상만 소프트 보케 배경 허용.')
p('> 산출: PNG(권장) 또는 고품질 JPEG. 스탠딩은 전신·발까지, 정면. 파일명은 각 항목의 `경로` 사용.')
p('')
p('## 물량 요약')
p('')
p('| 구분 | 장수 | 우선순위 | 용도 |')
p('|---|---|---|---|')
p('| Phase 1 — 스탠딩 스프라이트 | 17 | **필수** | 제단 신위 렌더(`sprite_url`) |')
p('| Phase 1 — 초상(bust) | 17 | **필수** | 아바타·카드·대화 헤더(`portrait_url`) |')
p(`| Phase 2 — 표정 세트 | ${17 * EMOTIONS.length} (17×${EMOTIONS.length}) | 권장 | 신과의 대화 감정→표정 전환 |`)
p('| 테마 배경 | 4 | 선택 | 신당 방 배경(현재 CSS 그라디언트 대체) |')
p(`| **합계** | **${17 * (2 + EMOTIONS.length) + 4}** | | |`)
p('')
p('먼저 **Phase 1(34장)**만 제작하면 앱에서 신위가 이모지 폴백 대신 실제 이미지로 뜹니다. 표정·테마는 이후 확장 권장.')
p('')
p('---')
p('')
p('## 신위 17종')
p('')

let n = 0
for (const d of DEITIES) {
  const m = META[d.code]
  const hanjaPart = m.hanja ? ` (${m.hanja})` : ''
  p(`### ${++n}. ${m.name}${hanjaPart} — \`${d.code}\``)
  p('')
  p(`- **등급**: ${m.tier}  ·  **오행**: ${d.el}  ·  **관장**: ${m.domains}  ·  **강조색(aura)**: ${m.accent}`)
  p(`- **외형(공통 참조)**: ${d.appearance}`)
  p('')
  p('#### ① 스탠딩 스프라이트 (필수)')
  p('```')
  p(basePrompt(d))
  p('```')
  p(`경로: \`public/shrine/deities/${d.code}/base.png\``)
  p('')
  p('#### ② 초상 bust (필수)')
  p('```')
  p(portraitPrompt(d))
  p('```')
  p(`경로: \`public/shrine/deities/${d.code}/portrait.png\``)
  p('')
  p('#### ③ 표정 세트 (Phase 2)')
  p('> 동일 캐릭터·복장 유지. 외부 툴이면 ①스탠딩을 참조(img2img)로 첨부하면 일관성↑.')
  p('')
  for (const emo of EMOTIONS) {
    p(`- **${emo}** → \`public/shrine/deities/${d.code}/${emo}.png\``)
    p('  ```')
    p('  ' + expressionPrompt(d, emo))
    p('  ```')
  }
  p('')
  p('---')
  p('')
}

p('## 테마 배경 4종 (선택)')
p('')
p('> 현재 테마는 CSS 그라디언트로 렌더됩니다. 아래 배경 이미지를 넣으면 방 분위기가 살아납니다. 인물 없음, 중앙에 신위가 설 여백. 세로형(모바일 우선) 권장.')
p('')
let t = 0
for (const th of THEMES) {
  p(`### ${++t}. ${th.name} — \`${th.code}\` (${th.el})`)
  p('```')
  p(`${THEME_STYLE}, ${th.mood}, accent color ${th.accent}`)
  p('```')
  p(`경로(권장): \`public/shrine/themes/${th.code}/room.webp\`  ·  DB \`shrine_theme_packs.assets.wall\`/\`.floor\`에 이미지 URL로 교체`)
  p('')
}

p('---')
p('')
p('## 배치·연동 (제작 후)')
p('')
p('1. 스탠딩/표정 원본을 `assets-src/shrine/raw/{code}/`에 두고 `node scripts/shrine-assets/chroma.mjs` 실행 → 그린스크린 제거 → `public/shrine/deities/{code}/*.webp` 투명 생성. (초상은 보케 배경이라 키잉 제외)')
p('2. DB 업데이트: `shrine_deities.sprite_url` = base, `portrait_url` = portrait. 표정은 `{code}/{emotion}.webp` 규칙으로 코드가 참조.')
p('3. 테마: `shrine_theme_packs.assets`의 `wall`/`floor`를 이미지 URL로 교체.')
p('4. 코드 변경 0 — 경로 규칙만 맞으면 즉시 반영(이모지 폴백 → 실제 이미지).')

process.stdout.write(L.join('\n') + '\n')

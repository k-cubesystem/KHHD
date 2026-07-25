// 신위/테마 이미지 스펙을 구조화 JSON으로 출력 (웹 카탈로그 임베드용).
// manifest.mjs 프롬프트 로직 재사용 → 스펙 문서와 정합.
import { DEITIES, EMOTIONS, STYLE_PREFIX, basePrompt } from './manifest.mjs'

const META = {
  samsin:   { name: '삼신할매', hanja: '三神', tier: 1, tierName: '수호신', price: '무료', domains: '자녀·출산·가정화목', accent: '#E8A0A0', el: '土' },
  jowang:   { name: '조왕신',   hanja: '竈王', tier: 1, tierName: '수호신', price: '무료', domains: '건강·식복·집안평안', accent: '#D96C3F', el: '火' },
  seongju:  { name: '성주신',   hanja: '城主', tier: 1, tierName: '수호신', price: '무료', domains: '새출발·이사·가장운', accent: '#4A7C59', el: '木' },
  teoju:    { name: '터주대감', hanja: '基主', tier: 1, tierName: '수호신', price: '무료', domains: '재물안정·집터·부동산', accent: '#D4A017', el: '土' },
  dongja:   { name: '동자신',   hanja: '童子', tier: 1, tierName: '수호신', price: '무료', domains: '인연·소통·시험운', accent: '#6FA8DC', el: '木' },
  seonnyeo: { name: '선녀신',   hanja: '仙女', tier: 1, tierName: '수호신', price: '무료', domains: '애정·아름다움·예술', accent: '#5B8DBE', el: '水' },
  daegam:   { name: '대감신',   hanja: '大監', tier: 2, tierName: '명신', price: '1복채', domains: '재물증식·사업번창', accent: '#C9A84C', el: '金' },
  dokkaebi: { name: '도깨비 대장', hanja: '', tier: 2, tierName: '명신', price: '1복채', domains: '횡재·역전운·승부', accent: '#3FBF9F', el: '火' },
  bari:     { name: '바리공주', hanja: '', tier: 2, tierName: '명신', price: '1복채', domains: '치유·회복·마음위로', accent: '#B8A8D9', el: '水' },
  eopsin:   { name: '업신',     hanja: '業神', tier: 2, tierName: '명신', price: '1복채', domains: '재물지킴·저축', accent: '#8C8478', el: '土' },
  choiyoung:{ name: '최영 장군', hanja: '', tier: 3, tierName: '장군신', price: '2복채', domains: '관재·소송·승진경쟁', accent: '#C0C8D0', el: '金' },
  gwanseong:{ name: '관성제군', hanja: '關聖', tier: 3, tierName: '장군신', price: '2복채', domains: '사업·계약·의리', accent: '#9E2B2B', el: '火' },
  baekma:   { name: '백마신장', hanja: '白馬', tier: 3, tierName: '장군신', price: '2복채', domains: '액막이·삼재방어', accent: '#B9B098', el: '金' },
  chilseong:{ name: '칠성신',   hanja: '七星', tier: 4, tierName: '천신', price: '3복채', domains: '수명·소원성취·자녀대운', accent: '#2D5F8A', el: '水' },
  yongwang: { name: '용왕신',   hanja: '龍王', tier: 4, tierName: '천신', price: '3복채', domains: '큰재물흐름·해외운', accent: '#3F8FA8', el: '水' },
  sansin:   { name: '산신령',   hanja: '山神', tier: 4, tierName: '천신', price: '3복채', domains: '건강대운·학업대성', accent: '#7C9A6E', el: '土' },
  okhwang:  { name: '옥황상제', hanja: '玉皇', tier: 4, tierName: '천신', price: '4복채·시즌한정', domains: '전 영역 가호', accent: '#D4AF37', el: '전오행' },
}

const EMO_LABEL = { neutral: '평온', smile: '미소', stern: '근엄', sad: '슬픔', surprised: '놀람', bless: '축복', angry: '분노' }
const EMO_DESC = {
  neutral: 'calm gentle neutral expression, soft eyes',
  smile: 'warm bright smile, softly curved eyes, cheerful',
  stern: 'serious firm expression, focused steady eyes, dignified (not scary)',
  sad: 'sorrowful downcast eyes, slight frown, tender melancholy',
  surprised: 'wide open eyes, raised eyebrows, slightly open mouth, startled',
  bless: 'serene benevolent expression, eyes softly half-closed, gentle blessing look',
  angry: 'righteous fierce frown, intense determined eyes, brave (dignified, not frightening)',
}
const BUST_SUFFIX = 'bust portrait framing (head and shoulders), front facing, solid chroma green background #00FF00, no text, no watermark, high detail'
const expr = (d, e) => `${STYLE_PREFIX}, "${d.code}" deity, ${d.appearance}, ${EMO_DESC[e]}, ${BUST_SUFFIX}`
const portrait = (d) => `${STYLE_PREFIX}, "${d.code}" deity, ${d.appearance}, warm gentle expression, bust portrait (head and chest), front facing, soft warm bokeh background with golden light, no chroma green, no text, no watermark, high detail, refined key-art quality`

const deities = DEITIES.map((d) => {
  const m = META[d.code]
  return {
    code: d.code, ...m, appearance: d.appearance,
    images: [
      { kind: 'standing', label: '스탠딩', phase: 1, path: `public/shrine/deities/${d.code}/base.png`, prompt: basePrompt(d) },
      { kind: 'portrait', label: '초상', phase: 1, path: `public/shrine/deities/${d.code}/portrait.png`, prompt: portrait(d) },
      ...EMOTIONS.map((e) => ({ kind: 'expr', label: `표정·${EMO_LABEL[e]}`, phase: 2, path: `public/shrine/deities/${d.code}/${e}.png`, prompt: expr(d, e) })),
    ],
  }
})

const THEME_STYLE = 'Korean traditional shrine room interior, warm painterly anime background, soft watercolor, atmospheric depth, empty altar space in center for a deity to stand, no characters, no text, no watermark'
const themes = [
  { code: 'choga', name: '초가 신당', el: '무속성(기본)', accent: '#c9a84c', mood: 'humble thatched-roof village shrine, warm earthen tones, straw and wood' },
  { code: 'banga', name: '조선 반가', el: '목(wood)', accent: '#e8d5a0', mood: 'noble Joseon hanok interior, dark wood beams, folk-painting (minhwa) accents, dignified' },
  { code: 'yonggung', name: '용궁', el: '수(water)', accent: '#7fd4c1', mood: 'underwater dragon palace, teal and jade, pearl light, flowing water and coral' },
  { code: 'dokkaebi', name: '도깨비 불', el: '화(fire)', accent: '#c84040', mood: 'eerie-yet-playful dokkaebi realm, deep violet dark, green goblin-fire glow' },
  { code: 'seolbit', name: '설빛 서고', el: '금(metal)', accent: '#c8d4dc', mood: 'snow-lit dawn scholar library, silver-white stillness, hanji scrolls and frost on the lattice window, quiet and pure' },
  { code: 'daljip', name: '달집 마당', el: '토(earth)', accent: '#e6c37a', mood: 'full-moon night courtyard of an ochre earthen house, warm moonlight on clay walls, bundled straw and gentle amber glow' },
  { code: 'hongsal', name: '홍살문 안뜰', el: '화(fire)', accent: '#d96c5f', mood: 'inner court behind a crimson hongsalmun gate, red dancheong pillars, solemn ward-against-evil dignity, deep vermilion' },
  { code: 'byeolbat', name: '별밭 천문각', el: '무속성(프리미엄)', accent: '#8fa8e8', mood: 'celestial observatory pavilion under a field of stars, deep indigo night, constellation charts and starlight spilling in' },
].map((t) => ({ ...t, path: `public/shrine/themes/${t.code}/room.webp`, prompt: `${THEME_STYLE}, ${t.mood}, accent color ${t.accent}` }))

process.stdout.write(JSON.stringify({ deities, themes, emotions: EMOTIONS.length }, null, 0))

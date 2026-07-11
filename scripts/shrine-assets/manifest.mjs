// 신당 3.0 신위 에셋 생성 매니페스트 — PRD-shrine-3.0-deities-v1.md 단일 소스
// 스타일: 「설빛 온기」 (§1). 각 신위: 스탠딩 base + 표정 7 + 초상.

export const STYLE_PREFIX =
  'Korean traditional deity, warm painterly anime illustration, soft watercolor shading, ' +
  'large expressive brown eyes with bright highlights, rosy blush cheeks, ' +
  'warm golden backlight and soft rim light, detailed hanbok fabric and fur textures, ' +
  'semi-deformed proportions, wholesome and warm, not scary'

export const STYLE_SUFFIX =
  'full body standing pose, front facing, feet visible, ' +
  'solid chroma green background #00FF00, no text, no watermark, high detail'

export const EMOTIONS = ['neutral', 'smile', 'stern', 'sad', 'surprised', 'bless', 'angry']

// grade: guardian | myeongsin | janggun | cheonsin
export const DEITIES = [
  { code: 'samsin',   grade: 'guardian', el: 'earth', appearance: 'grandmother deity, white bun hair with jade hairpin, ivory jeogori and pink baeja vest, sacred straw rope at waist, red thread spool in hand, plump kind figure, wrinkled warm smile' },
  { code: 'jowang',   grade: 'guardian', el: 'fire',  appearance: 'kitchen goddess, 30s woman, red apron hanbok, rolled sleeves, brass rice paddle, face lit by hearth fire, spirited smile' },
  { code: 'seongju',  grade: 'guardian', el: 'wood',  appearance: 'upright scholar guardian, teal dopo robe, ink line and carpenter square in hands, wood shaving on shoulder, dignified posture' },
  { code: 'teoju',    grade: 'guardian', el: 'earth', appearance: 'jolly pot-bellied nobleman, gat hat and jade official robe, coin pouch at waist, long pipe, good-natured laugh' },
  { code: 'dongja',   grade: 'guardian', el: 'wood',  appearance: 'mischievous boy spirit, double top-knots, saekdong colorful jeogori, paper crane and ttakji in hands, cheeky grin' },
  { code: 'seonnyeo', grade: 'guardian', el: 'water', appearance: 'serene fairy, milky-way gradient feathered robe navy to silver, flowing sleeves, long black hair with moon ornament, gentle look' },
  { code: 'daegam',   grade: 'myeongsin', el: 'metal', appearance: 'wealthy magistrate spirit, black gat with gold band, silk robe, long pipe, beard, confident grin' },
  { code: 'dokkaebi', grade: 'myeongsin', el: 'fire',  appearance: 'goblin chief, single horn, teal flame-like hair, spiked club, tiger-fur shoulder, fanged playful grin' },
  { code: 'bari',     grade: 'myeongsin', el: 'water', appearance: 'healing princess, white hanbok with lilac overcoat, medicine vial and white flower, quiet smile, barefoot' },
  { code: 'eopsin',   grade: 'myeongsin', el: 'earth', appearance: 'shy prosperity girl, snake-scale patterned durumagi, white weasel on shoulder, small storehouse keys, quiet expression' },
  { code: 'choiyoung', grade: 'janggun', el: 'metal', appearance: 'General Choi Yeong, silver armor, red-tasseled helmet held at side, long sword, resolute gaze, broad shoulders' },
  { code: 'gwanseong', grade: 'janggun', el: 'fire',  appearance: 'Guan Yu deity, red-dragon armor and green war-robe, long beard, green-dragon glaive, stern yet warm eyes' },
  { code: 'baekma',   grade: 'janggun', el: 'metal', appearance: 'white-horse general, white armor beside a white horse, bow on back, talisman arrows, snow-white cloak, silent guardian' },
  { code: 'chilseong', grade: 'cheonsin', el: 'water', appearance: 'seven-star deity, big dipper crown, navy star-pattern robe faintly glowing constellations, a star on fingertip, distant serene' },
  { code: 'yongwang', grade: 'cheonsin', el: 'water', appearance: 'dragon king, azure dragon horns, flowing white hair, wave-patterned robe, pearl wish-orb, water-like flowing sleeves' },
  { code: 'sansin',   grade: 'cheonsin', el: 'earth', appearance: 'mountain sage, white hair and beard, crane-feather robe, herb staff, a baby white tiger beside him, serene wisdom' },
  { code: 'okhwang',  grade: 'cheonsin', el: 'all',   appearance: 'Jade Emperor, golden dragon robe, myeollyugwan crown with beaded veil half-covering face, golden scepter, clouds at feet, supreme majesty', season: 'seollal/suneung' },
]

export function basePrompt(d) {
  return `${STYLE_PREFIX}, "${d.code}" deity, ${d.appearance}, neutral gentle expression, ${STYLE_SUFFIX}`
}
export function emotionPrompt(d, emotion) {
  return `same character, same pose, same outfit as reference. Only change facial expression to: ${emotion}. Keep style identical.`
}

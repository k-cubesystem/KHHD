// 아이콘→일러스트 전환 (PRD-shrine-3.0 §7) — 오브젝트/엠블럼/타일 일괄 생성
// 사용: node scripts/shrine-assets/generate-icons.mjs [set]   # set ∈ items|elements|forms|hub|nav|season|all
// 흐름: NB2 Lite 그린스크린 생성 → 크로마키 → 트림 → 리사이즈 → public/ 배치 (멱등: 산출물 존재 시 skip)
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { warmDespill } from './despill.mjs'

config({ path: path.resolve('D:/anti/haehwadang/.env.local') })

const MODEL = process.env.SHRINE_IMAGE_MODEL || 'gemini-3.1-flash-lite-image'
const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
if (!KEY) {
  console.error('GEMINI 키 없음')
  process.exit(1)
}
const RAW = 'D:/anti/haehwadang/assets-src/shrine/raw-icons'
const PUB = path.resolve(import.meta.dirname, '../../public')
const genAI = new GoogleGenerativeAI(KEY)
const model = genAI.getGenerativeModel({ model: MODEL })

// ⚠️ 캐릭터 base를 참조로 첨부하면 Lite가 오브젝트 프롬프트를 무시하고 캐릭터를 복제한다(실측).
// 「설빛 온기」는 프롬프트 문구만으로 재현됨(세션6 실증) — 참조 미첨부.

const STYLE =
  'warm painterly watercolor illustration, soft K-anime aesthetic, gentle golden rim light and subtle warm glow, rich detail'
const BG = 'solid pure chroma green background (#00FF00), no text, no letters, no watermark, no border'

const objectPrompt = (desc) =>
  `Korean traditional shrine object: ${desc}. ${STYLE}, single object centered, slight high-angle view (15 degrees), soft warm shadow beneath the object, ${BG}`
const emblemPrompt = (desc) =>
  `Ornate circular Korean traditional emblem: ${desc}. ${STYLE}, dancheong-inspired pattern ring, centered medallion composition, ${BG}`
const tilePrompt = (desc) =>
  `Miniature Korean fortune-telling motif illustration: ${desc}. ${STYLE}, single clear subject centered, storybook charm, ${BG}`
const navPrompt = (desc) =>
  `Small app emblem, bold readable silhouette at tiny size: ${desc}. ${STYLE}, strong simple shape with warm gold accent, centered, generous margins, ${BG}`
const portraitPrompt = (desc) =>
  `Korean traditional character bust portrait for a circular avatar: ${desc}. ${STYLE}, head and shoulders framing centered with generous headroom, face clearly visible, gentle warm expression, looking slightly toward viewer, ${BG}`

/** @type {Record<string, Array<{slug:string,out:string,size:number,prompt:string,despill?:'warm'}>>} */
const SETS = {
  // A. 신당 아이템 12 (방 배치 스프라이트 + 카드 공용)
  items: [
    ['bell-brass', '놋방울 — polished brass shaman bell with red silk tassel'],
    ['candle-basic', '기본 촛불 — small lit white candle on a brass holder, warm flame'],
    ['lantern-gold', '황금 등불 — ornate golden oil lantern with glowing warm light'],
    ['chime-silver', '은풍경 — silver wind chime with a small fish pendant'],
    ['cushion-lotus', '연화방석 — lotus-shaped meditation cushion, soft pink petals'],
    ['flower-offering', '공물 꽃 — offering of fresh pink and white blossoms in a small dish'],
    ['incense-burner', '향로 — bronze incense burner with a thin wisp of fragrant smoke'],
    ['lantern-red', '초롱 — red paper lantern with gold trim, softly glowing'],
    ['liquor-clear', '청주 — white porcelain bottle of clear rice wine with a small cup'],
    ['bamboo-green', '청죽 — fresh green bamboo stalks in a ceramic pot'],
    ['talisman-bok', '복 부적 — traditional Korean talisman paper with red 福 calligraphy motif, hanji texture'],
    ['jar-water', '물항아리 — earthen onggi water jar with wooden ladle'],
    // ── 확장 32종 + 시렁 (2026-08-05, 무구·제물 조사 기반 카탈로그 확장분) ──
    ['blade-sinkal', '신칼 — pair of shaman ritual knives with brass blades and long white hanji paper tassels'],
    ['blade-samjichang', '삼지창 — Korean shaman trident, three-pronged iron spearhead on a wooden shaft'],
    ['mirror-myeongdu', '명두 — round polished brass shaman mirror with engraved back, hanging red cord'],
    ['gong-jing', '징 — large Korean brass gong with a padded mallet'],
    ['gong-kkwaenggwari', '꽹과리 — small hand-held Korean brass gong with a thin wooden beater'],
    ['cymbal-jegeum', '제금 — pair of small Korean brass cymbals (bara) with red silk knots'],
    ['bell-yoryeong', '요령 — shaman hand bell cluster with wooden handle and red tassel'],
    ['candle-pair', '촛대 한 쌍 — two matching brass candlesticks with lit white candles'],
    ['brazier-hwaro', '화로 — round Korean charcoal brazier with glowing embers, three short legs'],
    ['offering-jujube', '대추 세 알 — three glossy red jujube dates on a small white dish'],
    ['offering-redbean', '팥 한 되 — small wooden measuring box heaped with red adzuki beans'],
    ['thread-red', '홍실 타래 — skein of bright red silk thread tied in a loop'],
    ['lantern-indeung', '인등 — small temple dedication lantern with a name tag, warm inner glow'],
    ['pole-sindae', '신대 — tall bamboo spirit pole with white paper streamers tied at the top'],
    ['fan-museon', '무선 — Korean shaman folding fan painted with deity figures, opened'],
    ['paper-jijeon', '지전 — strings of traditional Korean paper money cut from white hanji, hanging'],
    ['paper-neokjeon', '넋전 — white hanji paper cut in a small human silhouette'],
    ['plant-solgaji', '솔가지 — bundle of fresh green pine branches tied with straw cord'],
    ['offering-samsaek', '삼색나물 — three small dishes of seasoned vegetables: white bellflower root, brown fernbrake, green spinach'],
    ['screen-byeongpung', '병풍 — Korean folding screen with ink landscape painting, partially unfolded'],
    ['offering-baekseolgi', '백설기 — pure white Korean steamed rice cake on a round plate'],
    ['offering-patsirutteok', '팥시루떡 — layered Korean steamed rice cake with red bean topping on a plate'],
    ['vessel-siru', '시루 — earthen Korean steamer pot with small holes, clay brown'],
    ['jar-seongju', '성주단지 — lidded earthen jar filled with rice, tied with white paper band'],
    ['jar-samsin', '삼신단지 — small round earthen jar with a soft cloth cover tied with string'],
    ['offering-rice', '쌀 한 되 — small wooden measuring box heaped with white rice grains'],
    ['bowl-jeonghwasu', '정화수 — white porcelain bowl of clear water on a small wooden stand'],
    ['offering-bugeo', '북어 — single dried pollack fish tied with white cotton thread'],
    ['offering-miyeok', '미역 — bundle of dark dried seaweed strips tied with straw'],
    ['offering-sogeum', '소금 — small white dish heaped with coarse sea salt crystals'],
    ['jar-yongwang', '용왕단지 — blue-glazed earthen jar with a wave pattern, lidded'],
    ['liquor-jora', '조라술 — small earthen liquor jar sealed with hanji paper and straw rope'],
    ['shelf-sireong', '시렁 — traditional Korean wooden wall shelf, single warm wood plank with two carved brackets, empty'],
    // ── 가족 자리 세간 5종 (2026-08-06, 제단·가구 확장분) ──
    ['table-jesang', '제상 — low Korean ritual offering table with red lacquered rectangular top and short carved wooden legs, empty top surface'],
    ['table-soban', '개다리소반 — small round Korean tray-table with four curved dog-leg shaped wooden legs, warm lacquered wood, empty, soft warm brown shadow on the ground'],
    ['chest-bandaji', '반닫이 — Korean traditional low wooden chest with ornate brass hinge fittings and a half-front panel door, closed'],
    ['chest-mungap', '문갑 — long low Korean document chest with small sliding doors and round brass pulls, dark lacquered wood grain'],
    ['cushion-boryo', '보료 — thick rectangular Korean floor mattress with deep red silk cover and gold trim pattern, neatly laid flat'],
  ].map(([slug, d]) => ({ slug, out: `shrine/items/${slug}.webp`, size: 512, prompt: objectPrompt(d) })),

  // C. 무대 가구 — 가족 선반장(사방탁자). 벽에 세워 붙이는 구조물이라 **정면 입면**으로 그린다
  //    (objectPrompt 의 하이앵글 15도를 쓰면 상판 원근이 생겨 벽 부착이 어색해진다).
  // ⚠️ 발밑 그림자를 프롬프트로 요구하지 않는다 — 반투명 그림자가 #00FF00 위에 얹히면 크로마키가
  //    초록을 다 못 걷어 **연두색 «자리 매트»** 가 구워진다(2026-08-10 CEO 반려로 픽셀 수술한 원인).
  //    방은 CSS drop-shadow 로 접지 그림자를 직접 그린다(FamilyShelfWall·RitualHall).
  stagefurn: [
    {
      slug: 'shelf-sabang',
      out: 'shrine/stage/banga/shelf-sabang.webp',
      size: 640,
      despill: 'warm',
      prompt:
        'Korean traditional sabang-takja (四方卓子) — a TALL narrow open display shelf of dark walnut wood, ' +
        'seen in flat frontal elevation view, much taller than wide. Four open tiers stacked vertically: ' +
        'three empty shelf boards held by slender square corner posts, and a small closed cabinet with two ' +
        'little doors as the bottom tier. Clean straight joinery, warm candlelight sheen on the dark wood, ' +
        'subtle brass corner fittings, all tiers completely empty. ' +
        'The furniture stands alone in empty space — no floor, no ground plane, no mat, no cast shadow, ' +
        'nothing beneath the feet. ' +
        `${STYLE}, single object centered, ${BG}`,
    },
  ],

  // B2. 신수(神獸) 32 — 거니는 수호 영물. 걸음 연출이 좌우 반전을 쓰므로 **오른쪽을 보는
  //     전신**으로 통일한다(신위 턴어라운드와 같은 이유 — 방향이 섞이면 반전 재사용이 어긋난다).
  guardians: [
    ['cheongryong', '청룡 — azure blue eastern dragon, serpentine body with small legs, flowing whiskers'],
    ['baekho', '백호 — white tiger with black stripes, dignified stance'],
    ['jujak', '주작 — vermilion sacred bird with spread crimson-orange wings and long tail plumes'],
    ['hyeonmu', '현무 — black tortoise entwined with a dark snake, ancient shell'],
    ['haetae', '해태 — horned lion-like guardian beast with curly mane and small bell collar'],
    ['girin', '기린 — kirin with deer-like body, scale patches, gentle flame mane'],
    ['samjogo', '삼족오 — three-legged black crow with a golden sun-disc halo'],
    ['bonghwang', '봉황 — five-colored phoenix with long flowing ornate tail'],
    ['imugi', '이무기 — large teal serpent coiled, holding a glowing pearl'],
    ['cheonma', '천마 — white heavenly horse with flowing mane, small cloud wisps at hooves'],
    ['hyeonhak', '현학 — elegant black crane standing tall with folded wings'],
    ['okto', '옥토끼 — moon rabbit holding a small wooden pestle, pale jade fur'],
    ['gangnim', '강림차사 — stern Korean underworld enforcer in black gat hat and dark navy official robe with red sash'],
    ['iljik', '일직차사 — Korean day-duty underworld clerk in black gat and charcoal robe holding a paper scroll'],
    ['woljik', '월직차사 — Korean night-duty underworld clerk in black gat and indigo robe holding a small lantern'],
    ['saja', '저승사자 — Korean grim reaper in wide black gat and flowing black hanbok robe, pale calm face'],
    ['ssireum', '씨름도깨비 — burly Korean dokkaebi goblin wearing a wrestling satba sash, one small horn'],
    ['bangmangi', '방망이도깨비 — grinning dokkaebi holding a studded wooden magic club'],
    ['gat', '갓도깨비 — polite dokkaebi wearing a gentleman gat hat and durumagi coat'],
    ['dokgak', '독각귀 — one-legged dokkaebi hopping cheerfully, straw texture hints'],
    ['meokbo', '먹보도깨비 — chubby dokkaebi happily holding a bowl of memil-muk jelly'],
    ['gimseobang', '김서방도깨비 — friendly waving dokkaebi with a warm grin, patched vest'],
    ['natdokkaebi', '낮도깨비 — bold dokkaebi standing in daylight, sun motif, fearless grin'],
    ['muldokkaebi', '물도깨비 — dokkaebi with wet slicked hair, water droplets, holding a small fish'],
    ['cheongbul', '청도깨비불 — blue will-o-wisp flame spirit with a tiny sleepy face, floating'],
    ['hongbul', '홍도깨비불 — warm red will-o-wisp flame spirit with a cheerful tiny face, floating'],
    ['honbul', '혼불 — serene pale-blue soul flame, slow elegant trail, floating'],
    ['dalbit', '달빛정령 — silvery moonlight spirit wisp with a small crescent ornament, floating'],
    ['byeolbit', '별똥정령 — shooting-star spirit with trailing golden sparkles, floating'],
    ['barampung', '바람정령 — pale green wind spirit swirl with tiny leaves caught in it, floating'],
    ['angae', '안개정령 — soft grey-blue mist spirit, gentle fog wisp with calm face, floating'],
    ['sutbul', '숯불정령 — glowing ember spirit, charcoal body with warm orange cracks, floating'],
  ].map(([slug, d]) => ({
    slug,
    out: `shrine/guardians/${slug}.webp`,
    size: 512,
    prompt: `Korean mythical shrine guardian spirit: ${d}. ${STYLE}, single character full body, facing slightly to the right, small chibi proportions, feet or base at the bottom, ${BG}`,
  })),

  // C. 오행 엠블럼 6
  elements: [
    ['wood', '木 wood element — young green tree and leaves, jade green glow'],
    ['fire', '火 fire element — dancing crimson flame, warm red glow'],
    ['earth', '土 earth element — golden mountain and soil mound, ochre glow'],
    ['metal', '金 metal element — white-gold sword and bell, silver glow'],
    ['water', '水 water element — flowing indigo wave and moon, deep blue glow'],
    ['all', '全 all five elements in harmony — five-color taegeuk swirl, prismatic warm glow'],
  ].map(([slug, d]) => ({ slug, out: `shrine/elements/${slug}.webp`, size: 256, prompt: emblemPrompt(d) })),

  // D. 소원 카테고리 6 + 신당 테마 뱃지 3
  forms: [
    ['wish/health', '건강 wish — glowing medicinal herb bundle and gourd bottle'],
    ['wish/exam', '합격 wish — traditional brush and scroll with a red pass seal'],
    ['wish/love', '인연 wish — two mandarin ducks facing each other, red thread of fate'],
    ['wish/wealth', '재물 wish — stack of old Korean brass coins with red ribbon'],
    ['wish/family', '가족 wish — warm hearth with three small jesa bowls'],
    ['wish/business', '사업 wish — traditional storehouse (곳간) with full rice sacks'],
    ['themes/badge/traditional', '전통 한옥 신당 badge — tiled hanok roof and lantern'],
    ['themes/badge/modern', '현대 신당 badge — minimal moonlit altar with a single candle'],
    ['themes/badge/premium', '프리미엄 궁중 신당 badge — golden palace roof with ornate dancheong'],
  ].map(([slug, d]) => ({
    slug: slug.replace(/\//g, '-'),
    out: `shrine/${slug}.webp`,
    size: 256,
    prompt: tilePrompt(d),
  })),

  // G. 오행 인물 아바타 5 (가족 선택기 + 프로필 직접선택 공용)
  avatars: [
    ['water', '청수 도령 水 — calm young boy in indigo-blue durumagi robe, moonlit water wave motif on collar, serene wise eyes'],
    ['fire', '단화 낭자 火 — cheerful young girl in crimson chima-jeogori hanbok, small flame-blossom hairpin, bright lively smile'],
    ['metal', '백금 검사 金 — dignified middle-aged man in silver-white dopo robe with neat topknot (상투), frost-like calm expression'],
    ['wood', '청목 선비 木 — gentle young scholar in jade-green dopo robe holding a bamboo book scroll, fresh sprout motif'],
    ['earth', '온토 부인 土 — warm motherly woman in ochre-gold hanbok, soft embracing smile, ripe grain motif on binyeo hairpin'],
  ].map(([slug, d]) => ({ slug, out: `avatars/five/${slug}.webp`, size: 256, prompt: portraitPrompt(d) })),

  // E. 분석 허브 타일 11
  hub: [
    ['gunghap', '궁합 — two overlapping taegeuk comma shapes in red and blue harmony'],
    ['gwansang', '관상 — serene Korean face silhouette with constellation lines'],
    ['songeum', '손금 — open palm with glowing fate lines'],
    ['pungsu', '풍수 — traditional geomantic compass (나경) with mountains and water'],
    ['unse', '운세 흐름 — winding golden river flowing through four seasons'],
    ['sangdam', '고민 상담 — warm tea cup and glowing crystal orb on a wooden table'],
    ['jaemul', '재물운 — overflowing pouch of brass coins and golden grain'],
    ['aejeong', '애정운 — pair of red threads tied into a heart knot'],
    ['jikjang', '직장운 — traditional Korean gat hat and rising golden steps'],
    ['hakeop', '학업운 — glowing book with brush and inkstone'],
    ['budongsan', '부동산 — hanok house on auspicious hill with sun'],
    // 허브 아이콘 런처 3칸(2026-08-13) — 기존 11종에 없던 자리. 결은 위와 같은 tilePrompt.
    // hakeop(고서+벼루)과 겹치지 않도록 사주는 «네 기둥» 자체를 그린다.
    // 1차 산출물은 기둥에 「사주팔자」 글자가 새겨져 나왔다(다른 10종은 글자가 없다).
    // 규칙대로 설명을 늘리지 않고 관찰 가능한 사실 하나(민무늬 나뭇결)만 더했다.
    ['saju', '사주팔자 — four slender wooden pillars with smooth bare woodgrain surfaces standing in a row on a lacquer base, golden constellation lines arcing behind them'],
    ['samhap', '삼합 종합풀이 — three brass rings interlocking in a triangle, warm golden light glowing where they overlap'],
    ['themes', '운세 테마 모음 — five hanji fortune cards fanned out in an arc, tied together with a red silk cord'],
  ].map(([slug, d]) => ({ slug, out: `icons/hub/${slug}.webp`, size: 256, prompt: tilePrompt(d) })),

  // F. 하단 네비 5 (소형 렌더 — 굵은 실루엣)
  nav: [
    ['analysis', '사주·궁합 홈 — taegeuk symbol with eight trigram accents'],
    ['family', '가족 관리 — three warm figures in hanbok holding hands'],
    ['chat', '고민 상담 — speech bubble with a small crystal orb inside'],
    ['shrine', '신당 — small shrine gate (홍살문) with a flame'],
    ['profile', '프로필 — round hanbok person portrait frame'],
  ].map(([slug, d]) => ({ slug, out: `icons/nav/${slug}.webp`, size: 256, prompt: navPrompt(d) })),

  // S. 절기 24
  season: [
    ['sohan', '소한 小寒 — frost crystals on bare branch'],
    ['daehan', '대한 大寒 — snow-covered village roof'],
    ['ipchun', '입춘 立春 — first green sprout breaking soil'],
    ['usu', '우수 雨水 — gentle spring rain drops on a leaf'],
    ['gyeongchip', '경칩 驚蟄 — waking frog on a lily pad'],
    ['chunbun', '춘분 春分 — cherry blossom branch in full bloom'],
    ['cheongmyeong', '청명 淸明 — clear blue sky with a soaring swallow'],
    ['gogu', '곡우 穀雨 — rice seedlings in spring rain'],
    ['ipha', '입하 立夏 — bright early-summer sun over green field'],
    ['soman', '소만 小滿 — ripening green barley ears'],
    ['mangjong', '망종 芒種 — golden wheat and planting hands'],
    ['haji', '하지 夏至 — high blazing sun with sunflower'],
    ['soseo', '소서 小暑 — cool stream over smooth stones'],
    ['daeseo', '대서 大暑 — bold red sun and cicada on bamboo'],
    ['ipchu', '입추 立秋 — first fallen maple leaf on wind'],
    ['cheoseo', '처서 處暑 — dragonfly over calm reeds'],
    ['baengno', '백로 白露 — morning dew drops on grass blade'],
    ['chubun', '추분 秋分 — full harvest moon over rice field'],
    ['hallo', '한로 寒露 — cold dew on chrysanthemum'],
    ['sanggang', '상강 霜降 — first frost on persimmon fruit'],
    ['ipdong', '입동 立冬 — first snowflake over hanok gate'],
    ['soseol', '소설 小雪 — light snow on pine branch'],
    ['daeseol', '대설 大雪 — heavy snow on village path'],
    ['dongji', '동지 冬至 — bowl of red-bean porridge with candle'],
  ].map(([slug, d]) => ({ slug, out: `icons/season/${slug}.webp`, size: 256, prompt: tilePrompt(d) })),
}

async function gen(prompt, outPng, refPaths = []) {
  const parts = [{ text: prompt }]
  for (const rp of refPaths) {
    if (!existsSync(rp)) continue
    const buf = await readFile(rp)
    parts.push({
      inlineData: { mimeType: rp.endsWith('.webp') ? 'image/webp' : 'image/png', data: buf.toString('base64') },
    })
  }
  const res = await model.generateContent(parts)
  const img = res.response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData
  if (!img) throw new Error('이미지 파트 없음')
  await mkdir(path.dirname(outPng), { recursive: true })
  await writeFile(outPng, Buffer.from(img.data, 'base64'))
}

// 크로마키(chroma.mjs 동일 로직) → 트림 → 정사각 리사이즈
// 아래 despill 조건(g-r>20 && g-b>20)은 g≈r 황록 스필을 못 잡는다 — 해당 자산은 despill:'warm' 참조.
async function key_trim_resize(inPng, outWebp, size, despill) {
  const { data, info } = await sharp(inPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2]
    if (g > 90 && g - r > 60 && g - b > 60) data[i + 3] = 0
    else if (g - r > 20 && g - b > 20) data[i + 1] = Math.min(g, Math.round((r + b) / 2) + 10)
  }
  if (despill === 'warm') warmDespill(data, channels)
  const keyed = sharp(data, { raw: { width, height, channels } }).png()
  const trimmed = await keyed.trim({ threshold: 10 }).toBuffer()
  await mkdir(path.dirname(outWebp), { recursive: true })
  await sharp(trimmed)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 86, alphaQuality: 100 })
    .toFile(outWebp)
}

const setArg = process.argv[2] || 'all'
const names = setArg === 'all' ? Object.keys(SETS) : [setArg]
let ok = 0,
  fail = 0
for (const name of names) {
  const list = SETS[name]
  if (!list) {
    console.error('unknown set:', name)
    process.exit(1)
  }
  console.log(`\n── ${name} (${list.length}) ──`)
  for (const item of list) {
    const outWebp = path.join(PUB, item.out)
    if (existsSync(outWebp)) {
      console.log('skip', item.out)
      ok++
      continue
    }
    const rawPng = path.join(RAW, name, `${item.slug}.png`)
    try {
      if (!existsSync(rawPng)) await gen(item.prompt, rawPng)
      await key_trim_resize(rawPng, outWebp, item.size, item.despill)
      console.log('  ✔', item.out)
      ok++
    } catch (e) {
      console.error('  ✖', item.out, String(e).slice(0, 160))
      fail++
    }
  }
}
console.log(`\nDONE ok=${ok} fail=${fail}`)
process.exit(fail > 0 ? 1 : 0)

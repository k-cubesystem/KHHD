// 아이콘→일러스트 전환 (PRD-shrine-3.0 §7) — 오브젝트/엠블럼/타일 일괄 생성
// 사용: node scripts/shrine-assets/generate-icons.mjs [set]   # set ∈ items|elements|forms|hub|nav|season|all
// 흐름: NB2 Lite 그린스크린 생성 → 크로마키 → 트림 → 리사이즈 → public/ 배치 (멱등: 산출물 존재 시 skip)
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

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

/** @type {Record<string, Array<{slug:string,out:string,size:number,prompt:string}>>} */
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
  ].map(([slug, d]) => ({ slug, out: `shrine/items/${slug}.webp`, size: 512, prompt: objectPrompt(d) })),

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
async function key_trim_resize(inPng, outWebp, size) {
  const { data, info } = await sharp(inPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2]
    if (g > 90 && g - r > 60 && g - b > 60) data[i + 3] = 0
    else if (g - r > 20 && g - b > 20) data[i + 1] = Math.min(g, Math.round((r + b) / 2) + 10)
  }
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
      await key_trim_resize(rawPng, outWebp, item.size)
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

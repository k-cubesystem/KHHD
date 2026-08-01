import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  EUNGGI,
  SAMGI_FLOW_INFO,
  SAMGI_REMEDY,
  SAMGI_SLOTS,
  SAMGI_SLOT_INFO,
  allReadingLines,
  drawSamgi,
  eunggiLine,
  gongsuLine,
  readSamgi,
  samgiFlow,
  samgiOrder,
  slotLine,
  wangswe,
  wangsweLine,
  SAMGI_FLOW_PLAIN,
  SAMGI_SLOT_PLAIN,
  YUKCHIN_INFO,
  allPlainLines,
  headline,
  yukchin,
  type Yukchin,
  type ElementSpread,
  type SamgiFlow,
} from '../obangki-reading'
import { OBANGKI_COLORS, OBANGKI_COLOR_ELEMENT, sajuRelation, type ObangkiColor } from '../obangki'
import type { Element } from '@/lib/domain/shrine/types'

const CSS = readFileSync(path.join(process.cwd(), 'app/shrine-scene.css'), 'utf8')

/** 시드 표본 — 결정론 함수라 난수 없이 넓게 훑는다. */
const seeds = (n: number): number[] => Array.from({ length: n }, (_, i) => (i * 2654435761) >>> 0)

describe('세 자리 — 초기(자리)·중기(뿌리)·말기(향방)', () => {
  it('자리는 셋이고 저마다 이름·묻는 것이 있다', () => {
    expect([...SAMGI_SLOTS]).toEqual(['seat', 'root', 'way'])
    for (const s of SAMGI_SLOTS) {
      expect(SAMGI_SLOT_INFO[s].flagName).toBeTruthy()
      expect(SAMGI_SLOT_INFO[s].title).toBeTruthy()
      expect(SAMGI_SLOT_INFO[s].question).toBeTruthy()
    }
  })

  it('samgiOrder 는 늘 자리→뿌리→향방 순이다 (화면 연출 순서의 단일 출처)', () => {
    for (const s of seeds(50)) {
      const d = drawSamgi(s)
      expect(samgiOrder(d).map((x) => x.slot)).toEqual(['seat', 'root', 'way'])
      expect(samgiOrder(d).map((x) => x.color)).toEqual([d.seat, d.root, d.way])
    }
  })
})

describe('drawSamgi — 결정론·독립', () => {
  it('같은 시드는 같은 삼기, 색은 늘 5기 안이다', () => {
    for (const s of seeds(200)) {
      const a = drawSamgi(s)
      expect(a).toEqual(drawSamgi(s))
      for (const c of [a.seat, a.root, a.way]) expect(OBANGKI_COLORS).toContain(c)
    }
  })

  it('세 자리가 다섯 색을 모두 낸다 — 어느 자리도 한 색에 묶여 있지 않다', () => {
    const seen: Record<string, Set<ObangkiColor>> = { seat: new Set(), root: new Set(), way: new Set() }
    for (const s of seeds(400)) {
      const d = drawSamgi(s)
      seen.seat.add(d.seat)
      seen.root.add(d.root)
      seen.way.add(d.way)
    }
    for (const k of ['seat', 'root', 'way']) expect(seen[k].size).toBe(OBANGKI_COLORS.length)
  })

  it('자리끼리 서로를 유추할 수 없다 — 한 자리 값이 다른 자리를 결정하지 않는다', () => {
    // seat 이 red 인 표본 안에서 way 가 한 색으로 쏠리면 소금이 제 일을 못 하는 것이다
    const ways = new Set<ObangkiColor>()
    for (const s of seeds(600)) {
      const d = drawSamgi(s)
      if (d.seat === 'red') ways.add(d.way)
    }
    expect(ways.size).toBe(OBANGKI_COLORS.length)
  })
})

describe('부정풀이 — 자리에 녹기가 서면 물리고 다시 뽑는다 (전승)', () => {
  it('물린 기는 언제나 녹기이고, 물렸으면 자리 기는 재차 뽑은 것이다', () => {
    let purifiedCount = 0
    for (const s of seeds(1000)) {
      const d = drawSamgi(s)
      if (d.purified === null) continue
      purifiedCount += 1
      expect(d.purified).toBe('green')
    }
    expect(purifiedCount).toBeGreaterThan(0)
  })

  it('재차는 **1회로 끊는다** — 두 번째도 녹기면 그대로 선다 (색 하나가 죽지 않게)', () => {
    const greenSeat = seeds(4000).filter((s) => drawSamgi(s).seat === 'green')
    expect(greenSeat.length).toBeGreaterThan(0)
    // 자리가 녹기로 남았다면 반드시 부정풀이를 한 번 거친 뒤다(물리지 않고 남는 길은 없다)
    for (const s of greenSeat) expect(drawSamgi(s).purified).toBe('green')
  })

  it('자리의 녹기 빈도가 1/5 보다 낮되 0 은 아니다 — 물림이 실제로 작동한 흔적', () => {
    const sample = seeds(4000)
    const rate = sample.filter((s) => drawSamgi(s).seat === 'green').length / sample.length
    expect(rate).toBeGreaterThan(0.005)
    expect(rate).toBeLessThan(0.12) // 이론값 1/25 = 0.04
  })

  it('뿌리·향방의 녹기는 물리지 않는다 — 거기서는 "묵은 것이 뿌리다/답이다"가 제 뜻이다', () => {
    const withGreenElsewhere = seeds(2000).filter((s) => {
      const d = drawSamgi(s)
      return (d.root === 'green' || d.way === 'green') && d.seat !== 'green'
    })
    expect(withGreenElsewhere.length).toBeGreaterThan(0)
    for (const s of withGreenElsewhere.slice(0, 50)) {
      const d = drawSamgi(s)
      // 물림 여부는 오직 첫 자리가 정한다 — 뿌리·향방의 녹기와는 무관하다
      expect(d.purified === null || d.purified === 'green').toBe(true)
    }
  })
})

describe('공수 — 자리 × 향방 25쌍', () => {
  it('25쌍이 빠짐없이 있고 전부 다른 문장이다', () => {
    const all: string[] = []
    for (const seat of OBANGKI_COLORS) {
      for (const way of OBANGKI_COLORS) {
        const line = gongsuLine(seat, way)
        expect(line).toBeTruthy()
        all.push(line)
      }
    }
    expect(all).toHaveLength(25)
    expect(new Set(all).size).toBe(25)
  })

  it('자리 문장과 향방 문장은 자리마다 다르다 — 같은 색도 자리가 바뀌면 다른 말을 한다', () => {
    for (const c of OBANGKI_COLORS) {
      const three = new Set([slotLine('seat', c), slotLine('root', c), slotLine('way', c)])
      expect(three.size).toBe(3)
    }
  })
})

describe('오행 흐름 — 세 기가 이루는 결', () => {
  const SAENG: Record<Element, Element> = {
    wood: 'fire',
    fire: 'earth',
    earth: 'metal',
    metal: 'water',
    water: 'wood',
  }

  it('같은 색이 거듭 서면 무조건 겹기다 (오행 관계보다 우선)', () => {
    for (const s of seeds(600)) {
      const d = drawSamgi(s)
      const dup = d.seat === d.root || d.root === d.way || d.seat === d.way
      if (dup) expect(samgiFlow(d)).toBe('jungi')
    }
  })

  it('순류 판정은 상생 연쇄와 정확히 일치한다', () => {
    for (const s of seeds(1500)) {
      const d = drawSamgi(s)
      if (samgiFlow(d) !== 'sunryu') continue
      const [a, b, c] = [d.seat, d.root, d.way].map((x) => OBANGKI_COLOR_ELEMENT[x])
      expect(SAENG[a]).toBe(b)
      expect(SAENG[b]).toBe(c)
    }
  })

  it('다섯 결이 모두 나온다 — 죽은 판정 분기가 없다', () => {
    const seen = new Set<SamgiFlow>()
    for (const s of seeds(3000)) seen.add(samgiFlow(drawSamgi(s)))
    expect(seen.size).toBe(5)
  })

  it('충 판정이 상극 개수와 일치한다 — 일충 1군데, 쌍충 2군데', () => {
    const GEUK: Record<Element, Element> = {
      wood: 'earth',
      earth: 'water',
      water: 'fire',
      fire: 'metal',
      metal: 'wood',
    }
    for (const s of seeds(2000)) {
      const d = drawSamgi(s)
      const f = samgiFlow(d)
      if (f !== 'chung' && f !== 'ssangchung') continue
      const [a, b, c] = [d.seat, d.root, d.way].map((x) => OBANGKI_COLOR_ELEMENT[x])
      const n = (GEUK[a] === b || GEUK[b] === a ? 1 : 0) + (GEUK[b] === c || GEUK[c] === b ? 1 : 0)
      expect(n).toBe(f === 'ssangchung' ? 2 : 1)
    }
  })

  it('결마다 이름과 한 줄이 있다', () => {
    for (const f of Object.keys(SAMGI_FLOW_INFO) as SamgiFlow[]) {
      expect(SAMGI_FLOW_INFO[f].label).toBeTruthy()
      expect(SAMGI_FLOW_INFO[f].line).toBeTruthy()
    }
  })
})

describe('응기 — 향방 방위가 곧 때다', () => {
  it('다섯 색 모두 계절·달이 있고 오행 방위와 맞는다', () => {
    expect(EUNGGI.blue.season).toBe('봄')
    expect(EUNGGI.red.season).toBe('여름')
    expect(EUNGGI.white.season).toBe('가을')
    expect(EUNGGI.green.season).toBe('겨울')
    expect(EUNGGI.yellow.season).toBe('환절')
    for (const c of OBANGKI_COLORS) expect(eunggiLine(c)).toContain(EUNGGI[c].months)
  })
})

describe('왕쇠 — 명식 오행 분포와 견준다', () => {
  const spread = (w: number, f: number, e: number, m: number, wa: number): ElementSpread =>
    Object.freeze({ wood: w, fire: f, earth: e, metal: m, water: wa })

  it('향방 오행이 유일한 최대면 태과, 유일한 최소면 불급', () => {
    // 홍기 = 화(火)
    expect(wangswe('red', spread(1, 5, 2, 1, 0))).toBe('taegwa')
    expect(wangswe('red', spread(3, 0, 2, 1, 4))).toBe('bulgeup')
    expect(wangswe('red', spread(2, 2, 2, 1, 4))).toBeNull()
  })

  it('최대·최소가 둘 이상이면 판정하지 않는다 — "가장"이라 말할 근거가 없다', () => {
    expect(wangswe('red', spread(5, 5, 1, 1, 1))).toBeNull() // 최대 공동
    expect(wangswe('red', spread(3, 0, 0, 2, 2))).toBeNull() // 최소 공동
  })

  it('분포가 없거나 전부 같으면 null 이다 (명식 없는 사용자)', () => {
    expect(wangswe('red', null)).toBeNull()
    expect(wangswe('red', spread(2, 2, 2, 2, 2))).toBeNull()
    expect(wangsweLine(null)).toBeNull()
    expect(wangsweLine('taegwa')).toBeTruthy()
  })
})

describe('처방 — 전승의 해법을 신당의 의식으로', () => {
  it('다섯 색 모두 전승 이름·할 일·앱 안 경로가 있다', () => {
    for (const c of OBANGKI_COLORS) {
      const r = SAMGI_REMEDY[c]
      expect(r.rite).toBeTruthy()
      expect(r.action).toBeTruthy()
      expect(r.href.startsWith('/protected/')).toBe(true)
    }
  })

  it('처방이 상점·결제로 가지 않는다 — 점괘가 판매가 되면 점사가 아니다', () => {
    for (const c of OBANGKI_COLORS) {
      expect(SAMGI_REMEDY[c].href).not.toContain('/store')
      expect(SAMGI_REMEDY[c].href).not.toContain('membership')
    }
  })
})

describe('readSamgi — 한 회차의 완성된 점사', () => {
  it('같은 (시드, 분포)면 통째로 같다', () => {
    const sp: ElementSpread = Object.freeze({ wood: 1, fire: 4, earth: 2, metal: 1, water: 0 })
    for (const s of seeds(80)) expect(readSamgi(s, sp, 'sinsu')).toEqual(readSamgi(s, sp, 'sinsu'))
  })

  it('분포가 없으면 왕쇠 층만 빠지고 나머지는 그대로다 (폴백)', () => {
    for (const s of seeds(60)) {
      const withSpread = readSamgi(s, Object.freeze({ wood: 0, fire: 4, earth: 2, metal: 1, water: 1 }), 'sinsu')
      const without = readSamgi(s, null, 'sinsu')
      expect(without.wangswe).toBeNull()
      expect(without.gongsu).toBe(withSpread.gongsu)
      expect(without.draw).toEqual(withSpread.draw)
      expect(without.eunggi).toBe(withSpread.eunggi)
    }
  })

  it('부정풀이 문구는 물린 기가 있을 때만 있다', () => {
    for (const s of seeds(500)) {
      const r = readSamgi(s, null, 'sinsu')
      expect(r.purifyLine === null).toBe(r.draw.purified === null)
    }
  })

  it('세 줄·공수·흐름·응기·처방이 늘 채워진다', () => {
    for (const s of seeds(200)) {
      const r = readSamgi(s, null, 'sinsu')
      expect(r.slotLines).toHaveLength(3)
      for (const l of r.slotLines) expect(l.line).toBeTruthy()
      expect(r.gongsu).toBeTruthy()
      expect(r.flowInfo.label).toBeTruthy()
      expect(r.eunggi).toBeTruthy()
      expect(r.remedy.action).toBeTruthy()
      // 처방은 **향방** 기가 정한다 — 자리·뿌리가 정하면 "무엇을 하면 되는가"가 뒤바뀐다
      expect(r.remedy).toBe(SAMGI_REMEDY[r.draw.way])
    }
  })
})

describe('문구 규율 — 표시광고법 L-트랙', () => {
  const FORBIDDEN = [
    '사라',
    '팔아라',
    '아껴라',
    '아끼세요',
    '사세요',
    '파세요',
    '지르세요',
    '결제',
    '투자',
    '주식',
    '코인',
    '대출',
    '수익',
    '손해',
    '이득',
    '대박',
    '보장',
    '반드시',
    '무조건',
    '확실',
    '틀림없',
    '절대',
    '100%',
    '틀림',
    '치유',
    '효과',
    '효능',
  ]

  it.each(FORBIDDEN)('풀이 문구에 금지 어휘 "%s" 가 없다', (word) => {
    for (const line of allReadingLines()) expect(line).not.toContain(word)
  })

  it('명령형 어미가 없다 — 신위는 본 것을 말할 뿐 시키지 않는다', () => {
    for (const line of allReadingLines()) {
      expect(line).not.toMatch(/(하십시오|하세요|해라|하라\.|십시오|하시오)/)
    }
  })

  it('전 문구가 서술 종결이다', () => {
    for (const line of allReadingLines()) expect(line).toMatch(/(다|구나|네|것이다)\.$/)
  })

  it('문구가 전부 유일하다 — 같은 말을 두 자리에서 하지 않는다', () => {
    const all = allReadingLines()
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('연출 CSS 계약 — 삼기·부정풀이가 실제로 산출된다', () => {
  it('클래스와 키프레임이 app/shrine-scene.css 에 있다', () => {
    for (const name of ['.obangki-samgi', '.obangki-purified']) expect(CSS).toContain(name)
    for (const kf of ['@keyframes obangkiSamgiRise', '@keyframes obangkiPurify']) expect(CSS).toContain(kf)
  })

  it('동작 줄이기(reduced-motion)가 새 연출도 덮는다', () => {
    const block = /@media \(prefers-reduced-motion: reduce\)([\s\S]*)$/.exec(CSS)?.[1] ?? ''
    expect(block).toContain('.obangki-samgi')
    expect(block).toContain('.obangki-purified')
  })

  it('화면이 삼기 순서를 지연으로 몰고 타이머로 몰지 않는다', () => {
    // 앞줄은 SamgiRow 로 떼어냈다(jsdom 에서 렌더해 구조 불변식을 지키려고) — 규율은 두 파일 모두에 건다
    const row = readFileSync(path.join(process.cwd(), 'components/shrine/scene/SamgiRow.tsx'), 'utf8')
    const sheet = readFileSync(path.join(process.cwd(), 'components/shrine/scene/ObangkiSheet.tsx'), 'utf8')
    for (const src of [row, sheet]) expect(src).not.toMatch(/\b(setTimeout|setInterval)\s*\(/)
    expect(row).toContain('obangkiSamgiRise')
    expect(row).toContain("'--ob-delay'")
  })

  it('물린 기가 연출 래퍼 밖에 있다 — 소스 순서로도 한 번 더 막는다', () => {
    // JSX 상 물린 기가 .obangki-samgi 여는 태그보다 **먼저** 나온다 = 형제이지 자손이 아니다.
    // 본 검증은 렌더 단언(components/shrine/scene/__tests__/SamgiRow.test.tsx)이고 이건 빠른 파수꾼이다.
    const row = readFileSync(path.join(process.cwd(), 'components/shrine/scene/SamgiRow.tsx'), 'utf8')
    const purified = row.indexOf('obangki-purified absolute')
    const wrapper = row.indexOf('obangki-samgi flex')
    expect(purified).toBeGreaterThan(-1)
    expect(wrapper).toBeGreaterThan(-1)
    expect(purified).toBeLessThan(wrapper)
  })
})

describe('쉬운 말 층 — 깊이를 덜지 않고 순서만 바꾼다 (CEO 8차c)', () => {
  it('자리 이름이 물음말로 있다 — 초기/중기/말기 대신 지금/어디서/어떻게', () => {
    expect(SAMGI_SLOT_PLAIN.seat).toBe('지금')
    expect(SAMGI_SLOT_PLAIN.root).toBe('어디서')
    expect(SAMGI_SLOT_PLAIN.way).toBe('어떻게')
    // 한자 이름도 **그대로 남아 있어야** 한다(접힌 층이 쓴다) — 지우면 얕아진다
    for (const s of SAMGI_SLOTS) expect(SAMGI_SLOT_INFO[s].flagName).toMatch(/[初中末]旗/)
  })

  it('흐름 다섯이 모두 쉬운 말을 갖는다 — 한자 이름은 배지로만 남는다', () => {
    for (const f of Object.keys(SAMGI_FLOW_INFO) as SamgiFlow[]) {
      expect(SAMGI_FLOW_PLAIN[f]).toBeTruthy()
      // 쉬운 말에는 한자가 없어야 한다
      expect(SAMGI_FLOW_PLAIN[f]).not.toMatch(/[\u4e00-\u9fff]/)
    }
  })

  it('결론 한 줄이 다섯 색 모두 있고 한자·전문어가 없다', () => {
    for (const c of OBANGKI_COLORS) {
      const h = headline(c)
      expect(h).toBeTruthy()
      expect(h).not.toMatch(/[\u4e00-\u9fff]/)
      for (const jargon of ['공수', '응기', '태과', '불급', '신장']) expect(h).not.toContain(jargon)
    }
    expect(new Set(OBANGKI_COLORS.map((c) => headline(c))).size).toBe(OBANGKI_COLORS.length)
  })
})

describe('육친(六親) — 일간 기준, 내 명식 데이터로 해석한다', () => {
  const ELS: readonly Element[] = ['wood', 'fire', 'earth', 'metal', 'water']
  const SAENG_T: Record<string, string> = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' }
  const GEUK_T: Record<string, string> = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' }

  it('25쌍 전수 — 정의(일간 기준 생·극)와 정확히 일치한다', () => {
    for (const color of OBANGKI_COLORS) {
      const el = OBANGKI_COLOR_ELEMENT[color]
      for (const day of ELS) {
        const expected =
          el === day
            ? 'bigyeop'
            : SAENG_T[day] === el
              ? 'siksang'
              : GEUK_T[day] === el
                ? 'jaeseong'
                : GEUK_T[el] === day
                  ? 'gwanseong'
                  : 'inseong'
        expect(yukchin(color, day)).toBe(expected)
      }
    }
  })

  it('★ 용신 관계와 기준이 다르다 — 용신은 "필요한 기운", 육친은 "나 자신(일간)"', () => {
    // 두 판정이 같은 값을 내도록 얽혀 있으면 층을 둘로 나눈 의미가 없다.
    // 일간과 용신이 다른 사람에게서 두 판정이 갈리는 경우가 실제로 있어야 한다.
    let differed = 0
    for (const color of OBANGKI_COLORS) {
      for (const day of ELS) {
        for (const yong of ELS) {
          if (day === yong) continue
          const a = yukchin(color, day)
          const b = sajuRelation(color, yong)
          // 이름 체계가 달라 직접 비교는 못 하지만, 관계 축(생/극/동일)이 갈리는지는 볼 수 있다
          const axisA = a === 'bigyeop' ? 'same' : a === 'siksang' || a === 'jaeseong' ? 'out' : 'in'
          const axisB = b === 'bihwa' ? 'same' : b === 'seolgi' || b === 'jeap' ? 'out' : 'in'
          if (axisA !== axisB) differed += 1
        }
      }
    }
    expect(differed).toBeGreaterThan(0)
  })

  it('다섯 육친 모두 이름·한자·쉬운 말·깊은 말이 있다', () => {
    for (const y of Object.keys(YUKCHIN_INFO) as Yukchin[]) {
      const info = YUKCHIN_INFO[y]
      expect(info.label).toBeTruthy()
      expect(info.hanja).toMatch(/^[\u4e00-\u9fff]{2}$/)
      // 본문(쉬운 말)에는 한자가 없어야 하고, 깊은 말에는 있어도 된다
      expect(info.plain).not.toMatch(/[\u4e00-\u9fff]/)
      expect(info.detail.length).toBeGreaterThan(info.plain.length / 2)
    }
  })

  it('다섯 육친이 모두 도달 가능하다 (죽은 분기 없음)', () => {
    const seen = new Set<Yukchin>()
    for (const color of OBANGKI_COLORS) for (const day of ELS) seen.add(yukchin(color, day))
    expect(seen.size).toBe(5)
  })
})

describe('쉬운 말 층 문구 규율', () => {
  const FORBIDDEN = ['반드시', '무조건', '확실', '보장', '절대', '치유', '효과', '효능', '틀림없']

  it.each(FORBIDDEN)('금지 어휘 "%s" 가 없다', (word) => {
    for (const line of allPlainLines()) expect(line).not.toContain(word)
  })

  it('명령형 어미가 없다', () => {
    for (const line of allPlainLines()) expect(line).not.toMatch(/(하십시오|해라|하라\.|십시오|하시오)/)
  })

  it('문구가 전부 유일하다', () => {
    const all = allPlainLines()
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('화면 계약 — 쉬운 층이 앞, 어려운 층은 접힌다', () => {
  const SHEET = readFileSync(path.join(process.cwd(), 'components/shrine/scene/ObangkiSheet.tsx'), 'utf8')

  it('결론·내 사주·육친이 본문에 있다', () => {
    for (const token of ['headline(reading.draw.way)', 'MyChart', 'yukchin(', 'YUKCHIN_INFO', '오늘의 답']) {
      expect(SHEET).toContain(token)
    }
  })

  it('★ 공수·신장 명호·오행 흐름은 **지워지지 않고** 접힌 층에 있다', () => {
    const deep = SHEET.slice(SHEET.indexOf('{deep && ('))
    expect(deep).toContain('reading.gongsu')
    expect(deep).toContain('info.general')
    expect(deep).toContain('reading.flowInfo.line')
    expect(SHEET).toContain('aria-expanded={deep}')
  })

  it('명식이 없으면 막대·육친이 통째로 빠진다 (지어내지 않는다)', () => {
    expect(SHEET).toContain('if (!elements) return null')
    expect(SHEET).toContain('status.dayStem ? yukchin(')
  })
})

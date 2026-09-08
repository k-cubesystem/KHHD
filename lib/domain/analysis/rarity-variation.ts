/**
 * 「이 사주만의 특별한 기운」 희소성(rarity) 문구의 결정론적 변주.
 *
 * 프롬프트에 예시가 하나만 박혀 있으면 모델이 그 한 문장으로 수렴한다
 * (실측: 거의 모든 사용자에게 «100명 중 3명 정도만 가지는 극강의 지성과 실행력이 결합된
 * 조합이에요» 가 나왔다). 그래서 명식마다 다른 «틀»을 골라 프롬프트에 주입한다.
 *
 * 🔴 Math.random 금지 — 같은 명식은 항상 같은 틀이어야 한다. 풀이는 캐시되고
 * 재열람되므로, 같은 사람이 다시 열었을 때 희소성 문구의 틀이 바뀌면 안 된다.
 */

/** 희소성 스케일 틀 하나. */
interface RarityScaleForm {
  /** 이 틀을 가르는 불변 조각. 분산 검증(테스트)이 이걸로 틀을 식별한다. */
  readonly signature: string
  /** variant 는 시드에서 파생된 부호 없는 32비트 정수. */
  readonly render: (variant: number) => string
}

const SCALE_FORMS: readonly RarityScaleForm[] = [
  {
    signature: '백 명 가운데',
    render: (variant) => `백 명 가운데 ${2 + (variant % 6)}명쯤만 타고나는`,
  },
  {
    signature: '열 명 중 하나',
    render: () => '열 명 중 하나 있을까 한',
  },
  {
    signature: '천 명을 살펴도',
    render: (variant) => `천 명을 살펴도 ${8 + (variant % 23)}명 남짓한`,
  },
  {
    signature: '육십갑자 안에서도',
    render: () => '같은 육십갑자 안에서도 손에 꼽는',
  },
  {
    signature: '사주쟁이가 1년에',
    render: () => '사주쟁이가 1년에 몇 번 못 보는',
  },
  {
    signature: '스무 명에 한 명꼴',
    render: () => '스무 명에 한 명꼴로만 나타나는',
  },
]

/** 스케일 틀 식별 조각 목록 — 틀이 실제로 분산되는지 재는 데 쓴다. */
export const RARITY_SCALE_SIGNATURES: readonly string[] = SCALE_FORMS.map((form) => form.signature)

/** 특성 두 가지를 어느 각도로 묶을지에 대한 힌트. 상투 조합(지성+실행력)으로의 수렴을 막는다. */
export const RARITY_ANGLE_HINTS: readonly string[] = [
  '기질의 대비 — 차가운 성질과 뜨거운 성질이 한 명식에 같이 앉아 있는 지점',
  '드러난 재능과 아직 안 쓴 재능이 맞물리는 지점',
  '때를 기다리는 힘 — 늦게 트이는 자리와 그 값',
  '사람을 끌어당기는 결 — 관계에서 먼저 드러나는 성질',
  '위기에서 오히려 또렷해지는 구조',
  '꾸준함이 쌓여 복이 되는 자리',
]

/** 프롬프트에 주입할 희소성 지시. */
export interface RarityDirective {
  /** 모델이 그대로 살려 써야 할 희소성 스케일 문구. */
  scaleLine: string
  /** 결합할 특성 두 가지를 고를 서술 각도. */
  angleHint: string
}

/** FNV-1a 32비트. 문자열 → 부호 없는 32비트 정수. */
function hashSeed(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/**
 * 같은 해시에서 서로 독립적인 스트림 3개를 뽑는다(틀·숫자·각도가 같이 움직이면 변주가 죽는다).
 * 마지막 `>>> 0` 은 필수 — XOR 결과는 부호 있는 32비트라 음수가 나오고, 음수를 % 하면 인덱스가 샌다.
 */
function mix(hash: number, salt: number): number {
  return ((Math.imul(hash ^ salt, 2654435761) >>> 0) ^ (hash >>> 13)) >>> 0
}

/**
 * 명식 문자열에서 희소성 문구의 틀과 서술 각도를 결정론적으로 고른다.
 * @param seedInput 사주 팔자 간지 문자열 등, 그 사람을 유일하게 가리키는 명식 문자열.
 */
export function deriveRarityDirective(seedInput: string): RarityDirective {
  const hash = hashSeed(seedInput)

  const form = SCALE_FORMS[mix(hash, 0x9e3779b1) % SCALE_FORMS.length]
  const scaleLine = form.render(mix(hash, 0x85ebca6b))
  const angleHint = RARITY_ANGLE_HINTS[mix(hash, 0xc2b2ae35) % RARITY_ANGLE_HINTS.length]

  return { scaleLine, angleHint }
}

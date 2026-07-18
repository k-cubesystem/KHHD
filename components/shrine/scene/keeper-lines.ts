/**
 * 신당지기 즉답 대사 풀 — AI 호출 없이 즉시 반응 (ZERO-LATENCY).
 * AI(FLASH)는 백그라운드 기억 기록만 담당. 여기 대사는 사전 정의.
 */

import type { Element } from '@/lib/domain/shrine/types'
import { EL_KO } from '@/lib/domain/shrine/energy'

function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]
}

/** 아이템 탭 반응 (점화) */
export function litLine(itemName: string, element: Element): string {
  return `${itemName}에 불을 밝히니 <em>${EL_KO[element]} 기운</em>이 살아나는구려.`
}

/** 금속(풍경·방울) 탭 반응 */
const METAL_TAP = [
  '맑은 소리가 <em>金 기운</em>을 부르오. 댕그렁—',
  '쇳소리가 잡기를 물리치는구려.',
  '이 울림, 서쪽 바람을 닮았소.',
] as const

const GENERIC_TAP = ['가만히 두어도 복은 스며드는 법이오.', '손길이 닿을 때마다 신당이 깨어나오.'] as const

export function tapLine(element: Element | null, seed: number): string {
  if (element === 'metal') return pick(METAL_TAP, seed)
  return pick(GENERIC_TAP, seed)
}

/** 신당지기에게 공물을 건넸을 때 */
const GIVE_LINES = [
  '오호, 이 귀한 것을 내게 주는 겐가. 고맙게 받겠소 — <em>복이 두 배로</em> 돌아갈 것이오.',
  '정성이 갸륵하구려. 신령께서 굽어보실 것이오.',
  '잘 받았소. 오늘 밤 좋은 꿈을 꾸실 게요.',
] as const
export function giveLine(seed: number): string {
  return pick(GIVE_LINES, seed)
}

/** 신당지기 탭 대사 (연타 카운트 기반) */
const CHAT_LINES = [
  '무슨 고민이 있으신가. 편히 말해보시게.',
  '오늘 서쪽으로 걸으면 좋은 소식이 있을 것이오.',
  '제단의 촛불을 한번 밝혀보시게.',
  '보관함의 놋방울을 꺼내면 金 기운에 이로울 것이오.',
] as const

/** 5연타 이스터에그 */
export const KEEPER_SNEEZE = '에취—! 어허, 간지럽소. 그만 두드리시게.'
export const KEEPER_TAP_LIMIT = 5

export function keeperTapLine(tapCount: number): string {
  return CHAT_LINES[tapCount % CHAT_LINES.length]
}

/** 테마 전환/입장 인사 */
export const GREETINGS: Record<string, string> = {
  choga: '소박한 초가에도 복은 깃드는 법. 오늘도 잘 오셨소.',
  banga: '어서 오시게. 오늘 일진은 <em>병오(丙午)</em> — 부족한 기운을 아껴 쓰시게.',
  yonggung: '깊은 물의 궁에 잘 오셨소. <em>수(水)</em>가 그대의 화기를 식혀주는구려.',
  dokkaebi: '밤 숲의 불빛이 그대를 반기오. 도깨비도 <em>金</em> 없는 자에겐 방망이를 빌려주지 않는 법.',
  seolbit: '눈빛 어린 새벽 서고요. <em>金</em>의 고요가 마음을 씻어주는 자리니, 천천히 머무시게.',
  daljip: '보름달이 마당을 데우는구려. <em>土</em>의 온기가 두터우니 오늘은 마음이 놓이겠소.',
  hongsal: '홍살문을 지나 드셨구려. <em>火</em>의 붉은 기둥이 삿된 것을 물리치니 염려 놓으시게.',
  byeolbat: '별밭이 내려앉은 천문각이오. 하늘의 이치를 읽는 자리니, 큰 뜻을 물으시게.',
}
export function greetingFor(packCode: string): string {
  return GREETINGS[packCode] ?? GREETINGS.choga
}

/**
 * 놋방울(deity_greeting) 배치 시 — 主神이 이름을 불러 맞이한다.
 * name 이 없으면 일반 인사로 폴백.
 */
export function personalGreeting(packCode: string, name: string | null, deityName: string | null): string {
  if (!name) return greetingFor(packCode)
  const who = deityName ? `<em>${deityName}</em>이(가) ` : ''
  return `${who}놋방울 소리에 고개를 드오. <em>${name}</em>님, 어서 오시게 — 기다리고 있었소.`
}

/** 공명 발동 시 */
export function resonanceLine(element: Element): string {
  return `오호… 세 ${EL_KO[element]} 기운이 서로를 부르는구려. <em>공명</em>이 일어났소!`
}

/** 오래 가만히 있을 때 (idle) — 소리 없이 잔잔하게 */
const IDLE = [
  '향 내음이 은은하구려…',
  '바람이 잦아드는구나.',
  '오늘 하루도 무탈하시길.',
  '제단의 불빛이 곱소.',
  '가끔은 이렇게 앉아 쉬는 것도 좋은 법이오.',
] as const
export function idleLine(seed: number): string {
  return pick(IDLE, seed)
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { passUsageFeatures } from '@/components/store/payment-guide-model'
import { NARRATIVE_CACHE_DAYS } from '@/lib/domain/circle/narrative'
import { formatFeatureCost, type FeatureCostKey } from '@/lib/domain/payment/feature-costs'
import { PASS_VALID_DAYS, formatPassUnits } from '@/lib/domain/entitlement/pass'
import { COMPATIBILITY_CACHE_DAYS, SAJU_CACHE_HOURS } from '@/lib/domain/payment/cache-windows'
import { LATE_CANCEL_FEE_RATE, WITHDRAWAL_PERIOD_DAYS, chargeRefundPolicyLine } from '@/lib/domain/payment/self-cancel'
import { THEME_CACHE_DAYS } from '@/lib/domain/theme-fortune/themes'
import { logger } from '@/lib/utils/logger'

export const metadata: Metadata = {
  title: '이용권 안내 · 환불 정책',
  description: '청담해화당 이용권의 사용처·유효기간·양도 제한·취소 및 환불 정책',
}

export const revalidate = 300

interface PassPackRow {
  name: string
  credits: number
  price: number
  valid_days: number | null
}

interface MembershipRow {
  name: string
  price: number
  monthly_passes: number
}

/**
 * 이용권 유의사항·취소/환불 정책 — 결제 심사(충전업종 가이드 유의사항 4) 캡처 대상이기도 하다.
 * 🔴 숫자는 전부 단일 출처(DB·feature-costs·self-cancel·pass.ts)에서 읽는다. 여기에 숫자를 손으로 적지 않는다.
 */
async function loadProducts(): Promise<{ packs: PassPackRow[]; memberships: MembershipRow[] }> {
  const supabase = await createClient()
  const [packsRes, membershipsRes] = await Promise.all([
    supabase
      .from('price_plans')
      .select('name, credits, price, valid_days')
      .eq('product_kind', 'pass')
      .eq('is_active', true)
      .order('price', { ascending: true }),
    supabase
      .from('membership_plans')
      .select('name, price, monthly_passes')
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
  ])
  if (packsRes.error) logger.error('[pass-policy] 이용권 상품 조회 실패', { message: packsRes.error.message })
  if (membershipsRes.error) {
    logger.error('[pass-policy] 멤버십 조회 실패', { message: membershipsRes.error.message })
  }
  return {
    packs: (packsRes.data ?? []) as PassPackRow[],
    memberships: (membershipsRes.data ?? []) as MembershipRow[],
  }
}

/**
 * 같은 풀이를 다시 요청해도 이용권을 쓰지 않는 기간 — 각 서버 액션의 캐시 판정이 보는 상수 그대로.
 * 🔴 «이미 본 풀이는 다시 열면 무료»라고 조건 없이 적으면, 기간이 지나 이용권이 다시 나간 사람에게 거짓이 된다.
 */
const REUSE_WINDOW: Partial<Record<FeatureCostKey, string>> = {
  saju: `${SAJU_CACHE_HOURS}시간`,
  compatibility: `${COMPATIBILITY_CACHE_DAYS}일`,
  themeFortune: `${THEME_CACHE_DAYS}일`,
  circleNarrative: `${NARRATIVE_CACHE_DAYS}일`,
  togetherNarrative: `${NARRATIVE_CACHE_DAYS}일`,
}

/** 저장본을 돌려주는 길이 없는 풀이 — 실행할 때마다 새로 풀고 이용권을 쓴다. */
const ALWAYS_FRESH: readonly FeatureCostKey[] = ['face', 'palm', 'fengshui', 'wealth', 'samhap']

export default async function PassPolicyPage() {
  const { packs, memberships } = await loadProducts()
  const lateRefundPercent = Math.round((1 - LATE_CANCEL_FEE_RATE) * 100)
  // 🔴 사용처는 손으로 고르지 않는다 — 주문 확인 화면과 같은 목록(장 수·최소 등급 포함)을 그대로 그린다.
  const usage = passUsageFeatures()
  const reuseWindows = usage.flatMap((f) => (REUSE_WINDOW[f.key] ? [`${f.label} ${REUSE_WINDOW[f.key]}`] : []))
  const alwaysFresh = usage.filter((f) => ALWAYS_FRESH.includes(f.key)).map((f) => f.label)

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <article className="prose prose-invert prose-sm sm:prose-base mx-auto max-w-3xl prose-headings:text-gold-200 prose-strong:text-gold-300 prose-a:text-gold-500 hover:prose-a:text-gold-300">
        <Link
          href="/"
          className="mb-8 inline-flex items-center text-sm text-muted-foreground no-underline hover:text-gold-500"
        >
          ← 홈으로 돌아가기
        </Link>

        <h1>이용권 안내 · 환불 정책</h1>
        <p className="text-muted-foreground">
          이 안내는 <Link href="/terms">이용약관</Link> 제2조·제4조·제6조·제7조를 쉽게 풀어 쓴 것입니다. 둘이 다르면
          이용약관이 우선합니다.
        </p>

        <h2>1. 이용권이란</h2>
        <ul>
          <li>
            청담해화당이 직접 제공하는 <strong>풀이 서비스 1회를 이용할 수 있는 권리</strong>입니다. 풀이마다 쓰는 장
            수는 아래 사용처와 같습니다.
          </li>
          <li>오늘의 운세·신년운세는 {formatFeatureCost('today')}입니다.</li>
        </ul>
        <h3>사용처 — 풀이별 장 수</h3>
        <ul>
          {usage.map((f) => (
            <li key={f.key}>
              {f.label} — {formatPassUnits(f.cost)}
              {f.minTierLabel ? ` (${f.minTierLabel} 멤버십부터)` : ''}
            </li>
          ))}
        </ul>
        <h3>이용권을 쓰지 않는 경우</h3>
        <ul>
          <li>분석 기록에 보관된 풀이를 다시 열어 보는 데는 이용권을 쓰지 않습니다.</li>
          <li>
            같은 사람·같은 조건의 풀이를 정해진 기간 안에 다시 요청하면 보관된 풀이를 보여 드리고 이용권을 쓰지 않습니다
            — {reuseWindows.join(' / ')}.
          </li>
          <li>그 기간이 지났거나 새 풀이를 직접 요청하면 그 풀이의 장 수만큼 씁니다.</li>
          <li>{alwaysFresh.join(' · ')} — 실행할 때마다 새로 풀기 때문에 그때마다 이용권을 씁니다.</li>
        </ul>

        <h2>2. 이용권을 얻는 방법</h2>
        <h3>개별 이용권 (한 번 결제)</h3>
        {packs.length > 0 ? (
          <ul>
            {packs.map((p) => (
              <li key={p.name}>
                {p.name} — {p.price.toLocaleString('ko-KR')}원 · 결제일로부터 {p.valid_days ?? PASS_VALID_DAYS}일 이내
                사용
              </li>
            ))}
          </ul>
        ) : (
          <p>상점의 이용권 탭에서 구매할 수 있어요. 결제일로부터 {PASS_VALID_DAYS}일 이내에 쓰실 수 있습니다.</p>
        )}
        <h3>멤버십 (매달 자동 결제)</h3>
        {memberships.length > 0 ? (
          <ul>
            {memberships.map((m) => (
              <li key={m.name}>
                {m.name} — 월 {m.price.toLocaleString('ko-KR')}원 · 결제 주기마다 이용권 {m.monthly_passes}장
              </li>
            ))}
          </ul>
        ) : null}
        <ul>
          <li>
            멤버십 이용권은 <strong>그 결제 주기 안에서만</strong> 쓸 수 있고, 다음 주기로 넘어가지 않습니다(주기마다
            새로 채워져요).
          </li>
          <li>개별 이용권과 멤버십 이용권은 따로 보관되며, 둘 다 있으면 기한이 먼저 끝나는 쪽부터 씁니다.</li>
        </ul>

        <h2>3. 유의사항</h2>
        <ul>
          <li>
            개별 이용권의 유효기간은 <strong>결제일로부터 {PASS_VALID_DAYS}일</strong>입니다. 기간이 지나면 풀이에 쓸 수
            없습니다.
          </li>
          <li>
            이용권은 <strong>다른 회원에게 양도하거나 되팔 수 없고</strong>, 청담해화당 서비스에서만 쓸 수 있으며,
            현금으로 바꿀 수 없습니다(환불은 아래 4항에 따릅니다).
          </li>
          <li>회사가 무료로 드린 이용권(가입 선물·친구 추천 선물 등)은 환불 대상이 아닙니다.</li>
          <li>풀이가 오류로 끝나지 못하면 쓴 이용권은 자동으로 돌려드립니다. 이때 유효기간은 늘어나지 않습니다.</li>
        </ul>

        <h2>4. 취소 및 환불</h2>
        <ul>
          <li>
            <strong>{chargeRefundPolicyLine()}</strong> 환불 금액은 «결제 금액 ÷ 구매한 장 수 × 쓰지 않은 장 수»로
            계산합니다({WITHDRAWAL_PERIOD_DAYS}일이 지나면 그 {lateRefundPercent}%).
          </li>
          <li>이미 쓴 이용권은 「전자상거래법」 제17조 제2항에 따라 청약철회가 제한됩니다.</li>
          <li>
            멤버십을 해지하면 이번 결제 주기가 끝날 때까지 이용할 수 있습니다. 즉시 해지를 고르면 «지난 기간 비율»과
            «이번 주기 이용권 사용 비율» 중 큰 쪽을 뺀 나머지를 환불합니다.
          </li>
          <li>
            환불은 <strong>결제한 수단(카드)으로</strong> 돌려드립니다. 회사는 3영업일 안에 처리하며, 카드사 반영 기간은
            카드사마다 다릅니다.
          </li>
          <li>
            취소 신청은 <Link href="/protected/payment/cancel">결제 취소</Link> ·{' '}
            <Link href="/protected/membership/cancel">멤버십 해지</Link> 화면에서 할 수 있습니다.
          </li>
        </ul>

        <p className="text-muted-foreground text-xs">사업자: 큐브시스템 · 문의는 서비스 내 1:1 문의로 남겨 주세요.</p>
      </article>
    </div>
  )
}

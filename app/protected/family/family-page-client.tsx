'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addFamilyMember, deleteFamilyMember, updateFamilyMember } from '@/app/actions/user/family'
import { type FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import { MemberRow, type MemberEnergyHint } from '@/components/family/member-row'
import { MissionDetailSheet } from '@/components/family/mission-detail-sheet'
import type { CirclesOverview } from '@/app/actions/circle/circles'
import { CirclePanel } from '@/components/family/circle-panel'
import { BokUpsellModal } from '@/components/shared/bok-upsell-modal'
import { canAddRelationship } from '@/app/actions/payment/membership'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { UserPlus, Plus, X, Users, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { ZodiacTimeSelect } from '@/components/zodiac-time-select'
import { FiveAvatarSelector } from '@/components/family/five-avatar-selector'
import { GuestCTACard } from '@/components/guest-cta-card'
import { GA } from '@/lib/analytics/ga4'
import {
  MEMBER_CATEGORIES,
  MEMBER_CATEGORY_META,
  toMemberCategory,
  type MemberCategory,
} from '@/lib/domain/family/member-category'

interface EditingMember {
  id: string
  name: string
  relationship: string
  birth_date: string
  birth_time: string
  calendar_type: string
  is_leap_month: boolean
  gender: string
  job?: string
  hobby?: string
  avatar_id?: string
}

/**
 * 등록 폼의 관계 — 고른 갈래(가족·지인)에 맞는 것만 보인다. 값은 예전 목록 그대로(부·모·친구 …)라 저장된 데이터와 어긋나지 않는다.
 * 🔴 지인으로 등록하면서 «배우자»를 고르는 것처럼 갈래와 관계가 서로 다른 말을 하지 않게 한다(member-category.ts).
 */
const RELATIONSHIP_OPTIONS: Record<MemberCategory, readonly { value: string; label: string }[]> = {
  family: [
    { value: '자녀', label: '자녀' },
    { value: '배우자', label: '배우자' },
    { value: '부', label: '부 (아버지)' },
    { value: '모', label: '모 (어머니)' },
    { value: '형제', label: '형제' },
    { value: '자매', label: '자매' },
    { value: '기타', label: '기타' },
  ],
  acquaintance: [
    { value: '친구', label: '친구/지인' },
    { value: '연인', label: '연인' },
    { value: '동료', label: '동료' },
    { value: '기타', label: '기타' },
  ],
}

/** 수정하는 사람의 관계가 목록에 없으면(예전 데이터) 맨 앞에 붙여 빈칸으로 보이지 않게 한다. */
function relationshipOptions(category: MemberCategory, current: string) {
  const options = RELATIONSHIP_OPTIONS[category]
  return current && !options.some((o) => o.value === current)
    ? [{ value: current, label: current }, ...options]
    : options
}

function choiceClass(active: boolean): string {
  return `rounded-lg border px-3 py-2 text-[13px] transition-colors ${
    active
      ? 'border-gold-500/50 bg-gold-500/[0.12] font-bold text-gold-300'
      : 'border-white/10 bg-white/[0.02] text-ink-light/60'
  }`
}

/**
 * 달력 종류 + 윤달. 윤달 체크는 음력을 고른 순간에만 노출한다(본인 설정 폼과 동일 규약).
 * 값은 hidden input 으로 실어 보낸다 — 서버는 'true' 만 참으로 읽고, 양력이면 무시하고 false 로 저장한다.
 */
function CalendarFields({
  defaultCalendarType,
  defaultIsLeapMonth,
}: {
  defaultCalendarType: string
  defaultIsLeapMonth: boolean
}) {
  const [calendarType, setCalendarType] = useState(defaultCalendarType)
  const [isLeapMonth, setIsLeapMonth] = useState(defaultIsLeapMonth)

  return (
    <div className="space-y-1.5">
      <Select name="calendar_type" value={calendarType} onValueChange={setCalendarType}>
        <SelectTrigger className="bg-black/30 border-white/10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="solar">양력</SelectItem>
          <SelectItem value="lunar">음력</SelectItem>
        </SelectContent>
      </Select>
      {calendarType === 'lunar' && (
        <label className="flex items-center gap-1.5 pt-0.5 cursor-pointer">
          <Checkbox
            checked={isLeapMonth}
            onCheckedChange={(v) => setIsLeapMonth(v === true)}
            className="border-gold-500/60"
          />
          <span className="text-[11px] font-light text-ink-light/70">윤달(閏月)</span>
          <input type="hidden" name="is_leap_month" value={isLeapMonth ? 'true' : 'false'} />
        </label>
      )}
    </div>
  )
}

interface FamilyPageClientProps {
  initialMembers: FamilyMemberWithMissions[]
  isGuest: boolean
  /** 그룹(직장·모임) 개요 — 「그룹만들기」. 조회 실패면 null 이고 안내만 띄운다. */
  circles?: CirclesOverview | null
  /** 사람마다 옅은·넉넉 오행(서버 계산) — 목록 한 줄의 칩. */
  energyById?: Record<string, MemberEnergyHint>
}

/**
 * 가족·인연 관리 — 가족관리 · 지인관리(한 줄) + 그룹만들기(아래, 안내글). CEO 2026-09-14 「그룹관리가 헷갈린다 — 셋으로 구분」.
 *
 * 🔴 목록은 props 에서 바로 만든다. useState 초기값으로 굳혀 두면 router.refresh 로 새 목록이 와도 바뀌지 않아
 *    등록·수정·삭제가 새로 고침 전까지 화면에 보이지 않았다(2026-09-14 재현).
 * 🔴 등록·수정 폼은 갈래(member_category)를 늘 싣는다. 싣지 않으면 서버가 가족으로 저장해 지인관리에서 등록한 사람이
 *    가족으로 가고, 지인을 수정하면 가족으로 옮겨졌다.
 */
export function FamilyPageClient({ initialMembers, isGuest, circles = null, energyById = {} }: FamilyPageClientProps) {
  const router = useRouter()
  // 사주 계산용으로 자동 생성되는 relationship='본인' 레코드는 목록·카운트·지도 입구에서 숨긴다.
  // (DB 행은 삭제하지 않는다 — 사주 계산 소비처가 재생성에 의존)
  const members = initialMembers.filter((m) => m.relationship !== '본인')
  const [tab, setTab] = useState<MemberCategory | 'circle'>('family')
  const countOf = (category: MemberCategory) =>
    members.filter((m) => toMemberCategory(m.member_category) === category).length
  const listed = tab === 'circle' ? [] : members.filter((m) => toMemberCategory(m.member_category) === tab)
  const familyCount = countOf('family')
  const groupCount = circles?.circles.length ?? 0
  const [isPending, startTransition] = useTransition()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<EditingMember | null>(null)
  const [formCategory, setFormCategory] = useState<MemberCategory>('family')
  const [relationship, setRelationship] = useState<string>(RELATIONSHIP_OPTIONS.family[0].value)
  const [selectedMember, setSelectedMember] = useState<FamilyMemberWithMissions | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | undefined>(undefined)
  const [upsellOpen, setUpsellOpen] = useState(false)
  const [relationshipStatus, setRelationshipStatus] = useState<{ current: number; limit: number }>({
    current: 0,
    limit: 3,
  })

  const refreshMembers = () => {
    router.refresh()
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingMember(null)
    setSelectedAvatarId(undefined)
  }

  const pickFormCategory = (next: MemberCategory) => {
    setFormCategory(next)
    // 갈래를 바꾸면 관계 목록이 바뀐다 — 이전 갈래의 관계가 남으면 데이터가 어긋난다.
    setRelationship(RELATIONSHIP_OPTIONS[next][0].value)
  }

  /** 가족관리·지인관리의 «추가»와 그룹만들기의 «새 사람 등록»이 같은 폼을 연다 — 처음 골라 둔 갈래만 다르다. */
  const openAddForm = async (category: MemberCategory) => {
    const result = await canAddRelationship(category)
    if (!result.allowed) {
      setRelationshipStatus({ current: result.current, limit: result.limit })
      setUpsellOpen(true)
      return
    }
    setEditingMember(null)
    setSelectedAvatarId(undefined)
    pickFormCategory(category)
    setIsFormOpen(true)
  }

  const handleAddMember = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await addFamilyMember(formData)
        GA.familyAdd()
        toast.success('함께할 인연이 등록되었습니다.')
        refreshMembers()
        closeForm()
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : String(error))
      }
    })
  }

  const handleUpdateMember = async (formData: FormData) => {
    if (!editingMember) return

    startTransition(async () => {
      try {
        formData.append('id', editingMember.id)
        await updateFamilyMember(formData)
        toast.success('인연 정보가 수정되었습니다.')
        refreshMembers()
        closeForm()
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : String(error))
      }
    })
  }

  const handleDeleteMember = async (id: string, name: string) => {
    if (!confirm(`${name}님의 정보를 삭제하시겠습니까?`)) return

    startTransition(async () => {
      try {
        await deleteFamilyMember(id)
        toast.success('인연 정보가 삭제되었습니다.')
        refreshMembers()
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : String(error))
      }
    })
  }

  const startEditing = (member: FamilyMemberWithMissions) => {
    setEditingMember({
      id: member.id,
      name: member.name,
      relationship: member.relationship,
      birth_date: member.birth_date,
      birth_time: member.birth_time || '00:00',
      calendar_type: member.calendar_type,
      is_leap_month: member.is_leap_month === true,
      gender: member.gender,
      job: member.job,
      hobby: member.hobby,
      avatar_id: member.avatar_id,
    })
    setFormCategory(toMemberCategory(member.member_category))
    setRelationship(member.relationship)
    setSelectedAvatarId(member.avatar_id)
    setIsFormOpen(false)
  }

  if (isGuest) {
    return (
      <div className="flex flex-col gap-10 w-full max-w-[480px] mx-auto py-12 px-3 pb-24">
        <GuestCTACard
          title="가입하고 인연 관리 시작하기"
          description="가족, 친구, 연인, 직장 상사까지 소중한 인연들의 사주를 체계적으로 관리하세요."
          icon={<Users className="w-8 h-8 text-primary" strokeWidth={1} />}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-[480px] mx-auto py-6 px-3 pb-24">
      {/* 상단: 설명 + 추가 버튼(가족관리·지인관리에서만 — 그룹만들기는 자기 문이 따로 있다) */}
      <section className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-lg font-serif font-medium text-ink-light">가족·인연 관리</h1>
          <p className="text-xs text-ink-light/55 font-light mt-0.5">
            {members.length > 0
              ? `${members.length}명의 소중한 인연을 관리하고 있습니다`
              : '소중한 인연의 사주를 등록해보세요'}
          </p>
        </div>
        {tab !== 'circle' && !isFormOpen && !editingMember && (
          <Button
            onClick={() => void openAddForm(tab)}
            size="sm"
            className="bg-gold-500 hover:bg-gold-500/80 text-black text-xs gap-1.5 rounded-lg"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            {MEMBER_CATEGORY_META[tab].label} 추가
          </Button>
        )}
      </section>

      {/* 기운 지도 입구 — 본인(profiles)이 항상 지도에 오르므로 레코드가 하나라도 있으면 진입 가능(지도가 self-only 빈 상태를 처리) */}
      {initialMembers.length > 0 && (
        <Link
          href="/protected/family/map"
          className="group flex items-center gap-3 rounded-xl border border-gold-500/45 bg-gold-500/[0.10] px-3.5 py-3.5 shadow-[0_0_18px_rgba(201,168,76,0.10)] hover:bg-gold-500/[0.16] hover:border-gold-500/60 transition-colors"
        >
          <span className="w-10 h-10 rounded-full bg-gold-500/20 border border-gold-500/40 grid place-items-center text-[17px] shrink-0">
            🗺️
          </span>
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="font-serif text-[14px] font-bold text-ink-light">우리 가족 기운 지도</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-200 shrink-0 tabular-nums">
                {familyCount + 1}명
              </span>
            </span>
            <span className="block text-[11px] text-gold-200/60 mt-0.5">
              나와 가족의 타고난 오행을 한 사람씩 · 서로의 기운은 AI 풀이로
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-gold-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      <div className="space-y-2">
        {/* 가족관리 · 지인관리 — 한 줄 */}
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="인연 목록 고르기">
          {MEMBER_CATEGORIES.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={choiceClass(tab === key)}
            >
              {MEMBER_CATEGORY_META[key].label}관리
              <span className="ml-1.5 text-[11px] opacity-60">{countOf(key)}</span>
            </button>
          ))}
        </div>

        {/* 그룹만들기 — 아래 한 줄 + 안내 */}
        <button
          type="button"
          onClick={() => setTab('circle')}
          aria-pressed={tab === 'circle'}
          className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
            tab === 'circle'
              ? 'border-gold-500/50 bg-gold-500/[0.12]'
              : 'border-dashed border-gold-500/30 bg-gold-500/[0.03] hover:bg-gold-500/[0.08]'
          }`}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold-500/40 bg-gold-500/20">
            <Users className="h-4 w-4 text-gold-300" strokeWidth={1.5} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="font-serif text-[14px] font-bold text-ink-light">그룹만들기</span>
              {groupCount > 0 && (
                <span className="shrink-0 rounded-full border border-gold-500/40 bg-gold-500/20 px-1.5 py-0.5 text-[10px] tabular-nums text-gold-200">
                  내 그룹 {groupCount}
                </span>
              )}
            </span>
            <span
              className="mt-0.5 block text-[11px] leading-relaxed text-ink-light/60"
              style={{ wordBreak: 'keep-all' }}
            >
              직장 동료·모임 친구처럼 함께 지내는 사람들을 한 그룹으로 묶어 서로의 기운을 나란히 봐요.
            </span>
          </span>
          <ChevronRight
            className={`h-4 w-4 shrink-0 text-gold-400 transition-transform ${tab === 'circle' ? 'rotate-90' : ''}`}
          />
        </button>
      </div>

      {/* 그룹만들기 — 직장·모임 */}
      {tab === 'circle' &&
        (circles ? (
          <CirclePanel overview={circles} onRegisterPerson={() => void openAddForm('acquaintance')} />
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 bg-surface/10 py-10 text-center text-sm text-ink-light/55">
            그룹 정보를 불러오지 못했습니다. 화면을 새로 고쳐 주세요.
          </p>
        ))}

      {/* 가족관리 · 지인관리 목록 */}
      {tab !== 'circle' && (
        <section aria-label={`${MEMBER_CATEGORY_META[tab].label} 목록`}>
          {listed.length > 0 ? (
            <div className="space-y-2">
              {listed.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  energy={energyById[member.id]}
                  onOpenRecord={() => {
                    setSelectedMember(member)
                    setIsSheetOpen(true)
                  }}
                  onEdit={startEditing}
                  onDelete={handleDeleteMember}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center bg-surface/10 border border-dashed border-white/10 rounded-xl">
              <div className="w-12 h-12 bg-surface/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-5 h-5 text-ink-light/30" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-ink-light/55 font-light">{MEMBER_CATEGORY_META[tab].emptyHint}</p>
              <p className="text-xs text-ink-light/40 font-light mt-1">
                위의 «{MEMBER_CATEGORY_META[tab].label} 추가» 버튼으로 등록해 보세요
              </p>
            </div>
          )}
        </section>
      )}

      {/* 등록/수정 폼 모달 */}
      {(isFormOpen || editingMember) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 pb-20 sm:pb-4">
          <Card className="w-full max-w-sm rounded-2xl border border-gold-500/30 bg-[#151515] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 flex flex-col max-h-[65vh]">
            <CardHeader className="py-4 border-b border-white/5 bg-surface/50 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-serif font-light text-ink-light">
                  {editingMember ? '인연 정보 수정' : `새 ${MEMBER_CATEGORY_META[formCategory].label} 등록`}
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closeForm} aria-label="닫기">
                  <X className="w-5 h-5" strokeWidth={1} />
                </Button>
              </div>
            </CardHeader>

            <form
              action={async (formData) => {
                if (editingMember) await handleUpdateMember(formData)
                else await handleAddMember(formData)
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <CardContent className="flex-1 overflow-y-auto pt-6 px-6 pb-6 space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gold-500/80">어디에 등록할까요</Label>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label="등록할 곳">
                    {MEMBER_CATEGORIES.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => pickFormCategory(key)}
                        aria-pressed={formCategory === key}
                        className={choiceClass(formCategory === key)}
                      >
                        {MEMBER_CATEGORY_META[key].label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] leading-relaxed text-ink-light/55" style={{ wordBreak: 'keep-all' }}>
                    {MEMBER_CATEGORY_META[formCategory].pickHint}
                  </p>
                  <input type="hidden" name="member_category" value={formCategory} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gold-500/80">이름</Label>
                  <Input name="name" defaultValue={editingMember?.name} required className="bg-black/20" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gold-500/80">관계</Label>
                  <Select name="relationship" value={relationship} onValueChange={setRelationship}>
                    <SelectTrigger className="bg-black/30 border-white/10">
                      <SelectValue placeholder="관계 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {relationshipOptions(formCategory, relationship).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gold-500/80">직업 (선택)</Label>
                    <Input
                      name="job"
                      defaultValue={editingMember?.job}
                      placeholder="예: 학생"
                      className="bg-black/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gold-500/80">취미 (선택)</Label>
                    <Input
                      name="hobby"
                      defaultValue={editingMember?.hobby}
                      placeholder="예: 독서"
                      className="bg-black/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gold-500/80">생년월일</Label>
                    <Input
                      name="birth_date"
                      type="date"
                      defaultValue={editingMember?.birth_date}
                      required
                      className="[color-scheme:dark] bg-black/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gold-500/80">생시</Label>
                    <ZodiacTimeSelect
                      name="birth_time"
                      defaultValue={editingMember?.birth_time}
                      className="input-manse text-white bg-black/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-start">
                  <CalendarFields
                    key={editingMember?.id ?? 'new'}
                    defaultCalendarType={editingMember?.calendar_type || 'solar'}
                    defaultIsLeapMonth={editingMember?.is_leap_month ?? false}
                  />
                  <Select name="gender" defaultValue={editingMember?.gender || 'male'}>
                    <SelectTrigger className="bg-black/30 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">남성</SelectItem>
                      <SelectItem value="female">여성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/5">
                  <Label className="text-xs text-gold-500/80 flex items-center justify-between">
                    <span>수호 정령 (오행)</span>
                    <span className="text-[10px] text-ink-light/40 font-normal">성향에 맞는 기운을 선택하세요</span>
                  </Label>
                  <FiveAvatarSelector selectedId={selectedAvatarId} onSelect={setSelectedAvatarId} />
                </div>
              </CardContent>

              <div className="p-4 border-t border-white/10 bg-[#121212] shrink-0">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-10 text-sm font-medium bg-gold-500 hover:bg-gold-500/80 text-black"
                >
                  {isPending ? '저장 중...' : '저장 완료'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Mission Detail Sheet */}
      <MissionDetailSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} member={selectedMember} />

      {/* Upsell Modal */}
      <BokUpsellModal
        open={upsellOpen}
        onClose={() => setUpsellOpen(false)}
        currentCount={relationshipStatus.current}
        limit={relationshipStatus.limit}
      />
    </div>
  )
}

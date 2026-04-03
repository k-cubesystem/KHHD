'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addFamilyMember, deleteFamilyMember, updateFamilyMember } from '@/app/actions/user/family'
import { type FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import { MemberMissionCard } from '@/components/family/member-mission-card'
import { MissionDetailSheet } from '@/components/family/mission-detail-sheet'
import { BokUpsellModal } from '@/components/shared/bok-upsell-modal'
import { canAddRelationship } from '@/app/actions/payment/membership'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserPlus, Plus, X, Users } from 'lucide-react'
import { toast } from 'sonner'
import { ZodiacTimeSelect } from '@/components/zodiac-time-select'
import { DokkaebiAvatarSelector } from '@/components/family/dokkaebi-avatar-selector'
import { GuestCTACard } from '@/components/guest-cta-card'
import { GA } from '@/lib/analytics/ga4'

interface EditingMember {
  id: string
  name: string
  relationship: string
  birth_date: string
  birth_time: string
  calendar_type: string
  gender: string
  job?: string
  hobby?: string
  avatar_id?: string
}

interface FamilyPageClientProps {
  initialMembers: FamilyMemberWithMissions[]
  isGuest: boolean
}

export function FamilyPageClient({ initialMembers, isGuest }: FamilyPageClientProps) {
  const router = useRouter()
  const [members] = useState<FamilyMemberWithMissions[]>(initialMembers)
  const [isPending, startTransition] = useTransition()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<EditingMember | null>(null)
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

  const handleAddMember = async (formData: FormData) => {
    startTransition(async () => {
      try {
        await addFamilyMember(formData)
        GA.familyAdd()
        toast.success('함께할 인연이 등록되었습니다.')
        refreshMembers()
        setIsFormOpen(false)
        setSelectedAvatarId(undefined)
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
        setEditingMember(null)
        setSelectedAvatarId(undefined)
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
      gender: member.gender,
      job: member.job,
      hobby: member.hobby,
      avatar_id: member.avatar_id,
    })
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
      {/* 상단: 설명 + 추가 버튼 */}
      <section className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-lg font-serif font-medium text-ink-light">가족 관리</h1>
          <p className="text-xs text-ink-light/50 font-light mt-0.5">
            {members.length > 0
              ? `${members.length}명의 소중한 인연을 관리하고 있습니다`
              : '소중한 인연의 사주를 등록해보세요'}
          </p>
        </div>
        {!isFormOpen && !editingMember && (
          <Button
            onClick={async () => {
              const result = await canAddRelationship()
              if (!result.allowed) {
                setRelationshipStatus({ current: result.current, limit: result.limit })
                setUpsellOpen(true)
                return
              }
              setIsFormOpen(true)
            }}
            size="sm"
            className="bg-gold-500 hover:bg-gold-500/80 text-black text-xs gap-1.5 rounded-lg"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            추가
          </Button>
        )}
      </section>

      {/* 가족 목록 */}
      <section aria-label="가족 구성원 목록">
        {members.length > 0 ? (
          <div className="space-y-3">
            {members.map((member, idx) => (
              <MemberMissionCard
                key={member.id}
                member={member}
                index={idx}
                onClick={() => {
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
            <p className="text-sm text-ink-light/40 font-light">아직 등록된 인연이 없습니다</p>
            <p className="text-xs text-ink-light/25 font-light mt-1">위의 추가 버튼으로 가족을 등록해보세요</p>
          </div>
        )}
      </section>

      {/* 등록/수정 폼 모달 */}
      {(isFormOpen || editingMember) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 pb-20 sm:pb-4">
          <Card className="w-full max-w-sm rounded-2xl border border-gold-500/30 bg-[#151515] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 flex flex-col max-h-[65vh]">
            <CardHeader className="py-4 border-b border-white/5 bg-surface/50 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-serif font-light text-ink-light">
                  {editingMember ? '인연 정보 수정' : '새 인연 등록'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setIsFormOpen(false)
                    setEditingMember(null)
                    setSelectedAvatarId(undefined)
                  }}
                >
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
                  <Label className="text-xs text-gold-500/80">이름</Label>
                  <Input name="name" defaultValue={editingMember?.name} required className="bg-black/20" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gold-500/80">관계</Label>
                  <Select name="relationship" defaultValue={editingMember?.relationship || '자녀'}>
                    <SelectTrigger className="bg-black/30 border-white/10">
                      <SelectValue placeholder="관계 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="자녀">자녀</SelectItem>
                      <SelectItem value="배우자">배우자</SelectItem>
                      <SelectItem value="부">부 (아버지)</SelectItem>
                      <SelectItem value="모">모 (어머니)</SelectItem>
                      <SelectItem value="형제">형제</SelectItem>
                      <SelectItem value="자매">자매</SelectItem>
                      <SelectItem value="친구">친구/지인</SelectItem>
                      <SelectItem value="연인">연인</SelectItem>
                      <SelectItem value="동료">동료</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
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

                <div className="grid grid-cols-2 gap-3">
                  <Select name="calendar_type" defaultValue={editingMember?.calendar_type || 'solar'}>
                    <SelectTrigger className="bg-black/30 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solar">양력</SelectItem>
                      <SelectItem value="lunar">음력</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <span>수호 도깨비 (오행)</span>
                    <span className="text-[10px] text-ink-light/40 font-normal">성향에 맞는 기운을 선택하세요</span>
                  </Label>
                  <DokkaebiAvatarSelector selectedId={selectedAvatarId} onSelect={setSelectedAvatarId} />
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

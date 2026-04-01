'use client'

import { Card } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { MoreHorizontal, Edit2, Trash2, User } from 'lucide-react'
import type { FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import { DOKKAEBI_AVATARS } from '@/components/family/dokkaebi-avatar-selector'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

interface Props {
  member: FamilyMemberWithMissions
  onClick: () => void
  onEdit: (member: FamilyMemberWithMissions) => void
  onDelete: (id: string, name: string) => void
  index: number
}

export function MemberMissionCard({ member, onClick, onEdit, onDelete, index }: Props) {
  const progress = (member.mission_completed / member.mission_total) * 100
  const avatar = DOKKAEBI_AVATARS.find((a) => a.id === member.avatar_id)

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
      <Card
        onClick={onClick}
        className="card-glass-manse cursor-pointer hover:border-primary/40 transition-all p-4 active:scale-[0.98] group"
      >
        <div className="flex items-center justify-between">
          {/* Left: Avatar & Info */}
          <div className="flex items-center gap-4 flex-1">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105 overflow-hidden"
              style={{
                backgroundColor: avatar ? `${avatar.color}15` : 'rgba(212,175,55,0.1)',
                border: `1px solid ${avatar ? `${avatar.color}30` : 'rgba(212,175,55,0.2)'}`,
              }}
            >
              <div className="w-full h-full p-2 flex items-center justify-center">
                {avatar?.icon || <User className="w-6 h-6 text-primary" />}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="font-serif font-bold text-ink-light text-lg leading-none truncate">{member.name}</h4>
                <span className="text-[10px] text-primary/70 bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                  {member.relationship}
                </span>
              </div>

              {/* Job & Hobby or Default Text */}
              <div className="text-xs text-ink-light/70 font-light truncate mb-2 min-h-[1.5em]">
                {member.job || member.hobby ? (
                  <span className="flex items-center gap-1.5">
                    {member.job && <span>{member.job}</span>}
                    {member.job && member.hobby && <span className="w-0.5 h-0.5 bg-white/20 rounded-full" />}
                    {member.hobby && <span>{member.hobby}</span>}
                  </span>
                ) : null}
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-surface/40 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-gradient-to-r from-primary/60 to-primary"
                    transition={{ duration: 0.8 }}
                  />
                </div>
                <span className="text-[10px] text-primary/80 font-medium">운대 {Math.round(progress)}%</span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col items-end gap-2 pl-2" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-ink-light/30 hover:text-primary hover:bg-primary/5"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 bg-[#1a1510] border-primary/20">
                <DropdownMenuItem
                  onClick={() => onEdit(member)}
                  className="text-xs text-ink-light/80 hover:text-primary hover:bg-primary/10 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 mr-2" />
                  수정하기
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(member.id, member.name)}
                  className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  삭제하기
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

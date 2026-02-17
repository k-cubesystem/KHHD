'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, User, Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getDestinyTargets, type DestinyTarget } from '@/app/actions/user/destiny'

interface TargetFilterProps {
  selectedTargetId: string | null
  onTargetChange: (targetId: string | null) => void
}

export function TargetFilter({ selectedTargetId, onTargetChange }: TargetFilterProps) {
  const [targets, setTargets] = useState<DestinyTarget[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTargets()
  }, [])

  const loadTargets = async () => {
    try {
      const data = await getDestinyTargets()
      setTargets(data)
    } catch (error) {
      console.error('Failed to load destiny targets:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || targets.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-ink-light/60 font-medium uppercase tracking-wide">
        분석 대상 필터
      </label>
      <Select
        value={selectedTargetId || 'ALL'}
        onValueChange={(value) => onTargetChange(value === 'ALL' ? null : value)}
      >
        <SelectTrigger className="w-full bg-surface/30 border-primary/20 text-ink-light hover:border-primary/40 h-12">
          <SelectValue placeholder="전체 보기" />
        </SelectTrigger>
        <SelectContent className="bg-surface border-primary/20">
          <SelectItem value="ALL" className="text-ink-light hover:bg-primary/10">
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-primary" />
              <span>전체 보기</span>
            </div>
          </SelectItem>
          {targets.map((target) => (
            <SelectItem
              key={target.id}
              value={target.id}
              className="text-ink-light hover:bg-primary/10"
            >
              <div className="flex items-center gap-3">
                {target.target_type === 'self' ? (
                  <User className="w-4 h-4 text-primary" />
                ) : (
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={target.avatar_url || undefined} />
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {target.name[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <span className="font-medium">{target.name}</span>
                  <span className="text-ink-light/60 text-xs ml-2">({target.relation_type})</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

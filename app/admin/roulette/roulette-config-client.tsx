'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { updateRouletteConfig } from '@/app/actions/payment/roulette'
import { Trash2, Plus, Save, RefreshCw } from 'lucide-react'

interface RouletteItem {
  id?: string
  reward_type: string
  reward_value: number
  label: string
  probability: number
  color: string
  sort_order: number
}

interface Props {
  initialConfig: RouletteItem[]
}

const COLOR_OPTIONS = [
  { label: '금색', value: '#f59e0b' },
  { label: '초록', value: '#10b981' },
  { label: '파랑', value: '#3b82f6' },
  { label: '보라', value: '#8b5cf6' },
  { label: '빨강', value: '#ef4444' },
  { label: '분홍', value: '#ec4899' },
]

export default function RouletteConfigClient({ initialConfig }: Props) {
  const [items, setItems] = useState<RouletteItem[]>(
    initialConfig.map((c, i) => ({
      ...c,
      sort_order: c.sort_order ?? i + 1,
    }))
  )
  const [saving, setSaving] = useState(false)

  const totalProb = items.reduce((sum, c) => sum + Number(c.probability), 0)
  const isValidTotal = totalProb > 0

  const handleChange = (index: number, field: keyof RouletteItem, value: any) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const handleAdd = () => {
    setItems((prev) => [
      ...prev,
      {
        reward_type: 'bokchae',
        reward_value: 1,
        label: '1만냥',
        probability: 10,
        color: '#f59e0b',
        sort_order: prev.length + 1,
      },
    ])
  }

  const handleRemove = (index: number) => {
    if (items.length <= 2) {
      toast.error('최소 2개의 항목이 필요합니다.')
      return
    }
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!isValidTotal) {
      toast.error('확률 합계는 0보다 커야 합니다.')
      return
    }

    setSaving(true)
    const result = await updateRouletteConfig(
      items.map((item, i) => ({ ...item, sort_order: i + 1 }))
    )
    setSaving(false)

    if (result.success) {
      toast.success('룰렛 설정이 저장되었습니다.')
    } else {
      toast.error(result.error || '저장에 실패했습니다.')
    }
  }

  const handleReset = () => {
    setItems([
      {
        reward_type: 'bokchae',
        reward_value: 1,
        label: '1만냥',
        probability: 40,
        color: '#f59e0b',
        sort_order: 1,
      },
      {
        reward_type: 'bokchae',
        reward_value: 3,
        label: '3만냥',
        probability: 30,
        color: '#10b981',
        sort_order: 2,
      },
      {
        reward_type: 'bokchae',
        reward_value: 5,
        label: '5만냥',
        probability: 15,
        color: '#3b82f6',
        sort_order: 3,
      },
      {
        reward_type: 'bokchae',
        reward_value: 10,
        label: '10만냥',
        probability: 10,
        color: '#8b5cf6',
        sort_order: 4,
      },
      {
        reward_type: 'miss',
        reward_value: 0,
        label: '꽝',
        probability: 5,
        color: '#ef4444',
        sort_order: 5,
      },
    ])
    toast.info('기본값으로 초기화했습니다. 저장 버튼을 눌러 적용하세요.')
  }

  return (
    <div className="space-y-4">
      {/* 확률 합계 표시 */}
      <Card
        className={`border ${isValidTotal ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">총 확률 합계</span>
            <span
              className={`text-2xl font-bold ${isValidTotal ? 'text-green-400' : 'text-red-400'}`}
            >
              {totalProb.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            * 합계가 100이 아니어도 됩니다. 각 항목의 비율로 자동 정규화됩니다.
          </p>
          {/* Visual bar */}
          <div className="mt-2 flex gap-0.5 h-3 rounded-full overflow-hidden">
            {items.map((item, i) => (
              <div
                key={i}
                style={{
                  width: `${(item.probability / totalProb) * 100}%`,
                  backgroundColor: item.color,
                }}
                title={`${item.label}: ${((item.probability / totalProb) * 100).toFixed(1)}%`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 항목 목록 */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <Card key={index} className="border-white/10">
            <CardContent className="p-4">
              <div className="grid grid-cols-12 gap-3 items-end">
                {/* 색상 */}
                <div className="col-span-1">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white/20"
                    style={{ backgroundColor: item.color }}
                  />
                </div>

                {/* 타입 */}
                <div className="col-span-2">
                  <Label className="text-xs">타입</Label>
                  <Select
                    value={item.reward_type}
                    onValueChange={(v) => {
                      handleChange(index, 'reward_type', v)
                      if (v === 'miss') {
                        handleChange(index, 'reward_value', 0)
                        handleChange(index, 'label', '꽝')
                        handleChange(index, 'color', '#ef4444')
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bokchae">복채</SelectItem>
                      <SelectItem value="miss">꽝</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 금액 (복채만) */}
                <div className="col-span-2">
                  <Label className="text-xs">복채 (만냥)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={item.reward_value}
                    onChange={(e) =>
                      handleChange(index, 'reward_value', parseInt(e.target.value) || 0)
                    }
                    disabled={item.reward_type === 'miss'}
                    className="h-8 text-xs"
                  />
                </div>

                {/* 라벨 */}
                <div className="col-span-3">
                  <Label className="text-xs">표시 이름</Label>
                  <Input
                    value={item.label}
                    onChange={(e) => handleChange(index, 'label', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>

                {/* 확률 */}
                <div className="col-span-2">
                  <Label className="text-xs">확률 가중치</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={item.probability}
                    onChange={(e) =>
                      handleChange(index, 'probability', parseFloat(e.target.value) || 0)
                    }
                    className="h-8 text-xs"
                  />
                </div>

                {/* 색상 선택 */}
                <div className="col-span-1">
                  <Label className="text-xs">색상</Label>
                  <Select value={item.color} onValueChange={(v) => handleChange(index, 'color', v)}>
                    <SelectTrigger className="h-8 text-xs px-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: c.value }}
                            />
                            {c.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 삭제 */}
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleRemove(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* 실제 확률 표시 */}
                <div className="col-span-12 text-right">
                  <span className="text-xs text-muted-foreground">
                    실제 확률:{' '}
                    {isValidTotal ? ((item.probability / totalProb) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3 justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            항목 추가
          </Button>
          <Button variant="outline" onClick={handleReset} className="gap-2 text-muted-foreground">
            <RefreshCw className="w-4 h-4" />
            기본값 복원
          </Button>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 bg-primary">
          <Save className="w-4 h-4" />
          {saving ? '저장 중...' : '설정 저장'}
        </Button>
      </div>

      {/* 안내 */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4">
          <h3 className="text-sm font-bold text-blue-400 mb-2">💡 설정 가이드</h3>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>
              • <strong>확률 가중치</strong>: 합계가 100이 아니어도 됩니다. 비율로 자동 계산됩니다.
            </li>
            <li>
              • <strong>복채</strong>: 당첨 시 사용자 지갑에 즉시 지급됩니다 (1단위 = 1만냥)
            </li>
            <li>
              • <strong>꽝</strong>: 당첨 없음. 다음날 재도전 가능
            </li>
            <li>• 변경사항은 저장 후 즉시 적용됩니다</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

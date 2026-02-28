'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ManseAdvancedResult } from '@/lib/domain/saju/manse-advanced'
import { Sparkles, TrendingUp, Calendar, Zap, Link as LinkIcon, Ban } from 'lucide-react'

interface AdvancedManseDisplayProps {
  advanced: ManseAdvancedResult
}

export function AdvancedManseDisplay({ advanced }: AdvancedManseDisplayProps) {
  return (
    <div className="space-y-6">
      {/* 세운 (년운) */}
      <Card className="bg-surface/20 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Calendar className="w-5 h-5" />
            세운(歲運) - 올해 운세
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{advanced.saewoon.year}년</span>
            <Badge variant={advanced.saewoon.fortune === 'good' ? 'default' : 'outline'}>
              {advanced.saewoon.fortune === 'great'
                ? '대길'
                : advanced.saewoon.fortune === 'good'
                  ? '길'
                  : advanced.saewoon.fortune === 'normal'
                    ? '평'
                    : '흉'}
            </Badge>
          </div>
          <p className="text-sm">{advanced.saewoon.description}</p>
        </CardContent>
      </Card>

      {/* 월운 */}
      <Card className="bg-surface/20 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <TrendingUp className="w-5 h-5" />
            월운(月運) - 이번 달 운세
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {advanced.worwoon.month}월 ({advanced.worwoon.solarTerm})
            </span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F4E5C3]"
                  style={{ width: `${advanced.worwoon.luck}%` }}
                />
              </div>
              <span className="text-sm font-medium">{advanced.worwoon.luck}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 신살 (神殺) */}
      <Card className="bg-surface/20 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            신살(神殺) - 특수 기운
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {advanced.sinsal.yeokma && <Badge variant="outline">역마살 🐎</Badge>}
            {advanced.sinsal.cheonEulGwiin && (
              <Badge variant="default" className="bg-[#D4AF37]">
                천을귀인 ⭐
              </Badge>
            )}
            {advanced.sinsal.hwagae && <Badge variant="outline">화개살 🎨</Badge>}
            {advanced.sinsal.dohwa && <Badge variant="outline">도화살 🌸</Badge>}
            {advanced.sinsal.woldeokGwiin && (
              <Badge variant="default" className="bg-[#D4AF37]">
                월덕귀인 ✨
              </Badge>
            )}
            {advanced.sinsal.munchangGwiin && <Badge variant="outline">문창귀인 📚</Badge>}
            {advanced.sinsal.hakdangGwiin && <Badge variant="outline">학당귀인 🎓</Badge>}
            {advanced.sinsal.yangin && <Badge variant="outline">양인 ⚔️</Badge>}
            {advanced.sinsal.taiji && (
              <Badge variant="default" className="bg-[#D4AF37]">
                태극귀인 ☯️
              </Badge>
            )}
            {!hasAnySinsal(advanced.sinsal) && (
              <span className="text-sm text-muted-foreground">특별한 신살이 없습니다</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 십이운성 */}
      <Card className="bg-surface/20 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Zap className="w-5 h-5" />
            십이운성 - 생명력
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">연주</div>
              <Badge variant="outline">{advanced.sibiWoonSung.year}</Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">월주</div>
              <Badge variant="outline">{advanced.sibiWoonSung.month}</Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">일주</div>
              <Badge variant="outline">{advanced.sibiWoonSung.day}</Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">시주</div>
              <Badge variant="outline">{advanced.sibiWoonSung.time}</Badge>
            </div>
          </div>
          <div className="pt-3 border-t border-primary/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">종합 운성</span>
              <Badge className="bg-gradient-to-r from-[#D4AF37] to-[#F4E5C3] text-black">
                {advanced.sibiWoonSung.overall}
              </Badge>
            </div>
            <div className="mt-2">
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F4E5C3]"
                  style={{ width: `${advanced.sibiWoonSung.strength}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">생명력: {advanced.sibiWoonSung.strength}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 합충형해 */}
      <Card className="bg-surface/20 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <LinkIcon className="w-5 h-5" />
            합충형해 - 지지 관계
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {advanced.jijiRelations.hap.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">합(合) - 조화</div>
              <div className="flex flex-wrap gap-2">
                {advanced.jijiRelations.hap.map((h, i) => (
                  <Badge key={i} variant="default" className="bg-primary">
                    {h}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {advanced.jijiRelations.chung.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">충(沖) - 충돌</div>
              <div className="flex flex-wrap gap-2">
                {advanced.jijiRelations.chung.map((c, i) => (
                  <Badge key={i} variant="destructive">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {advanced.jijiRelations.hyung.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">형(刑) - 형벌</div>
              <div className="flex flex-wrap gap-2">
                {advanced.jijiRelations.hyung.map((h, i) => (
                  <Badge key={i} variant="outline" className="border-primary-dark text-primary-dark">
                    {h}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {advanced.jijiRelations.hae.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">해(害) - 해로움</div>
              <div className="flex flex-wrap gap-2">
                {advanced.jijiRelations.hae.map((h, i) => (
                  <Badge key={i} variant="outline" className="border-gold-700 text-gold-700">
                    {h}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {advanced.jijiRelations.samhap.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">삼합(三合) - 강력한 조화</div>
              <div className="flex flex-wrap gap-2">
                {advanced.jijiRelations.samhap.map((s, i) => (
                  <Badge key={i} variant="default" className="bg-gradient-to-r from-[#D4AF37] to-[#F4E5C3] text-black">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {!hasAnyRelations(advanced.jijiRelations) && (
            <p className="text-sm text-muted-foreground">특별한 지지 관계가 없습니다</p>
          )}
        </CardContent>
      </Card>

      {/* 공망 */}
      {advanced.gongmang.hasGongmang && (
        <Card className="bg-surface/20 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Ban className="w-5 h-5" />
              공망(空亡) - 빈 공간
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">공망은 기운이 작용하지 않는 빈 공간입니다.</p>
            <div>
              <div className="text-xs text-muted-foreground mb-1">연주 공망</div>
              <div className="flex flex-wrap gap-2">
                {advanced.gongmang.yearGongmang.map((g, i) => (
                  <Badge key={i} variant="outline">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">일주 공망</div>
              <div className="flex flex-wrap gap-2">
                {advanced.gongmang.dayGongmang.map((g, i) => (
                  <Badge key={i} variant="outline">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
            {advanced.gongmang.affectedPillars.length > 0 && (
              <p className="text-xs text-primary-dark">
                ⚠️ 영향받는 지지: {advanced.gongmang.affectedPillars.join(', ')}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function hasAnySinsal(sinsal: any): boolean {
  return Object.values(sinsal).some((v) => v === true)
}

function hasAnyRelations(relations: any): boolean {
  return Object.values(relations).some((v: any) => Array.isArray(v) && v.length > 0)
}

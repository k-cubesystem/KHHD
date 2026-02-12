'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, Sun, Moon, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { fadeInUp } from '@/lib/animations'

export default function FortunePage() {
  const [activeTab, setActiveTab] = useState('today')

  return (
    <div className="min-h-screen bg-background relative overflow-hidden py-12 px-4">
      {/* Hanji Texture Overlay */}
      <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('/texture/hanji_noise.png')] bg-repeat" />

      <div className="relative z-10 max-w-md mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/50 border border-primary/20 backdrop-blur-sm mb-4 rounded-full">
            <Calendar className="w-4 h-4 text-primary" strokeWidth={1} />
            <span className="text-[10px] font-light text-primary tracking-[0.2em] font-sans uppercase">
              Fortune Calendar
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-light text-ink-light">운세 캘린더</h1>
          <p className="text-sm text-ink-light/60 font-light">당신의 흐름을 미리 확인하세요</p>
        </div>

        <Tabs defaultValue="today" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-surface/20 border border-white/5">
            <TabsTrigger
              value="today"
              className="font-serif font-light text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              오늘
            </TabsTrigger>
            <TabsTrigger
              value="weekly"
              className="font-serif font-light text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              주간
            </TabsTrigger>
            <TabsTrigger
              value="monthly"
              className="font-serif font-light text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
            >
              월간
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="today">
              <motion.div initial="initial" animate="animate" variants={fadeInUp}>
                <Card className="bg-surface/20 border-primary/20 card-glass-manse">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                      <Sun className="w-6 h-6 text-primary" strokeWidth={1} />
                    </div>
                    <h3 className="text-lg font-serif font-light text-ink-light">오늘의 운세</h3>
                    <p className="text-sm text-ink-light/50 font-light">
                      오늘 하루 당신에게 찾아올 기운을 분석합니다.
                      <br />
                      (준비 중)
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
            <TabsContent value="weekly">
              <motion.div initial="initial" animate="animate" variants={fadeInUp}>
                <Card className="bg-surface/20 border-primary/20 card-glass-manse">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                      <Star className="w-6 h-6 text-primary" strokeWidth={1} />
                    </div>
                    <h3 className="text-lg font-serif font-light text-ink-light">주간 운세</h3>
                    <p className="text-sm text-ink-light/50 font-light">
                      이번 주 7일간의 흐름을 미리 봅니다.
                      <br />
                      (준비 중)
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
            <TabsContent value="monthly">
              <motion.div initial="initial" animate="animate" variants={fadeInUp}>
                <Card className="bg-surface/20 border-primary/20 card-glass-manse">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                      <Moon className="w-6 h-6 text-primary" strokeWidth={1} />
                    </div>
                    <h3 className="text-lg font-serif font-light text-ink-light">월간 운세</h3>
                    <p className="text-sm text-ink-light/50 font-light">
                      이번 달, 당신이 맞이할 큰 변화를 확인하세요.
                      <br />
                      (준비 중)
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

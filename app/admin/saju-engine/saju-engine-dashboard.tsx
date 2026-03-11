'use client'

import { useState } from 'react'
import { logger } from '@/lib/utils/logger'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Zap,
  GitBranch,
  Layers,
  ChevronRight,
  TestTube2,
  ArrowRight,
  Star,
  Activity,
  Shield,
} from 'lucide-react'
import { buildSajuContext, type PersonInfo, type AnalysisType } from '@/lib/saju-engine'

// ===================== 알고리즘 플로우 데이터 =====================

const ALGORITHM_FLOW = [
  {
    step: 1,
    id: 'input',
    icon: '👤',
    title: '입력 데이터',
    color: 'border-blue-500/40 bg-blue-500/5',
    items: ['생년월일시', '성별', '음력/양력', '사용자 프로필 컨텍스트'],
  },
  {
    step: 2,
    id: 'calc',
    icon: '⚙️',
    title: '사주 계산 엔진',
    color: 'border-purple-500/40 bg-purple-500/5',
    items: ['연월일시주 60갑자', '일간(自我) 추출', '오행 분포 계산', '대운(大運) 순역행'],
    lib: 'lib/domain/saju/saju.ts',
  },
  {
    step: 3,
    id: 'relations',
    icon: '🔗',
    title: '관계 역학 네트워크',
    color: 'border-yellow-500/40 bg-yellow-500/5',
    items: ['천간합충(天干合沖)', '지지삼합·육합·방합', '충·형·파·해(沖刑破害)', '공망(空亡) 계산'],
    lib: 'lib/saju-engine/relations.ts',
  },
  {
    step: 4,
    id: 'sipseong',
    icon: '⚖️',
    title: '십성(十星) 사회심리학',
    color: 'border-orange-500/40 bg-orange-500/5',
    items: ['일간 기준 십성 계산', '신강/신약 판단', '현대 직업 매핑', '지배 십성 도출'],
    lib: 'lib/saju-engine/sipseong.ts',
  },
  {
    step: 5,
    id: 'sibjiunseong',
    icon: '〰️',
    title: '십이운성 파동 함수',
    color: 'border-green-500/40 bg-green-500/5',
    items: ['각 지지 십이운성 계산', '에너지 레벨 0-12 수치화', '생애주기 위상 판단', '행동 지침 생성'],
    lib: 'lib/saju-engine/sibjiunseong.ts',
  },
  {
    step: 6,
    id: 'sinsal',
    icon: '⚡',
    title: '신살(神殺) 스킬트리',
    color: 'border-red-500/40 bg-red-500/5',
    items: ['역마살 → 글로벌 이동력', '화개살 → 딥워크 능력', '백호대살 → 극한 리더십', '귀문관살 → 초감각 직관'],
    lib: 'lib/saju-engine/sinsal-extended.ts',
  },
  {
    step: 7,
    id: 'gekguk',
    icon: '👑',
    title: '격국(格局) + 용신(用神)',
    color: 'border-amber-500/40 bg-amber-500/5',
    items: ['자평진전 격국 판별', '억부/조후/통관 용신', '희신·기신 추출', '개운법 처방'],
    lib: 'lib/domain/saju/saju-analysis.ts',
  },
  {
    step: 8,
    id: 'context',
    icon: '📋',
    title: '컨텍스트 빌더 (GNN-RAG)',
    color: 'border-cyan-500/40 bg-cyan-500/5',
    items: ['모든 계산 결과 통합', '물상론 NLG 데이터 주입', '분석 유형별 지침 생성', '구조화된 텍스트 출력'],
    lib: 'lib/saju-engine/context-builder.ts',
  },
  {
    step: 9,
    id: 'prompt',
    icon: '🧠',
    title: '마스터 프롬프트 (DB)',
    color: 'border-pink-500/40 bg-pink-500/5',
    items: ['haehwajigi_master 키', '해화지기 페르소나', '무속인 화법 원칙', '{{analysisType}} 분기'],
    lib: 'ai_prompts 테이블',
  },
  {
    step: 10,
    id: 'output',
    icon: '✨',
    title: 'Gemini 2.0 → 분석 결과',
    color: 'border-gold/40 bg-gold/5',
    items: ['물상론 시적 표현', '현대적 직업 매핑', '구체적 개운법', '희망과 용기의 조언'],
  },
]

const ANALYSIS_TYPES: { type: AnalysisType; label: string; icon: string }[] = [
  { type: 'SAJU_FULL', label: '종합 사주', icon: '🔯' },
  { type: 'DAILY_FORTUNE', label: '오늘의 운세', icon: '☀️' },
  { type: 'MONTHLY_FORTUNE', label: '월간 운세', icon: '🌙' },
  { type: 'YEARLY_FORTUNE', label: '신년 운세', icon: '🎋' },
  { type: 'TREND_LOVE', label: '애정운', icon: '💕' },
  { type: 'TREND_CAREER', label: '직장·사업운', icon: '💼' },
  { type: 'TREND_WEALTH', label: '재물운', icon: '💰' },
  { type: 'COMPATIBILITY', label: '궁합', icon: '👫' },
]

// ===================== 컴포넌트 =====================

export function SajuEngineDashboard() {
  const [activeStep, setActiveStep] = useState<number | null>(null)
  const [testPerson, setTestPerson] = useState<PersonInfo>({
    name: '테스트',
    birthDate: '1990-05-15',
    birthTime: '14:30',
    gender: 'male',
    isSolar: true,
    job: '개발자',
    focusAreas: '사업운, 재물운',
  })
  const [testResult, setTestResult] = useState<ReturnType<typeof buildSajuContext> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<AnalysisType>('SAJU_FULL')

  const runTest = () => {
    setIsLoading(true)
    try {
      const result = buildSajuContext(testPerson)
      setTestResult(result)
    } catch (e) {
      logger.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8 pb-16">
      {/* 시스템 개요 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: Brain,
            label: '마스터 프롬프트',
            value: '1개',
            sub: '(기존 11개→1개 통합)',
            color: 'text-purple-400',
          },
          { icon: Layers, label: '계산 모듈', value: '5개', sub: '관계·십성·운성·신살·격국', color: 'text-blue-400' },
          { icon: GitBranch, label: '분석 유형', value: '12종', sub: '단일 엔진으로 처리', color: 'text-green-400' },
          { icon: Zap, label: '알고리즘 계층', value: '10단계', sub: 'GNN-RAG 파이프라인', color: 'text-yellow-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface border border-primary/10 rounded-xl p-4">
            <stat.icon className={`w-6 h-6 ${stat.color} mb-2`} />
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-ink-light text-sm">{stat.label}</div>
            <div className="text-ink-muted text-xs mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* 알고리즘 플로우 다이어그램 */}
      <div className="bg-surface border border-primary/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-primary mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          해화지기 알고리즘 파이프라인
        </h2>
        <div className="space-y-2">
          {ALGORITHM_FLOW.map((step, idx) => (
            <div key={step.id}>
              <motion.div
                className={`border rounded-xl p-4 cursor-pointer transition-all ${step.color} ${activeStep === idx ? 'ring-1 ring-primary/40' : ''}`}
                onClick={() => setActiveStep(activeStep === idx ? null : idx)}
                whileHover={{ x: 4 }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{step.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink-muted font-mono">STEP {step.step}</span>
                      <span className="text-sm font-semibold text-ink-light">{step.title}</span>
                      {step.lib && (
                        <span className="text-xs text-ink-muted font-mono bg-black/30 px-2 py-0.5 rounded">
                          {step.lib}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-ink-muted transition-transform ${activeStep === idx ? 'rotate-90' : ''}`}
                  />
                </div>
                <AnimatePresence>
                  {activeStep === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 pt-3 border-t border-white/10"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        {step.items.map((item) => (
                          <div key={item} className="flex items-center gap-2 text-xs text-ink-muted">
                            <span className="text-primary">▸</span> {item}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
              {idx < ALGORITHM_FLOW.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowRight className="w-4 h-4 text-primary/30 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 실시간 엔진 테스트 */}
      <div className="bg-surface border border-primary/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-primary mb-6 flex items-center gap-2">
          <TestTube2 className="w-5 h-5" />
          실시간 엔진 테스트
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 입력 */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'name' as const, label: '이름', type: 'text' },
                { key: 'birthDate' as const, label: '생년월일', type: 'date' },
                { key: 'birthTime' as const, label: '출생시간', type: 'time' },
                { key: 'job' as const, label: '직업', type: 'text' },
              ].map(({ key, label, type }) => (
                <div key={key}>
                  <label className="text-xs text-ink-muted mb-1 block">{label}</label>
                  <input
                    type={type}
                    value={(testPerson[key] as string) || ''}
                    onChange={(e) => setTestPerson((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full bg-background border border-primary/20 rounded-lg px-3 py-2 text-sm text-ink-light focus:outline-none focus:border-primary/50"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-ink-muted mb-1 block">성별</label>
              <div className="flex gap-2">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setTestPerson((p) => ({ ...p, gender: g }))}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-all ${testPerson.gender === g ? 'border-primary bg-primary/20 text-primary' : 'border-primary/20 text-ink-muted'}`}
                  >
                    {g === 'male' ? '남성' : '여성'}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={runTest}
              disabled={isLoading}
              className="w-full py-3 bg-primary text-background font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {isLoading ? '계산 중...' : '⚡ 엔진 실행'}
            </button>
          </div>

          {/* 결과 */}
          <div className="space-y-3">
            {testResult ? (
              <>
                <ResultCard
                  title="사주 원국"
                  icon="🔯"
                  content={`${testResult.sajuData.pillars.year.ganji} ${testResult.sajuData.pillars.month.ganji} ${testResult.sajuData.pillars.day.ganji} ${testResult.sajuData.pillars.time.ganji}\n일간: ${testResult.sajuData.dayMaster} (${testResult.mulsang.dayMasterSymbol})`}
                />
                <ResultCard
                  title="오행 분포"
                  icon="⚖️"
                  content={Object.entries(testResult.sajuData.elementsDistribution)
                    .map(([e, c]) => `${e}:${c}`)
                    .join(' ')}
                />
                <ResultCard title="관계 역학" icon="🔗" content={testResult.analysis.relations.summary} />
                <ResultCard title="십성 분석" icon="📊" content={testResult.analysis.sipseong.summary} />
                <ResultCard
                  title="신살 스킬트리"
                  icon="⚡"
                  content={
                    testResult.analysis.sinsal.length > 0
                      ? testResult.analysis.sinsal.map((s) => `${s.name}: ${s.modernSkillTree}`).join('\n')
                      : '특별 신살 없음'
                  }
                />
                <ResultCard
                  title="격국/용신"
                  icon="👑"
                  content={`${testResult.analysis.gekguk.hanja} (${testResult.analysis.gekguk.strengthLabel})\n${testResult.analysis.yongsin ? `용신: ${testResult.analysis.yongsin.yongsinKorean}` : '용신 분석 필요'}`}
                />
                <ResultCard
                  title="십이운성 파동"
                  icon="〰️"
                  content={testResult.analysis.sibjiunseong.waveDescription}
                />
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-ink-muted text-sm py-20">
                ⚡ 엔진 실행 버튼을 누르면 실시간 계산 결과가 표시됩니다
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 분석 유형 커버리지 */}
      <div className="bg-surface border border-primary/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          마스터 프롬프트 커버리지 (기존 11개 → 단일 엔진)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ANALYSIS_TYPES.map(({ type, label, icon }) => (
            <motion.div
              key={type}
              whileHover={{ scale: 1.02 }}
              className={`border rounded-xl p-3 cursor-pointer transition-all ${selectedType === type ? 'border-primary bg-primary/10' : 'border-primary/20 bg-background'}`}
              onClick={() => setSelectedType(type)}
            >
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-xs font-medium text-ink-light">{label}</div>
              <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
                <Star className="w-3 h-3" /> haehwajigi_master
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 프롬프트 컨텍스트 미리보기 */}
      {testResult && (
        <div className="bg-surface border border-primary/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            AI에 주입되는 사주 컨텍스트 미리보기
          </h2>
          <pre className="bg-background rounded-xl p-4 text-xs text-ink-muted font-mono whitespace-pre-wrap overflow-auto max-h-96 border border-primary/10">
            {testResult.promptContext}
          </pre>
        </div>
      )}
    </div>
  )
}

function ResultCard({ title, icon, content }: { title: string; icon: string; content: string }) {
  return (
    <div className="bg-background border border-primary/10 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <span>{icon}</span>
        <span className="text-xs font-semibold text-primary">{title}</span>
      </div>
      <p className="text-xs text-ink-muted whitespace-pre-wrap">{content}</p>
    </div>
  )
}

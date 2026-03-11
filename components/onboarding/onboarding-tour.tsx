'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

interface Step {
  target: string
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

interface OnboardingTourProps {
  shouldShow: boolean
  onComplete: () => void
}

const ONBOARDING_STEPS: Step[] = [
  {
    target: '.wallet-section',
    title: '부적 지갑',
    content: '어서오세요! 여기가 당신의 부적 지갑입니다. 매일 출석만 해도 부적이 쌓여요!',
    placement: 'bottom',
  },
  {
    target: '.daily-checkin-card',
    title: '일일 출석',
    content: '매일 출석하고 부적을 받으세요! 7일 연속 출석하면 특별 보너스가 있어요.',
    placement: 'top',
  },
  {
    target: '.fortune-energy-gauge',
    title: '운세 게이지',
    content: '8가지 운세를 모두 채우면 대운(大運)이 옵니다! 금빛 기운을 채워보세요.',
    placement: 'top',
  },
  {
    target: 'body',
    title: '준비 완료!',
    content: '이제 준비됐습니다! 오늘부터 당신의 운세를 직접 관리해보세요. 행운이 함께하길 바랍니다.',
    placement: 'bottom',
  },
]

export function OnboardingTour({ shouldShow, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (shouldShow) {
      setTimeout(() => {
        setIsVisible(true)
        updateTargetRect()
      }, 500)
    }
  }, [shouldShow])

  useEffect(() => {
    if (isVisible) {
      updateTargetRect()
    }
  }, [currentStep, isVisible])

  const updateTargetRect = () => {
    const step = ONBOARDING_STEPS[currentStep]
    const element = document.querySelector(step.target)
    if (element) {
      setTargetRect(element.getBoundingClientRect())
    } else {
      setTargetRect(null)
    }
  }

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = () => {
    setIsVisible(false)
    onComplete()
  }

  if (!shouldShow || !isVisible) return null

  const step = ONBOARDING_STEPS[currentStep]
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1
  const isFirstStep = currentStep === 0

  // 툴팁 위치 계산
  let tooltipStyle: React.CSSProperties = {}
  if (targetRect) {
    const placement = step.placement || 'bottom'
    const offset = 20

    switch (placement) {
      case 'top':
        tooltipStyle = {
          top: targetRect.top - offset,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translate(-50%, -100%)',
        }
        break
      case 'bottom':
        tooltipStyle = {
          top: targetRect.bottom + offset,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translate(-50%, 0)',
        }
        break
      case 'left':
        tooltipStyle = {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left - offset,
          transform: 'translate(-100%, -50%)',
        }
        break
      case 'right':
        tooltipStyle = {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + offset,
          transform: 'translate(0, -50%)',
        }
        break
    }
  } else {
    // center
    tooltipStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    }
  }

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]"
        onClick={handleSkip}
      />

      {/* Spotlight (하이라이트) */}
      {targetRect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
            borderRadius: 12,
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[10000] max-w-sm"
          style={tooltipStyle}
        >
          <div className="bg-surface border-2 border-primary rounded-xl shadow-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-primary font-serif">{step.title}</h3>
              <button onClick={handleSkip} className="text-ink-light/50 hover:text-ink-light transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <p className="text-sm text-ink-light/80 leading-relaxed mb-4">{step.content}</p>

            {/* Progress */}
            <div className="flex items-center gap-1 mb-4">
              {ONBOARDING_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    idx === currentStep ? 'bg-primary' : idx < currentStep ? 'bg-primary/50' : 'bg-ink-light/20'
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3">
              <Button onClick={handleSkip} variant="ghost" size="sm" className="text-ink-light/60 hover:text-ink-light">
                건너뛰기
              </Button>

              <div className="flex gap-2">
                {!isFirstStep && (
                  <Button onClick={handleBack} variant="outline" size="sm" className="border-primary/30 text-primary">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    이전
                  </Button>
                )}

                <Button
                  onClick={handleNext}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-ink-900 font-bold"
                >
                  {isLastStep ? '시작하기' : '다음'}
                  {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Arrow */}
          {targetRect && step.placement !== undefined && (
            <div
              className={`absolute w-3 h-3 bg-surface border-primary transform rotate-45 ${
                step.placement === 'top'
                  ? 'bottom-[-7px] left-1/2 -translate-x-1/2 border-b-2 border-r-2'
                  : step.placement === 'bottom'
                    ? 'top-[-7px] left-1/2 -translate-x-1/2 border-t-2 border-l-2'
                    : step.placement === 'left'
                      ? 'right-[-7px] top-1/2 -translate-y-1/2 border-t-2 border-r-2'
                      : 'left-[-7px] top-1/2 -translate-y-1/2 border-b-2 border-l-2'
              }`}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </>
  )
}

'use client'

import { memo, type SVGProps } from 'react'

interface IconProps {
  className?: string
  size?: number
}

type SvgIconProps = IconProps & Omit<SVGProps<SVGSVGElement>, 'className'>

const defaultProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const IconSaju = memo(function IconSaju({ className, size = 24, ...rest }: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...defaultProps}
      {...rest}
    >
      {/* 4개의 기둥 */}
      <line x1="5" y1="6" x2="5" y2="20" />
      <line x1="9.67" y1="6" x2="9.67" y2="20" />
      <line x1="14.33" y1="6" x2="14.33" y2="20" />
      <line x1="19" y1="6" x2="19" y2="20" />
      {/* 상단 보 (가로대) */}
      <line x1="3" y1="6" x2="21" y2="6" />
      {/* 지붕 */}
      <path d="M2 6 L12 2 L22 6" />
      {/* 바닥 */}
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  )
})

const IconGunghap = memo(function IconGunghap({ className, size = 24, ...rest }: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...defaultProps}
      {...rest}
    >
      {/* 외원 */}
      <circle cx="12" cy="12" r="10" />
      {/* 태극 S자 커브 */}
      <path d="M12 2 A5 5 0 0 1 12 12 A5 5 0 0 0 12 22" />
      {/* 음양 점 */}
      <circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="1.5" />
    </svg>
  )
})

const IconGwansang = memo(function IconGwansang({ className, size = 24, ...rest }: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...defaultProps}
      {...rest}
    >
      {/* 얼굴 윤곽 */}
      <path d="M6 9 C6 4.5 18 4.5 18 9 L18 14 C18 19.5 6 19.5 6 14 Z" />
      {/* 왼쪽 눈 */}
      <path d="M9 10.5 Q10 9.5 11 10.5" />
      {/* 오른쪽 눈 */}
      <path d="M13 10.5 Q14 9.5 15 10.5" />
      {/* 코 */}
      <line x1="12" y1="11.5" x2="12" y2="14" />
      {/* 입 */}
      <path d="M10 16 Q12 17.5 14 16" />
    </svg>
  )
})

const IconSongeum = memo(function IconSongeum({ className, size = 24, ...rest }: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...defaultProps}
      {...rest}
    >
      {/* 손바닥 윤곽 */}
      <path d="M7 20 L5.5 13 C5 11 6 9 7 8 L8 7.5" />
      <path d="M8 7.5 C8 6 9 4 10 3.5" />
      <path d="M10 3.5 C10.5 3 11 3 11.5 3.5 L12 5" />
      <path d="M12 5 C12 3.5 13 2.5 14 3 C14.5 3.2 14.5 4 14.5 5" />
      <path d="M14.5 5 C14.5 3.5 15.5 3 16 3.5 C16.5 4 16.5 5 16.5 6" />
      <path d="M16.5 6 C17 5 18 5 18.5 5.5 C19 6 19 7 18.5 8.5 L17 13 L16 20" />
      <line x1="7" y1="20" x2="16" y2="20" />
      {/* 생명선 */}
      <path d="M9 9 Q10 13 8 16" />
      {/* 감정선 */}
      <path d="M9 9 Q12 8 16 9.5" />
      {/* 두뇌선 */}
      <path d="M9 11 Q12 11.5 15 11" />
    </svg>
  )
})

const IconPungsu = memo(function IconPungsu({ className, size = 24, ...rest }: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...defaultProps}
      {...rest}
    >
      {/* 큰 산 */}
      <path d="M2 16 L8 5 L14 16" />
      {/* 작은 산 */}
      <path d="M10 16 L15 8 L20 16" />
      {/* 물결 1 */}
      <path d="M2 19 Q5 17.5 8 19 Q11 20.5 14 19 Q17 17.5 20 19" />
      {/* 물결 2 */}
      <path d="M3 22 Q6 20.5 9 22 Q12 23.5 15 22 Q18 20.5 21 22" />
    </svg>
  )
})

const IconBok = memo(function IconBok({ className, size = 24, ...rest }: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...defaultProps}
      {...rest}
    >
      {/* 도장 사각형 */}
      <rect x="3" y="3" width="18" height="18" rx="1" />
      {/* 福 간결 표현 - 示 (왼쪽) */}
      <line x1="6" y1="7" x2="6" y2="17" />
      <line x1="5" y1="9" x2="7.5" y2="9" />
      <line x1="5" y1="13" x2="7.5" y2="13" />
      {/* 畐 (오른쪽) - 간결한 격자 */}
      <rect x="10" y="7" width="8" height="10" rx="0.5" />
      <line x1="10" y1="10" x2="18" y2="10" />
      <line x1="10" y1="13" x2="18" y2="13" />
      <line x1="14" y1="7" x2="14" y2="17" />
      {/* 상단 一 */}
      <line x1="10" y1="5" x2="18" y2="5" />
    </svg>
  )
})

const IconDancheong = memo(function IconDancheong({ className, size = 24, ...rest }: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...defaultProps}
      {...rest}
    >
      {/* 외원 */}
      <circle cx="12" cy="12" r="10" />
      {/* 꽃잎 8개 (연꽃/모란 대칭) */}
      <path d="M12 5 Q14 8 12 10 Q10 8 12 5" />
      <path d="M12 19 Q14 16 12 14 Q10 16 12 19" />
      <path d="M5 12 Q8 10 10 12 Q8 14 5 12" />
      <path d="M19 12 Q16 10 14 12 Q16 14 19 12" />
      <path d="M7.05 7.05 Q9.5 7.5 10.5 10.5 Q7.5 9.5 7.05 7.05" />
      <path d="M16.95 7.05 Q14.5 7.5 13.5 10.5 Q16.5 9.5 16.95 7.05" />
      <path d="M7.05 16.95 Q7.5 14.5 10.5 13.5 Q9.5 16.5 7.05 16.95" />
      <path d="M16.95 16.95 Q16.5 14.5 13.5 13.5 Q14.5 16.5 16.95 16.95" />
      {/* 중심 원 */}
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
})

const IconHanji = memo(function IconHanji({ className, size = 24, ...rest }: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...defaultProps}
      {...rest}
    >
      {/* 두루마리 본체 */}
      <rect x="5" y="4" width="14" height="16" rx="0.5" />
      {/* 상단 말린 부분 */}
      <path d="M4 4 Q4 2 6 2 L18 2 Q20 2 20 4" />
      <ellipse cx="12" cy="4" rx="8" ry="1.5" />
      {/* 하단 말린 부분 */}
      <path d="M4 20 Q4 22 6 22 L18 22 Q20 22 20 20" />
      <ellipse cx="12" cy="20" rx="8" ry="1.5" />
      {/* 글씨 라인 */}
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="14" x2="13" y2="14" />
    </svg>
  )
})

const IconOhaeng = memo(function IconOhaeng({ className, size = 24, ...rest }: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...defaultProps}
      {...rest}
    >
      {/* 오각형 */}
      <polygon points="12,2 22,9.5 18.5,21 5.5,21 2,9.5" />
      {/* 5개의 점 (목화토금수) */}
      <circle cx="12" cy="4.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="20" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="19" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="19" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
      {/* 중심 오각별 연결선 */}
      <path d="M12 4.5 L17.5 19 L4 10.5 L20 10.5 L6.5 19 Z" strokeWidth="1" />
    </svg>
  )
})

const IconUnse = memo(function IconUnse({ className, size = 24, ...rest }: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...defaultProps}
      {...rest}
    >
      {/* 초승달 */}
      <path d="M15 4 A8 8 0 1 0 15 20 A6 6 0 1 1 15 4 Z" />
      {/* 별 */}
      <polygon points="19,3 20,6 23,6 20.5,8 21.5,11 19,9 16.5,11 17.5,8 15,6 18,6" fill="currentColor" stroke="none" />
    </svg>
  )
})

const IconInyon = memo(function IconInyon({ className, size = 24, ...rest }: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...defaultProps}
      {...rest}
    >
      {/* 왼쪽 사람 (원) */}
      <circle cx="5" cy="12" r="3" />
      {/* 오른쪽 사람 (원) */}
      <circle cx="19" cy="12" r="3" />
      {/* 인연의 실 (곡선) */}
      <path d="M8 12 Q12 5 16 12" />
      <path d="M8 12 Q12 19 16 12" />
      {/* 매듭 */}
      <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
})

const IconBokjigi = memo(function IconBokjigi({ className, size = 24, ...rest }: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      {...defaultProps}
      {...rest}
    >
      {/* 갓 챙 (넓은 타원) */}
      <ellipse cx="12" cy="16" rx="10" ry="3" />
      {/* 갓 몸통 (윗부분) */}
      <path d="M7 16 Q7 10 12 8 Q17 10 17 16" />
      {/* 갓 꼭대기 장식 */}
      <line x1="12" y1="8" x2="12" y2="5" />
      <circle cx="12" cy="4" r="1.5" />
      {/* 갓끈 */}
      <path d="M7 16 Q5 18 4 21" />
      <path d="M17 16 Q19 18 20 21" />
    </svg>
  )
})

IconSaju.displayName = 'IconSaju'
IconGunghap.displayName = 'IconGunghap'
IconGwansang.displayName = 'IconGwansang'
IconSongeum.displayName = 'IconSongeum'
IconPungsu.displayName = 'IconPungsu'
IconBok.displayName = 'IconBok'
IconDancheong.displayName = 'IconDancheong'
IconHanji.displayName = 'IconHanji'
IconOhaeng.displayName = 'IconOhaeng'
IconUnse.displayName = 'IconUnse'
IconInyon.displayName = 'IconInyon'
IconBokjigi.displayName = 'IconBokjigi'

export {
  IconSaju,
  IconGunghap,
  IconGwansang,
  IconSongeum,
  IconPungsu,
  IconBok,
  IconDancheong,
  IconHanji,
  IconOhaeng,
  IconUnse,
  IconInyon,
  IconBokjigi,
}

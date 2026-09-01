import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // [New] Premium Champagne Gold Palette (Sophisticated Luxury)
        background: 'hsl(var(--background))', // Deep Ink Black
        foreground: 'hsl(var(--foreground))', // Warm Off-White
        surface: '#16140F', // Warm Dark Grey
        primary: {
          DEFAULT: '#E8D5A0', // Muted Gold (Refined)
          dim: '#C9A84C', // Rich Gold accent
          dark: '#A8903F', // Deep Gold for depth
          light: '#FFF8E7', // Very Light Gold for gradients
        },
        secondary: {
          DEFAULT: '#C8B273', // Muted Gold (Secondary Action / Hover)
          foreground: '#1A1917',
        },
        seal: '#9E2B2B', // Dojang Red

        // [Legacy/Compat] Mapping to new system
        ink: {
          light: '#FFFFFF', // Pure White for Body Text
          DEFAULT: '#1A1A1A',
          faint: 'rgba(255, 255, 255, 0.4)',
          primary: '#E8E4DC', // 워밍 오프화이트 (rgb 232,228,220)
          900: '#181611',
          950: '#0F0F0F',
        },
        zen: {
          wood: '#1A1917',
          text: '#FFFFFF', // Map to White
          gold: '#E2D5B5', // Map to Primary
          muted: '#8C7B50',
          border: 'rgba(226, 213, 181, 0.2)',
        },
        gold: {
          // 200 은 2026-07-31 감사 A4 P1-0 — text-gold-200 이 37곳에서 쓰이는데 슬롯이 없어
          // 클래스가 아예 생성되지 않았다(빌드 청크 grep 0건 = 무증상 사망, styled-jsx 사건과 동류).
          // 값은 DESIGN.md "Gold Light — 하이라이트 텍스트" 그대로(primary.DEFAULT 와 동일) —
          // 새 색이 아니라 기존 정의색의 슬롯 등록이다.
          200: '#E8D5A0', // Gold Light (DESIGN.md)
          300: '#F4E4BA', // 파스텔 골드
          400: '#E2D5B5', // 소프트 골드
          500: '#C9A84C', // 메인 골드 (가장 많이 쓰이는 값)
          600: '#A8903F', // 미디엄 골드
          700: '#8C7B50', // 다크 골드
          metallic: '#E2D5B5',
          luxury: '#C8B273',
          antique: '#D4AF37', // 앤틱 골드 (rgb 212,175,55)
        },
        cinnabar: '#9E2B2B',
        'charcoal-deep': '#0A0A08',

        // Semantic Status Colors
        error: {
          DEFAULT: '#EF4444',
          light: 'rgba(239,68,68,0.10)',
          border: 'rgba(239,68,68,0.20)',
          text: '#FCA5A5',
        },
        success: {
          DEFAULT: '#22C55E',
          light: 'rgba(34,197,94,0.10)',
          border: 'rgba(34,197,94,0.20)',
          text: '#86EFAC',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: 'rgba(245,158,11,0.10)',
          border: 'rgba(245,158,11,0.20)',
          text: '#FCD34D',
        },
        // 🔴 값의 정본은 DESIGN.md 「Color」 — info 는 단청 청(#2D5F8A)이다.
        //    2026-09-01 정합: Tailwind 기본 파랑(#3B82F6)으로 갈라져 있던 것을 문서에 맞췄다.
        info: {
          DEFAULT: '#2D5F8A',
          light: 'rgba(45,95,138,0.12)',
          border: 'rgba(45,95,138,0.25)',
          text: '#8FB8DA',
        },

        // 오방색 (五方色) — Korean Traditional Colors
        obangsaek: {
          red: '#C83232',
          blue: '#2D5F8A',
          yellow: '#D4A017',
          white: '#F5F0E8',
          black: '#1A1714',
        },

        // 복 등급 (Bok Tier) — 오방색 성장 사다리. 정본은 DESIGN.md 「Bok Tier Colors」,
        // lib/config/design-tokens.ts BOK_TIER_COLORS 와 값이 같아야 한다.
        bok: {
          seed: '#8C7B50', // 황토 — 흙 속 씨앗 (土 간색)
          sprout: '#4E9A6B', // 목(木) 청록 — WU_XING_COLORS.木 동일값
          flower: '#C84040', // 연지 홍 — Red Light
          tree: '#3F7A9E', // 창송(蒼松) 담청
          forest: '#D4A017', // 금 — 오방 황, 만복의 정점
        },
      },
      fontFamily: {
        serif: ['var(--font-noto-serif)', 'serif'],
        sans: ['Pretendard', 'var(--font-noto-sans)', 'sans-serif'],
        // DESIGN.md 「Data/Tables: JetBrains Mono」 — font-mono 가 39곳에서 쓰이는데
        // 배선이 없어 브라우저 기본 모노로 떨어지고 있었다(2026-09-01 발견).
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        display: ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.03em', fontWeight: '600' }],
        'heading-1': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        'heading-2': ['1.25rem', { lineHeight: '1.25', letterSpacing: '-0.02em', fontWeight: '600' }],
        'heading-3': ['1.125rem', { lineHeight: '1.3', letterSpacing: '-0.01em', fontWeight: '600' }],
        'heading-4': ['1rem', { lineHeight: '1.4', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['1rem', { lineHeight: '1.7', letterSpacing: '-0.02em', fontWeight: '300' }],
        body: ['0.875rem', { lineHeight: '1.6', letterSpacing: '-0.02em', fontWeight: '300' }],
        'body-sm': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '-0.01em', fontWeight: '300' }],
        caption: ['0.75rem', { lineHeight: '1.5', letterSpacing: '0em', fontWeight: '400' }],
        overline: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.08em', fontWeight: '600' }],
      },
      backgroundImage: {
        'noise-pattern':
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")",
        'hanji-texture': "url('/images/texture/cream-paper.png')", // Fallback
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      // 골드 글로우 + 도장 그림자 (globals.css → config 중앙화)
      boxShadow: {
        'gold-glow': '0 0 20px rgba(201,168,76,0.15)',
        'gold-glow-lg': '0 0 40px rgba(201,168,76,0.20)',
        dojang: '2px 2px 0 rgba(158,43,43,0.4)',
      },
      // z-index 스케일 (globals.css --z-* 와 동기화)
      zIndex: {
        base: '0',
        raised: '10',
        overlay: '20',
        sticky: '30',
        nav: '40',
        modal: '50',
        toast: '60',
      },
      // 모션 지속시간 (lib/config/motion-tokens.ts DURATION 과 동기화)
      transitionDuration: {
        micro: '75ms',
        short: '200ms',
        medium: '300ms',
        long: '500ms',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        fadeIn: 'fadeIn 1s ease-out forwards',
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require('tailwindcss-animate')],
}

export default config

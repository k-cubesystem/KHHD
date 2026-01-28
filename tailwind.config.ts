import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // 청담해화당 전용 컬러 팔레트 (Stitch 분석 기반)
        background: "#0A0A0A", // Deep Charcoal (메인 배경)
        surface: "#181611",    // 카드/패널 배경
        primary: {
          DEFAULT: "#ECB613",  // 밝은 금색 (강조)
          dim: "#C5A059",      // 차분한 금색 (본문/테두리)
          dark: "#B8860B",     // 어두운 금색
        },
        ink: {
          light: "#E5E5E5",    // 다크모드 본문
          DEFAULT: "#1A1A1A",  // 라이트모드 본문
          faint: "rgba(255, 255, 255, 0.4)",
          // Legacy Compatibility
          900: "#181611",
          950: "#0A0A0A",
        },
        seal: "#9A2A2A",       // 도장(인주) 색상

        // Legacy / Compatibility Aliases (Mapped to New System)
        gold: {
          400: "#ECB613",
          500: "#ECB613",
          600: "#B8860B",
          metallic: "#ECB613",
          luxury: "#C5A059",
        },
        zen: {
          wood: "#181611",
          text: "#E5E5E5",
          gold: "#ECB613",
          muted: "#888888",
          border: "rgba(236, 182, 19, 0.2)",
        },
        cinnabar: "#9A2A2A",
        "charcoal-deep": "#0A0A0A",
      },
      fontFamily: {
        serif: ["var(--font-noto-serif)", "serif"], // 명조체 (제목)
        sans: ["var(--font-noto-sans)", "sans-serif"], // 고딕체 (본문)
      },
      backgroundImage: {
        'hanji-texture': "url('/images/texture/cream-paper.png')", // 로컬 이미지 경로 권장
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        fadeIn: "fadeIn 1s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")], // shadcn/ui 호환
};

export default config;

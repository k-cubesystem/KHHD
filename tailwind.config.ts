import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Pretendard", "Noto Sans KR", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-noto-serif)", "serif"], // Standard Serif
        playfair: ["var(--font-playfair)", "serif"], // English Heading
        gungseo: ["var(--font-gungseo)", "Nanum Myeongjo", "serif"], // Korean Heading
        heading: ["var(--font-playfair)", "var(--font-gungseo)", "serif"], // Combined Heading
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        // Haehwadang Custom Palette (Zen & Legacy)
        zen: {
          bg: "#F9F8F5", // Warm Off-White
          text: "#2C2A29", // Soft Charcoal
          wood: "#8B6E58", // Sandalwood
          muted: "#989390", // Warm Grey
          gold: "#C5B358", // Antique Gold
          border: "#E5E3DF", // Pale Grey
          surface: "#FFFFFF",
        },
        oriental: {
          primary: "#ecb613",
          bgLight: "#f8f8f6",
          bgDark: "#1A1A1A",
          royal: "#1e2130",
          mutedGold: "#C5A059",
        },
        ink: {
          DEFAULT: "#2C2C2C", // Deep Ink Charcoal
          light: "#4A4A4A",
          lighter: "#888888",
          50: "#f6f6f7",
          100: "#e3e3e6",
          200: "#c6c6cc",
          300: "#a2a2ab",
          400: "#7c7c88",
          500: "#5d5d6b",
          600: "#494954",
          700: "#3b3b42",
          800: "#303036",
          900: "#1c1c1e", // Wet Stone
          950: "#0f0f10", // Deep Ink
        },
        gold: {
          DEFAULT: "#C5A059", // Muted Gold (from Prompt)
          light: "#E5C580",
          dim: "#8A7035",
          50: "#fbf8f1",
          100: "#F9F5E3",
          200: "#ead9b4",
          300: "#F4E4BA",
          400: "#d1a55f",
          500: "#C5A059", // Muted Gold
          600: "#a96f2d",
          700: "#875526",
          800: "#6e4525",
          900: "#3E3210",
          950: "#331e0f",
        },
        // Organic Modernism Palette
        hanji: {
          DEFAULT: "#F9F7F2", // Fibrous Paper
          dim: "#e8e6e1",
        },

        cinnabar: {
          DEFAULT: "#8E3535", // Cinnabar Red
          light: "#A94545",
        },
        dark: {
          bg: "#111111",      // 메인 배경 (거의 검정)
          card: "#1C1C1C",    // 카드 배경 (아주 어두운 회색)
          border: "#333333",  // 희미한 테두리
        },
        seal: {
          500: "#9f1239", // Seal Red
        },
      },
      borderRadius: {
        lg: "0.25rem", // Sharp edges (4px)
        md: "0.125rem", // 2px
        sm: "0.0625rem", // 1px
      },
      backgroundImage: {
        'noise': "url('/texture/noise.png')",
        'hero-gradient': "linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, #111111 100%)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.1)" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 3s ease-in-out infinite",
        breathe: "breathe 8s ease-in-out infinite",
        scan: "scanline 2s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;

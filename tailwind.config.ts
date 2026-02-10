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
        // [New] Premium Champagne Gold Palette (Sophisticated Luxury)
        background: "hsl(var(--background))", // Deep Ink Black
        foreground: "hsl(var(--foreground))", // Warm Off-White
        surface: "#1A1917",    // Warm Dark Grey
        primary: {
          DEFAULT: "#F4E4BA",  // Pastel Gold (Soft & Elegant)
          dim: "#E2D5B5",      // Slightly dimmer pastel
          dark: "#C8B273",     // Darker Gold for depth
          light: "#FFF8E7",    // Very Light Gold for gradients
        },
        secondary: {
          DEFAULT: "#C8B273",  // Muted Gold (Secondary Action / Hover)
          foreground: "#1A1917"
        },
        seal: "#8E2828",       // Dojang Red

        // [Legacy/Compat] Mapping to new system
        ink: {
          light: "#FFFFFF",    // Pure White for Body Text
          DEFAULT: "#1A1A1A",
          faint: "rgba(255, 255, 255, 0.4)",
          900: "#181611",
          950: "#0F0F0F",
        },
        zen: {
          wood: "#1A1917",
          text: "#FFFFFF",     // Map to White
          gold: "#E2D5B5",     // Map to Primary
          muted: "#8C7B50",
          border: "rgba(226, 213, 181, 0.2)",
        },
        gold: {
          400: "#E2D5B5",
          500: "#C8B273",
          600: "#8C7B50",
          metallic: "#E2D5B5",
          luxury: "#C8B273",
        },
        cinnabar: "#8E2828",
        "charcoal-deep": "#0F0F0F",
      },
      fontFamily: {
        serif: ["var(--font-noto-serif)", "serif"],
        sans: ["Pretendard", "var(--font-noto-sans)", "sans-serif"],
      },
      backgroundImage: {
        'noise-pattern': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")",
        'hanji-texture': "url('/images/texture/cream-paper.png')", // Fallback
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
  plugins: [require("tailwindcss-animate")],
};

export default config;

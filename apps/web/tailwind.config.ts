import type { Config } from "tailwindcss"

const config = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    // Mobile-first breakpoints (min-width)
    screens: {
      xs: "375px",   // iPhone SE, small phones
      sm: "375px",   // Standard mobile (same as xs for consistency)
      md: "768px",   // Tablets
      lg: "1024px",  // Desktop
      xl: "1280px",  // Large desktop
      "2xl": "1536px", // Extra large desktop
    },
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",    // 16px for mobile
        sm: "1rem",         // 16px for mobile
        md: "2rem",         // 32px for tablets
        lg: "2.5rem",       // 40px for desktop
        xl: "3rem",         // 48px for large desktop
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        textWhite: "hsl(var(--foreground))",
        borderWhite: "hsl(var(--secondary))",
        white: "hsl(var(--background))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primaryWarm: "hsl(var(--primary))",
        secondaryWarm: "hsl(var(--secondary))",
        accentWarm: "hsl(var(--accent))",
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
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        companion: {
          DEFAULT: "hsl(var(--companion))",
          foreground: "hsl(var(--companion-foreground))",
          glow: "hsl(var(--companion-glow))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 20px hsl(var(--primary) / 0.3)",
            borderColor: "hsl(var(--primary) / 0.5)"
          },
          "50%": {
            boxShadow: "0 0 40px hsl(var(--primary) / 0.6)",
            borderColor: "hsl(var(--primary))"
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
        "slide-up": "slide-up 0.2s ease-out",
        "shimmer": "shimmer 2s infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config

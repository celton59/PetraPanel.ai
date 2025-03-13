import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fadeIn": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "gradient-xy": {
          "0%, 100%": {
            "background-size": "400% 400%",
            "background-position": "left center"
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center"
          }
        },
        "shimmer": {
          "0%": {
            "backgroundPosition": "-200% 0"
          },
          "100%": {
            "backgroundPosition": "200% 0"
          }
        },
        "pulse-opacity": {
          "0%, 100%": {
            opacity: "0.6"
          },
          "50%": {
            opacity: "0.9"
          }
        },
        // Animaciones para la mascota
        "mascot-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-15%)" }
        },
        "mascot-dance": {
          "0%, 100%": { transform: "rotate(-5deg)" },
          "25%": { transform: "rotate(0deg) scale(1.05)" },
          "50%": { transform: "rotate(5deg)" },
          "75%": { transform: "rotate(0deg) scale(0.95)" }
        },
        "mascot-jump": {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "10%": { transform: "translateY(0) scale(0.9)" },
          "30%": { transform: "translateY(-30%) scale(1.1)" },
          "50%": { transform: "translateY(0) scale(1)" },
          "57%": { transform: "translateY(-7%) scale(1.05)" },
          "64%": { transform: "translateY(0) scale(1)" }
        },
        "mascot-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" }
        },
        "mascot-wave": {
          "0%": { transform: "rotate(0deg)" },
          "15%": { transform: "rotate(-15deg)" },
          "30%": { transform: "rotate(15deg)" },
          "45%": { transform: "rotate(-15deg)" },
          "60%": { transform: "rotate(15deg)" },
          "75%": { transform: "rotate(-15deg)" },
          "85%": { transform: "rotate(0deg)" }
        },
        "mascot-thinking": {
          "0%": { transform: "translateX(0) rotate(0deg)" },
          "25%": { transform: "translateX(-5%) rotate(-2deg)" },
          "50%": { transform: "translateX(0) rotate(0deg)" },
          "75%": { transform: "translateX(5%) rotate(2deg)" },
          "100%": { transform: "translateX(0) rotate(0deg)" }
        },
        "mascot-eye-blink": {
          "0%, 90%, 100%": { transform: "scaleY(1)" },
          "95%": { transform: "scaleY(0.1)" }
        },
        "mascot-smile": {
          "0%, 100%": { transform: "scaleX(1)" },
          "50%": { transform: "scaleX(1.1)" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-border": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "gradient-xy": "gradient-xy 10s ease infinite",
        "shimmer": "shimmer 8s ease-in-out infinite",
        "pulse-slow": "pulse 6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-opacity": "pulse-opacity 3s ease-in-out infinite",
        // Animaciones de la mascota
        "mascot-bounce": "mascot-bounce 2s ease-in-out infinite",
        "mascot-dance": "mascot-dance 2s ease-in-out infinite",
        "mascot-jump": "mascot-jump 3s ease-in-out infinite",
        "mascot-spin": "mascot-spin 5s linear infinite",
        "mascot-wave": "mascot-wave 2.5s ease-in-out infinite",
        "mascot-thinking": "mascot-thinking 3s ease-in-out infinite",
        "mascot-eye-blink": "mascot-eye-blink 3s ease-in-out infinite",
        "mascot-smile": "mascot-smile 3s ease-in-out infinite"
      },
      boxShadow: {
        glow: "0 0 5px 1px rgba(255, 0, 0, 0.7)",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;

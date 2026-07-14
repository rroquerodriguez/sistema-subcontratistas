/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      /* ------------------------------------------------------------------------------------------
       * ESCALA TIPOGRÁFICA
       * Seis pasos en `rem` (no px): así el texto respeta el ajuste de tamaño de letra del sistema
       * — alguien que sube la letra en su teléfono sí ve el cambio. En px eso no ocurre.
       *
       * Cada paso trae su propio tracking y leading, porque ambos dependen del tamaño:
       *  - Tracking: negativo al crecer (las letras se separan ópticamente en tamaños grandes),
       *    positivo en micro-texto (mejora legibilidad en tamaños chicos). Un valor único está mal.
       *  - Leading: apretado en títulos, holgado en cuerpo, ajustado en UI densa.
       * ---------------------------------------------------------------------------------------- */
      fontSize: {
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],      // 11px — etiquetas, badges
        caption: ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.01em' }],  // 12px — texto auxiliar
        body: ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: '0' }],         // 13px — cuerpo de tablas/UI
        base: ['0.875rem', { lineHeight: '1.375rem', letterSpacing: '0' }],         // 14px — cuerpo principal
        title: ['1rem', { lineHeight: '1.375rem', letterSpacing: '-0.01em' }],      // 16px — títulos de sección
        display: ['1.375rem', { lineHeight: '1.625rem', letterSpacing: '-0.02em' }], // 22px — cifras KPI, encabezados
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        sidebar: {
          bg: "hsl(var(--sidebar-bg))",
          fg: "hsl(var(--sidebar-fg))",
          muted: "hsl(var(--sidebar-muted))",
          hover: "hsl(var(--sidebar-hover))",
          active: "hsl(var(--sidebar-active))",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bhda: {
          purple: 'rgb(var(--bhda-primary) / <alpha-value>)',
          'on-primary': 'rgb(var(--bhda-on-primary) / <alpha-value>)',
          accent: 'rgb(var(--bhda-accent) / <alpha-value>)',
          background: 'rgb(var(--bhda-background) / <alpha-value>)',
          surface: 'rgb(var(--bhda-surface) / <alpha-value>)',
          text: 'rgb(var(--bhda-text) / <alpha-value>)',
          notation: 'rgb(var(--bhda-notation) / <alpha-value>)',
          perfect: 'rgb(var(--bhda-perfect) / <alpha-value>)',
          good: 'rgb(var(--bhda-good) / <alpha-value>)',
          miss: 'rgb(var(--bhda-miss) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: 'var(--color-bg-base)',
        elevated: 'var(--color-bg-elevated)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          hover: 'var(--color-surface-hover)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          light: 'var(--color-accent-light)',
          text: 'var(--color-accent-text)',
        },
        txt: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          light: 'var(--color-border-light)',
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: 'var(--color-danger)',
        info: 'var(--color-info)',
        primary: {
          50: '#FDF0EB',
          100: '#FBDDD2',
          200: '#F5B9A1',
          300: '#EE9672',
          400: '#E8825A',
          500: '#E07A4B',
          600: '#D4693C',
          700: '#B85530',
          800: '#9A4526',
          900: '#7C371E',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Noto Sans SC', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'h1': ['36px', { lineHeight: '44px', fontWeight: '700', letterSpacing: '-0.02em' }],
        'h2': ['28px', { lineHeight: '36px', fontWeight: '600', letterSpacing: '-0.01em' }],
        'h3': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '24px' }],
        'sm-body': ['14px', { lineHeight: '20px' }],
        'caption': ['12px', { lineHeight: '16px' }],
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '18': '72px',
        '20': '80px',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.06)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.08)',
        'hover': '0 8px 30px rgba(0, 0, 0, 0.10)',
        'accent': '0 2px 8px rgba(224, 122, 75, 0.25)',
        'accent-hover': '0 4px 16px rgba(224, 122, 75, 0.35)',
      },
      backdropBlur: {
        'glass': '16px',
      },
      animation: {
        'float-up': 'float-up 0.4s cubic-bezier(0.4, 0, 0.2, 1) both',
        'breathe': 'breathe 3s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        'float-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        breathe: {
          '0%, 100%': { boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
          '50%': { boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

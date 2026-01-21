/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark mode colors
        background: {
          DEFAULT: 'hsl(var(--background))',
          dark: '#0a0a0f',
          darkSurface: '#16213e',
        },
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          cyan: '#00d4ff',
          violet: 'hsl(var(--primary-violet))',
          teal: '#0891b2',
        },
        // Emotion colors (configurable defaults)
        emotion: {
          happy: '#FFD700',
          sad: '#4169E1',
          angry: '#FF4444',
          fearful: '#9932CC',
          hatred: '#8B0000',
          thankful: '#32CD32',
          excited: '#FF6B35',
          hopeful: '#00CED1',
          frustrated: '#FF8C00',
          sarcastic: '#BA55D3',
          inspirational: '#FFD700',
          anxious: '#708090',
        },
        // Status colors
        success: 'hsl(var(--success))',
        warning: '#f59e0b',
        error: '#ef4444',
        // shadcn/ui colors
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        'gauge-fill': {
          '0%': { width: '0%' },
          '100%': { width: 'var(--gauge-value)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'gauge-fill': 'gauge-fill 1s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
      },
      boxShadow: {
        glow: '0 0 15px rgba(0, 212, 255, 0.3)',
        'glow-sm': '0 0 10px rgba(0, 212, 255, 0.2)',
        // Card shadows with color tint (futuristic design system)
        'card': '0 4px 6px -1px rgba(0, 212, 255, 0.1), 0 2px 4px -2px rgba(0, 212, 255, 0.1)',
        'card-lg': '0 10px 15px -3px rgba(0, 212, 255, 0.15), 0 4px 6px -4px rgba(0, 212, 255, 0.1)',
        'card-hover': '0 10px 20px -3px rgba(0, 212, 255, 0.2), 0 4px 6px -4px rgba(0, 212, 255, 0.15)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

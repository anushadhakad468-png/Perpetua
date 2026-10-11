import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#080B10',
          sidebar: '#0A0E14',
          surface: '#0C1118',
          card: '#101720',
          elevated: '#141D28',
          border: '#202B38',
          subtle: '#19232E',
        },
        text: {
          primary: '#F1F5F9',
          secondary: '#94A3B8',
          muted: '#64748B',
        },
        accent: {
          green: '#34D399',
          cyan: '#22D3EE',
        },
        status: {
          positive: '#34D399',
          negative: '#F87171',
          warning: '#FBBF24',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4fa',
          100: '#dce4f2',
          200: '#bccbe6',
          300: '#8da8d4',
          400: '#5a7fbe',
          500: '#3a5f9f',
          600: '#2d4b85',
          700: '#243c6b',
          800: '#1e3259',
          900: '#1a2b4a',
          950: '#111d33',
        },
        accent: {
          50: '#f0faf8',
          100: '#d4f1eb',
          200: '#a9e3d8',
          300: '#76cfc0',
          400: '#49b5a5',
          500: '#2ba89a',
          600: '#21877c',
          700: '#1c6c65',
          800: '#195651',
          900: '#174743',
          950: '#0b2b29',
        },
      },
    },
  },
  plugins: [],
};

export default config;

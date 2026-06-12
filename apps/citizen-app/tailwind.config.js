/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary teal palette
        primary: {
          50:  '#e6f2f4',
          100: '#b3d9e0',
          200: '#80bfca',
          300: '#4da6b5',
          400: '#2694a5',
          500: '#005F73', // Brand primary
          600: '#004f60',
          700: '#003f4d',
          800: '#003040',
          900: '#001f2a',
        },
        // Accent - warm gold
        accent: {
          50:  '#fff8e1',
          100: '#ffecb3',
          200: '#ffe082',
          300: '#ffd54f',
          400: '#ffca28',
          500: '#E9C46A', // Accent
          600: '#d4a93a',
          700: '#b8890f',
          800: '#966f00',
          900: '#7a5900',
        },
        // Status colors
        status: {
          pending:     { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
          assigned:    { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
          inprogress:  { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
          resolved:    { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
          rejected:    { bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
          closed:      { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' },
        },
      },
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['DM Serif Display', 'Georgia', 'serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.06)',
        'card-hover': '0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -2px rgba(0,0,0,.1)',
      },
      screens: {
        xs: '375px',
      },
    },
  },
  plugins: [],
};

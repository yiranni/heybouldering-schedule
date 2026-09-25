const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 20s linear infinite',
      },
    },
  },
  plugins: [
    // Variant that only matches devices with a real hover capability (mouse).
    // Touch devices (phones/tablets) never match it, so hover-to-reveal
    // actions must not rely on it for visibility.
    plugin(({ addVariant }) => {
      addVariant('hoverable', ['@media (hover: hover)']);
    }),
  ],
};

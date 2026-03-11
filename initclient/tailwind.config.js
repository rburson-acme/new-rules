/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Brand palette from DefaultTheme
        background: '#FFFFFF',
        'background-secondary': '#F4F4FA',
        primary: '#545E75',
        'btn-primary': '#63ADF2',
        'btn-secondary': '#A7CCED',
        'btn-tertiary': '#304D6D',
        accent: '#D8A900',
        border: '#A0A0A0',
        text: '#323338',
        icon: '#676D79',
        'light-grey': '#DDDDDD',
      },
      fontFamily: {
        'nexa-light': ['Nexa-ExtraLight'],
        'nexa-heavy': ['Nexa-Heavy'],
      },
    },
  },
  plugins: [],
};

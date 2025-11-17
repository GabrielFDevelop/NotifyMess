export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0b1322',
        foreground: '#e5e7eb',
        panel: '#0e1726',
        panelBorder: '#1b2a3a',
        inputBg: '#0b1322',
        inputBorder: '#243041',
        accent: '#3b82f6',
        accentMuted: '#1f3b67',
        textMuted: '#9ca3af',
        surface: '#e5e7eb',
        surfaceText: '#0f172a',
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
    },
  },
};
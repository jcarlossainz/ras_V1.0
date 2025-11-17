import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores principales RAS
        'ras-azul': '#0B5D7A',
        'ras-turquesa': '#14A19C',
        'ras-crema': '#F8F0E3',

        // Colores semánticos
        'success': '#10b981',
        'error': '#ef4444',
        'warning': '#f59e0b',
        'info': '#3b82f6',

        // Colores por módulo
        'module-home': '#10b981',
        'module-calendario': '#06b6d4',
        'module-tickets': '#f97316',
        'module-inventario': '#f59e0b',
        'module-galeria': '#ec4899',
        'module-cuentas': '#84cc16',
        'module-directorio': '#eab308',
        'module-market': '#c1666b',
      },
      fontFamily: {
        'roboto': ['var(--font-roboto)', 'system-ui', 'sans-serif'],
        'poppins': ['var(--font-poppins)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slide-in-right 0.3s ease-out',
        'slide-out': 'slide-out-right 0.3s ease-in',
        'loading-bar': 'loading-bar 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 200ms ease-in',
        'spin': 'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' },
        },
      },
    },
  },

  plugins: []
  
  };

  

export default config;
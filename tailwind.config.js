/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  // NativeWind requires the class strategy — the 'media' default makes its web
  // runtime throw "Cannot manually set color scheme" on http://localhost:8081.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#14231C",
        surface: "#FBFAF6",
        "surface-raised": "#FFFFFF",
        primary: "#1F5D3F",
        "primary-hover": "#17452F",
        accent: "#B8863B",
        "accent-gold": "#B8863B",
        "accent-terracotta": "#C1613F",
        "accent-sage": "#7FA894",
        "accent-sky": "#4A7FA0",
        border: "#E4E2D8",
        // Semantic status colors (keep in sync with src/theme/colors.ts BRAND).
        success: "#059669",
        danger: "#EF4444",
        warning: "#F59E0B",
        caution: "#C2410C",
        info: "#4A7FA0",
        muted: "#64748B",
        dark: {
          ink: "#F4F2EA",
          surface: "#0F1712",
          "surface-raised": "#17211B",
          primary: "#4FA97B",
          "primary-hover": "#409066",
          "accent-gold": "#D9A75C",
          "accent-terracotta": "#D97A54",
          "accent-sage": "#8FBFA8",
          "accent-sky": "#6FA3C9",
          border: "#263229",
          success: "#34D399",
          danger: "#F87171",
          warning: "#FBBF24",
          caution: "#F97316",
          info: "#6FA3C9",
          muted: "#94A3B8"
        }
      },
      fontFamily: {
        display: ["Outfit_700Bold", "sans-serif"],
        sans: ["PlusJakartaSans_400Regular", "PlusJakartaSans_600SemiBold", "sans-serif"],
        urdu: ["NotoNastaliqUrdu_400Regular", "NotoNastaliqUrdu_700Bold", "sans-serif"]
      }
    }
  },
  plugins: []
};

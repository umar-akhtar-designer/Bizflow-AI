/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B1410",
        inkSoft: "#141F1A",
        forest: {
          50: "#ECF8F2",
          100: "#D4EEE1",
          200: "#AADDC5",
          300: "#76C4A4",
          400: "#3FA581",
          500: "#178565",
          600: "#0B7A5C",
          700: "#08644C",
          800: "#084F3D",
          900: "#073F32",
        },
        paper: "#F5F4EF",
        cream: "#FBFAF7",
        coral: "#FF6B3D",
        amber: "#C9820A",
        line: "#E5E3DA",
        muted: "#68716C",
        sage: "#8A948D",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        display: ["Instrument Serif", "Iowan Old Style", "Georgia", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(11,20,16,0.04), 0 8px 24px -12px rgba(11,20,16,0.12)",
        lift: "0 2px 4px rgba(11,20,16,0.04), 0 24px 48px -20px rgba(11,20,16,0.24)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.7)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "80%,100%": { transform: "scale(1.6)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        blink: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22,1,0.36,1) both",
        float: "float 6s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2.2s cubic-bezier(0.22,1,0.36,1) infinite",
        shimmer: "shimmer 2.4s linear infinite",
        marquee: "marquee 32s linear infinite",
        blink: "blink 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

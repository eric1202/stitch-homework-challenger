/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#6366f1", // Match web version's primary color
        "primary-dark": "#4f46e5",
        "background-light": "#f8fafc",
        "background-dark": "#0f172a",
        "surface-light": "#ffffff",
        "surface-dark": "#1e293b",
        "text-main-light": "#1e293b",
        "text-main-dark": "#f8fafc",
        "text-sub-light": "#64748b",
        "text-sub-dark": "#94a3b8",
      },
    },
  },
  plugins: [],
};

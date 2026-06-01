import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",       // Points to your root app folder
    "./components/**/*.{js,ts,jsx,tsx,mdx}",// Points to your root components folder
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",     // (Optional) Points to pages if you use them
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
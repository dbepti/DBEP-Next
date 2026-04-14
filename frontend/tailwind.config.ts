import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#185fa5",
          dark: "#0c447c",
          light: "#e6f1fb",
        },
        sidebar: "#0f2744",
      },
      fontSize: {
        "2xs": "10px",
      },
    },
  },
  plugins: [],
};

export default config;

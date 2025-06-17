// tailwind.config.js
/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme'); // 引入 Tailwind 的預設主題，以便擴展

module.exports = {
  // 指定 Tailwind 應該掃描哪些文件來生成 CSS
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // 掃描 src 目錄下所有 JS/TS/JSX/TSX 文件
    // 如果你有其他目錄或文件類型，也要在這裡添加
  ],
  theme: {
    extend: {
      fontFamily: {

        biaokai: ['標楷體', 'BiauKai', 'DFKai-SB', ...defaultTheme.fontFamily.serif],

      },
    },
  },
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // สีแบรนด์ DOOD — ครีม (พื้น) · น้ำเงิน (หลัก/โลโก้) · โกโก้ (ปุ่มซื้อ/accent อุ่น)
        brand: {
          cream: '#FBF7EF',
          blue: '#3356D9',
          cocoa: '#5C3B24',
        },
      },
    },
  },
  plugins: [],
};
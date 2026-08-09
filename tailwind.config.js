/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // สีแบรนด์ DOOD — น้ำเงิน (หลัก/โลโก้/แอ็กชัน) · ที่เหลือใช้เทา-ขาวกลาง
        brand: {
          blue: '#3356D9',
        },
      },
    },
  },
  plugins: [],
};
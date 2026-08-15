/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // สีแบรนด์ DOOD — espresso ดำอมน้ำตาล (หลัก/โลโก้/แอ็กชัน) · ที่เหลือใช้เทา-ขาวกลาง
        // (token ยังชื่อ blue เพื่อไม่ต้องแก้คลาส brand-blue ทั่วเว็บ — ค่าจริงคือ #181004)
        brand: {
          blue: '#181004',
        },
      },
    },
  },
  plugins: [],
};
// tailwind.config.ts atau tailwind.config.js

const config = {
  theme: {
    container: {
      center: true, // tengah secara otomatis
      padding: "1rem", // padding default
      screens: {
        sm: "640px",
        //   md: "768px",
        lg: "1024px",
        xl: "1280px",
        //   "2xl": "1400px", // kamu bisa sesuaikan sendiri
      },
    },
  },
  // ...
};

export default config;

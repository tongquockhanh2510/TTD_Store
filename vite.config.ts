import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  server: {
    // Nhận port từ biến môi trường PORT nếu có, để không đụng cổng đang bận.
    port: Number(process.env.PORT) || 5173,
  },
});

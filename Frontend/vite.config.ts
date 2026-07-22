import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 5173,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": ["framer-motion", "lucide-react", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tabs"],
          "vendor-charts": ["recharts"],
          "vendor-firebase": ["firebase/app", "firebase/auth", "firebase/firestore"],
          "vendor-pdf": ["jspdf", "html2canvas"],
          "vendor-ocr": ["tesseract.js"],
        },
      },
    },
  },
}));

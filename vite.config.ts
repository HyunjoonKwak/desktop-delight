import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Tauri expects a fixed port, fail if not available
  server: {
    host: "localhost",
    port: 1420,
    strictPort: true,
  },
  // Tauri env prefixes
  envPrefix: ["VITE_", "TAURI_"],
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Build settings for Tauri
  build: {
    target: ["es2021", "chrome100", "safari13"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  clearScreen: false,
}));

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const srcPath = decodeURIComponent(new URL("./src", import.meta.url).pathname);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [react()],
    resolve: {
      alias: { "@": srcPath },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        "/api": {
          target: env.VITE_API_TARGET || "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      chunkSizeWarningLimit: 900,
    },
  };
});

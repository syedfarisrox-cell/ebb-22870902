import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // This lets us write `import X from "@/lib/utils"` instead of relative paths
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Local development only: send /api calls to the Python backend
    // running on port 8000 (uvicorn api.index:app --port 8000).
    // On Vercel, vercel.json does this job instead.
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});

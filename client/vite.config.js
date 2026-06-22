import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies any request starting with /api to the Express backend
// on :3001. This is WHY the client can POST to a plain "/api/generate" relative
// URL — Vite forwards it. Benefits: no CORS dance in the browser, and the
// backend host/port (and therefore the LLM provider behind it) never appears in
// client code. Change the backend port in one place (here + server PORT).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});

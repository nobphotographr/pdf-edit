import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: "static",
  base: "/pdf-edit/",
  publicDir: "../public",
  plugins: [react()],
  build: {
    outDir: "../out",
    emptyOutDir: true,
  },
});

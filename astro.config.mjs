import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

const rawBase = process.env.BASE_PATH ?? "/";
const base = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;

export default defineConfig({
  site: "https://serg-hash.github.io",
  base,
  trailingSlash: "always",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});

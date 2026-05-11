import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    base: "./",

    ssr: {
      noExternal: ["lovable-tagger"],
    },

    optimizeDeps: {
      include: ["lovable-tagger"],
    },
  },
});
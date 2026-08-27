import { defineConfig } from "vite";

export default defineConfig({
  base: "/CodexAlert/",
  build: {
    target: "es2022",
    // Keep the self-hosted font files as same-origin assets so the page CSP
    // does not need to allow data: URLs for fonts.
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: new URL("./index.html", import.meta.url).pathname,
        unsubscribe: new URL("./unsubscribe/index.html", import.meta.url).pathname,
      },
    },
  },
});

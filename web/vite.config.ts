import { defineConfig } from "vite";

export default defineConfig({
  base: "/CodexAlert/",
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        main: new URL("./index.html", import.meta.url).pathname,
        unsubscribe: new URL("./unsubscribe/index.html", import.meta.url).pathname,
      },
    },
  },
});

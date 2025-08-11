import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { fileURLToPath } from "url";

export default defineConfig({
  plugins: [
    dts({
      outDir: "dist",
    }),
  ],
  build: {
    target: "esnext",
    emptyOutDir: true,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
    },
  },
  test: {
    environment: "node",
    globals: true,
  },
});

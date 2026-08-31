import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: [
            "app/**/*.test.tsx",
            "components/**/*.test.tsx",
            "lib/analytics/**/*.test.ts",
            "lib/observability/**/*.test.ts",
          ],
          exclude: ["node_modules", "hostinger-next", ".next"],
        },
      },
      {
        extends: true,
        test: {
          name: "rules",
          environment: "node",
          include: ["tests/rules/**/*.test.ts"],
          exclude: ["node_modules", "hostinger-next", ".next"],
        },
      },
    ],
  },
});

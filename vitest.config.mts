import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
    },
    extensions: [".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx", ".json"],
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
            "middleware.test.ts",
            "app/api/admin/**/*.test.ts",
            "app/**/*.test.tsx",
            "app/**/*.test.ts",
            "components/**/*.test.tsx",
            "lib/analytics/**/*.test.ts",
            "lib/seo/**/*.test.ts",
            "lib/observability/**/*.test.ts",
            "lib/payments/**/*.test.ts",
            "lib/storage/**/*.test.ts",
            "lib/tutors/**/*.test.ts",
            "lib/bookings/**/*.test.ts",
            "lib/student-dashboard/**/*.test.ts",
            "lib/hubs/**/*.test.ts",
            "lib/lessons/**/*.test.ts",
            "lib/reviews/**/*.test.ts",
            "lib/auth/**/*.test.ts",
            "lib/admin/**/*.test.ts",
            "lib/users/**/*.test.ts",
            "lib/facilitators/**/*.test.ts",
            "lib/contact/**/*.test.ts",
            "lib/jetsend/**/*.test.ts",
            "lib/email/**/*.test.ts",
            "lib/notifications/**/*.test.ts",
            "lib/conversations/rate-limit.test.ts",
          ],
          exclude: ["node_modules", "hostinger-next", ".next"],
        },
      },
      {
        extends: true,
        test: {
          name: "rules",
          environment: "node",
          fileParallelism: false,
          include: ["tests/rules/**/*.test.ts"],
          exclude: ["node_modules", "hostinger-next", ".next"],
        },
      },
    ],
  },
});

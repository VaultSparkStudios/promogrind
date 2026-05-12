import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/__tests__/**/*.test.{js,jsx}"],
    testTimeout: 20000,
    hookTimeout: 20000,
    pool: "threads",
    maxWorkers: 4,
    minWorkers: 1,
    fileParallelism: false,
    isolate: true,
  },
});

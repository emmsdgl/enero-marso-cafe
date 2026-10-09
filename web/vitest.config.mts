import { defineConfig } from "vitest/config";

// Unit tests for the pure rules (order flow, chat closing, hours, tokens). Pages are covered end to end instead.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

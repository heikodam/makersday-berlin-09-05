import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx", "tests/**/*.integration.test.ts"],
    exclude: ["node_modules", "build", ".react-router", "inspiration-repo"],
    globals: false,
    setupFiles: ["tests/setup/jsdom.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});

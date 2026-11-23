import { defineConfig, devices } from "@playwright/test";

if (!process.env.SELECTRA_TEST_DATA_DIR) throw new Error("Run npm run test:e2e to create an isolated test database.");
const port = Number(process.env.SELECTRA_TEST_PORT || 3001);
const baseURL = `http://localhost:${port}`;
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 80_000,
  expect: { timeout: 12_000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    actionTimeout: 12_000,
    launchOptions: { executablePath: process.env.SELECTRA_CHROMIUM_PATH || undefined },
  },
  webServer: {
    command: `npm run start -- --port ${port}`,
    url: baseURL + "/login",
    timeout: 80_000,
    reuseExistingServer: false,
  },
});

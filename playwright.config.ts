import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the production build:
 *   npm run build && npm run test:e2e
 *
 * PLAYWRIGHT_CHROMIUM_PATH can point at an already installed Chromium
 * (useful offline); otherwise run `npx playwright install chromium` once.
 */
const PORT = Number(process.env.E2E_PORT ?? 3200);
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "ru-RU",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/ru`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});

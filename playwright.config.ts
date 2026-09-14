import { defineConfig, devices } from "@playwright/test";

if (process.env.E2E_ISOLATED !== "true") {
  throw new Error("Use npm run test:e2e to prepare an isolated database.");
}

export default defineConfig({
  testDir: "./tests/app/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:5188",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.PLAYWRIGHT_CHANNEL as "chrome" | undefined,
      },
    },
  ],
  webServer: {
    command: "npm run start:test",
    url: "http://127.0.0.1:5188",
    reuseExistingServer: false,
    timeout: 60000,
  },
});

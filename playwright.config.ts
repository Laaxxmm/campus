import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const external = process.env.BASE_URL; // smoke against a deployed URL
const baseURL = external ?? `http://localhost:${PORT}`;
const E2E_DB = process.env.E2E_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/learncrew_e2e";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: [["list"]],
  globalSetup: external ? undefined : "./e2e/global-setup.ts",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 740 } }, testIgnore: /tpo\.spec|smoke\.spec|security\.spec|admin\.spec|qa-matrix\.spec|visual-qa\.spec/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } }, testMatch: /tpo\.spec|smoke\.spec|security\.spec|admin\.spec|qa-matrix\.spec/ },
    // v4 visual QA: sets its own viewport per width (360/768/1280/1440); deviceScaleFactor 1 for stable snapshots.
    { name: "visual", use: { ...devices["Desktop Chrome"], deviceScaleFactor: 1 }, testMatch: /visual-qa\.spec/ },
  ],
  webServer: external
    ? undefined
    : {
        command: process.env.E2E_SKIP_BUILD ? `npx next start -p ${PORT}` : `npm run build && npx next start -p ${PORT}`,
        url: `http://localhost:${PORT}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
        env: {
          DATABASE_URL: E2E_DB,
          AUTH_URL: `http://localhost:${PORT}`,
          APP_BASE_URL: `http://localhost:${PORT}`,
          AUTH_TRUST_HOST: "true",
          AUTH_SECRET: process.env.AUTH_SECRET || "e2e-only-auth-secret-not-for-production-0123",
          AUTH_RESEND_KEY: "",
          ALLOW_DEV_LOGIN_LINKS: "true",
          CRON_SECRET: "e2e-cron-secret-0123456789",
          ANTHROPIC_API_KEY: "",
        },
      },
});

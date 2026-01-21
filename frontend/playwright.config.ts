/// <reference types="node" />
import { defineConfig } from "@playwright/test";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";
const uiBaseUrl = process.env.UI_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  use: {
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "api",
      testDir: "./tests/e2e/api",
      use: {
        baseURL: apiBaseUrl,
      },
    },
    {
      name: "ui",
      testDir: "./tests/e2e/ui",
      use: {
        baseURL: uiBaseUrl,
      },
    },
  ],
  webServer: [
    {
      command: "npm --prefix ../backend run dev",
      url: `${apiBaseUrl}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5173",
      url: uiBaseUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});

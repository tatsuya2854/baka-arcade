import { defineConfig, devices } from '@playwright/test';
const base = process.env.BASE_URL ?? 'http://localhost:8799';
export default defineConfig({
  testDir: 'tests', timeout: 150_000, workers: 1, reporter: 'list', use: { baseURL: base },
  projects: [{ name: 'iphone-webkit', use: { ...devices['iPhone 13'] } }, { name: 'pc-chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
});

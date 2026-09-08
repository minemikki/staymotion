import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.PW_BASE_URL || 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    // PW_CHROMIUM lets a sandbox/CI point at a pre-installed Chromium instead of downloading one.
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM, args: ['--no-sandbox'] } : {},
  },
  webServer: process.env.PW_NO_SERVER ? undefined : { command: 'npm run start', url: 'http://127.0.0.1:3000', reuseExistingServer: true, timeout: 120_000, env: { NEXT_PUBLIC_STAYMOTION_MODE: 'local' } },
  projects: [
    // Mobile projects emulate iPhone viewports/touch in Chromium (WebKit is not available in every CI/sandbox).
    // Real Safari behaviour is verified manually on device — see PILOT_BUILD_REPORT.md.
    { name: 'iphone-13', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', viewport: { width: 390, height: 844 } } },
    { name: 'iphone-se', use: { ...devices['iPhone SE'], defaultBrowserType: 'chromium', viewport: { width: 375, height: 667 } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});

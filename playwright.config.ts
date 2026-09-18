import { defineConfig, devices } from '@playwright/test';

// Isolate Chat Page suite: only executes when explicitly invoked manually (e.g. npm run test:chat or targeted file path)
const isExplicitChatRun = process.argv.some(arg => arg.toLowerCase().includes('chat')) || process.env.RUN_CHAT === 'true';

export default defineConfig({
  testDir: './src/tests',
  testIgnore: isExplicitChatRun ? [] : ['**/chat.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-reports/html-report', open: 'never' }],
    ['json', { outputFile: 'test-reports/results.json' }],
    ['list']
  ],
  outputDir: 'test-reports/test-results',
  use: {
    baseURL: 'https://eve.vakh.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'safari',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
  ],
});

import { defineConfig, devices } from '@playwright/test';

/**
 * UX Audit 測試專用配置
 * 禁用 webServer，因為服務器已經在運行
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
      },
    },
  ],
  // 禁用 webServer，因為服務器已經在運行
  // webServer: undefined,
  timeout: 60 * 1000, // 60秒（完整流程測試需要更長時間）
  expect: {
    timeout: 10000, // 10秒
  },
});

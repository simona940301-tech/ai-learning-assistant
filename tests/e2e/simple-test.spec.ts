import { test, expect } from '@playwright/test';

test('basic navigation test', async ({ page }) => {
  // 應用會重定向到 /community
  await page.goto('http://localhost:3000');
  await page.waitForURL('**/community');

  // 檢查 Community 頁面載入
  await expect(page.locator('h1:has-text("Community")')).toBeVisible();

  // 檢查 Tab Bar 存在 (檢查底部導航欄)
  await expect(page.locator('nav.fixed.bottom-0')).toBeVisible();

  // 檢查主要導航連結 (檢查底部導航欄中的連結)
  const navLinks = ['Play', 'Ask', 'Backpack', 'Profile'];
  for (const linkText of navLinks) {
    await expect(page.locator(`nav span:has-text("${linkText}")`)).toBeVisible();
  }

  // 檢查當前頁面的 Community 標籤是激活狀態
  await expect(page.locator('nav a[aria-current="page"] span:has-text("Community")')).toBeVisible();

  console.log('✅ 基本導航測試通過');
});

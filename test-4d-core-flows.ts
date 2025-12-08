/**
 * 4D Pre-launch Audit: Core Flows E2E Test
 * 測試 P0 關鍵業務流程的穩定性
 *
 * 用法:
 * npx tsx test-4d-core-flows.ts
 */

import { test, expect } from '@playwright/test';

test.describe('4D Pre-launch Audit: Core Flows', () => {
  test.beforeEach(async ({ page }) => {
    // 設定 viewport 為 mobile first
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    // 清除 localStorage 和 cookies
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('P0-001: Store Page - 商品顯示與購買流程', async ({ page }) => {
    console.log('🧪 測試 Store 頁面商品顯示與購買流程');

    // 1. 登入流程 (模擬)
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');

    // 檢查登入頁面載入
    await expect(page).toHaveTitle(/.*login.*/i);

    // 2. 模擬登入 (如果有測試帳戶)
    // TODO: 實作實際登入流程

    // 3. 導航到 Store 頁面
    await page.goto('http://localhost:3000/store');
    await page.waitForLoadState('networkidle');

    // 檢查 Store 頁面載入
    await expect(page).toHaveURL(/.*store.*/);

    // 檢查是否有商品顯示
    const productCards = page.locator('[data-testid="product-card"], .product-card, [class*="product"]');
    await expect(productCards.first()).toBeVisible();

    // 檢查購買按鈕
    const buyButton = page.locator('button:has-text("立即搶購"), [data-testid="buy-button"]');
    await expect(buyButton.first()).toBeVisible();

    // 點擊購買按鈕 (如果可用)
    if (await buyButton.first().isEnabled()) {
      await buyButton.first().click();

      // 檢查購買流程啟動 (可能跳轉到支付頁面或顯示確認)
      await page.waitForTimeout(1000); // 等待動畫/轉場

      // 檢查是否顯示成功訊息或跳轉
      const successMessage = page.locator('text=/成功|完成|確認/i');
      const paymentPage = page.locator('text=/支付|結帳/i');

      const hasSuccess = await successMessage.isVisible().catch(() => false);
      const hasPayment = await paymentPage.isVisible().catch(() => false);

      expect(hasSuccess || hasPayment).toBeTruthy();
    }

    console.log('✅ Store 頁面測試完成');
  });

  test('P0-002: Auth Flow - 未登入用戶重定向', async ({ page }) => {
    console.log('🧪 測試認證流程 - 未登入重定向');

    // 1. 未登入狀態訪問保護頁面
    await page.goto('http://localhost:3000/play');
    await page.waitForLoadState('networkidle');

    // 檢查是否被重定向到登入頁面
    await expect(page).toHaveURL(/.*login.*/);

    // 檢查登入頁面元素
    const loginForm = page.locator('form, [data-testid="login-form"]');
    await expect(loginForm).toBeVisible();

    console.log('✅ Auth 重定向測試完成');
  });

  test('P0-003: Play Page - Battle/Practice 模式穩定性', async ({ page }) => {
    console.log('🧪 測試 Play 頁面 Battle/Practice 模式');

    // 1. 登入 (模擬)
    // TODO: 實作登入

    // 2. 訪問 Play 頁面
    await page.goto('http://localhost:3000/play');
    await page.waitForLoadState('networkidle');

    // 檢查頁面載入正常 (無 forceUpdate 錯誤)
    const errorMessages = page.locator('text=/forceUpdate|error|Error/i');
    await expect(errorMessages).toHaveCount(0);

    // 檢查 Battle 模式按鈕
    const battleButton = page.locator('button:has-text("Battle"), [data-testid="battle-mode"]');
    if (await battleButton.isVisible()) {
      await battleButton.click();
      await page.waitForTimeout(1000);

      // 檢查遊戲介面載入
      const gameInterface = page.locator('[data-testid="game-interface"], .game-container');
      await expect(gameInterface).toBeVisible();
    }

    // 檢查 Practice 模式按鈕
    const practiceButton = page.locator('button:has-text("Practice"), [data-testid="practice-mode"]');
    if (await practiceButton.isVisible()) {
      await practiceButton.click();
      await page.waitForTimeout(1000);

      // 檢查練習介面載入
      const practiceInterface = page.locator('[data-testid="practice-interface"], .practice-container');
      await expect(practiceInterface).toBeVisible();
    }

    console.log('✅ Play 頁面測試完成');
  });

  test('P0-004: AI/RAG Flow - Ask 頁面功能', async ({ page }) => {
    console.log('🧪 測試 AI/RAG 功能 - Ask 頁面');

    // 1. 訪問 Ask 頁面
    await page.goto('http://localhost:3000/ask');
    await page.waitForLoadState('networkidle');

    // 檢查頁面載入正常
    await expect(page).toHaveURL(/.*ask.*/);

    // 檢查無 __PLMS_FORCE_SOLVER__ 相關錯誤
    const forceSolverErrors = page.locator('text=/__PLMS_FORCE_SOLVER__|force.*solver/i');
    await expect(forceSolverErrors).toHaveCount(0);

    // 檢查輸入區域
    const inputArea = page.locator('[data-testid="input-dock"], .input-dock, textarea, input[type="text"]');
    await expect(inputArea).toBeVisible();

    // 檢查模式切換 (如果存在)
    const modeTabs = page.locator('[data-testid="mode-tabs"], .mode-tabs');
    if (await modeTabs.isVisible()) {
      const solverTab = modeTabs.locator('text=/解題|Solve/i');
      const summaryTab = modeTabs.locator('text=/重點統整|Summary/i');

      // 測試模式切換
      if (await solverTab.isVisible()) {
        await solverTab.click();
        await page.waitForTimeout(500);
      }

      if (await summaryTab.isVisible()) {
        await summaryTab.click();
        await page.waitForTimeout(500);
      }
    }

    console.log('✅ Ask 頁面測試完成');
  });

  test('P0-005: Navigation - 全域導航測試', async ({ page }) => {
    console.log('🧪 測試全域導航功能');

    // 1. 登入 (模擬)
    // TODO: 實作登入

    // 2. 訪問首頁
    await page.goto('http://localhost:3000/home');
    await page.waitForLoadState('networkidle');

    // 測試 Tab Bar 導航
    const tabs = [
      { name: 'Community', selector: 'text=/Community|社群/i' },
      { name: 'Play', selector: 'text=/Play|遊戲/i' },
      { name: 'Ask', selector: 'text=/Ask|問答/i' },
      { name: 'Backpack', selector: 'text=/Backpack|背包/i' },
      { name: 'Profile', selector: 'text=/Profile|個人/i' }
    ];

    for (const tab of tabs) {
      console.log(`測試 ${tab.name} 標籤頁`);

      const tabElement = page.locator(tab.selector);
      if (await tabElement.isVisible()) {
        await tabElement.click();
        await page.waitForLoadState('networkidle');

        // 檢查無錯誤
        const errorElements = page.locator('text=/404|500|Error/i');
        await expect(errorElements).toHaveCount(0);

        // 檢查頁面有內容載入
        const pageContent = page.locator('body > *');
        await expect(pageContent).toBeVisible();
      }
    }

    // 測試 App Bar Home 入口
    const homeButton = page.locator('[data-testid="home-button"], text=/Home|首頁/i');
    if (await homeButton.isVisible()) {
      await homeButton.click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*home.*/);
    }

    console.log('✅ 導航測試完成');
  });
});

// 測試配置
test.describe.configure({
  mode: 'serial', // 順序執行
  timeout: 30000, // 30秒超時
});

// 測試報告
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === 'failed') {
    console.log(`❌ 測試失敗: ${testInfo.title}`);
    console.log(`錯誤信息: ${testInfo.error?.message}`);

    // 可以添加截圖
    // await page.screenshot({ path: `test-results/${testInfo.title}.png` });
  } else {
    console.log(`✅ 測試通過: ${testInfo.title}`);
  }
});

console.log('🚀 4D Core Flows E2E Test 開始執行...');
console.log('請確保開發服務器運行在 http://localhost:3000');





































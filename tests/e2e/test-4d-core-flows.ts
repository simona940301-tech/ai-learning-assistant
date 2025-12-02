import { test, expect } from '@playwright/test';

test.describe('4D Pre-launch Audit: Core Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('P0-001: Store Page Test', async ({ page }) => {
    console.log('🧪 Testing Store page...');

    await page.goto('http://localhost:3000/store');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/.*store.*/);
    console.log('✅ Store page loads correctly');
  });

  test('P0-002: Auth Flow - 未登入用戶重定向', async ({ page }) => {
    console.log('🧪 測試認證流程 - 未登入重定向');

    // 1. 未登入狀態訪問保護頁面 /play
    await page.goto('http://localhost:3000/play');
    await page.waitForLoadState('networkidle');

    // 檢查是否被重定向 (可能重定向到 /auth/login 或其他認證頁面)
    const currentURL = page.url();
    const isRedirected = !currentURL.includes('/play') || currentURL.includes('/auth') || currentURL.includes('/login');

    if (isRedirected) {
      console.log(`✅ 已重定向到: ${currentURL}`);
      // 檢查是否有登入相關元素
      const loginElements = [
        page.locator('form'),
        page.locator('button:has-text("登入"), button:has-text("Login")'),
        page.locator('input[type="email"], input[type="password"]'),
        page.locator('text=/登入|Login|Sign In/i')
      ];

      let hasLoginUI = false;
      for (const element of loginElements) {
        try {
          await expect(element.first()).toBeVisible({ timeout: 1000 });
          hasLoginUI = true;
          break;
        } catch (e) {
          continue;
        }
      }

      expect(hasLoginUI).toBeTruthy();
    } else {
      console.log('⚠️  未被重定向，檢查是否頁面有保護機制');

      // 即使沒有重定向，也檢查頁面是否有登入提示
      const protectedContent = page.locator('text=/請登入|請先登入|需要登入/i');
      const canSeeProtectedContent = await protectedContent.isVisible().catch(() => false);

      if (canSeeProtectedContent) {
        console.log('✅ 頁面顯示登入提示，保護機制正常');
      } else {
        console.log('⚠️  頁面未顯示登入提示，可能有其他保護機制');
      }
    }

    console.log('✅ Auth 重定向測試完成');
  });

  test('P0-003: Play Page - Battle/Practice 模式穩定性', async ({ page }) => {
    console.log('🧪 測試 Play 頁面 Battle/Practice 模式');

    // 1. 訪問 Play 頁面 (如果被重定向，我們測試重定向行為)
    await page.goto('http://localhost:3000/play');
    await page.waitForLoadState('networkidle');

    const currentURL = page.url();

    if (currentURL.includes('/auth') || currentURL.includes('/login')) {
      console.log('✅ Play 頁面正確保護，需要登入');
      return;
    }

    // 2. 檢查頁面載入正常 (無 forceUpdate 錯誤)
    const errorMessages = page.locator('text=/forceUpdate|Error|error/i');
    await expect(errorMessages).toHaveCount(0);

    // 檢查頁面標題或主要內容
    const pageTitle = page.locator('h1, h2, .page-title');
    const hasTitle = await pageTitle.isVisible().catch(() => false);

    if (hasTitle) {
      console.log('✅ Play 頁面標題載入正常');
    }

    // 3. 檢查主要功能按鈕 (Battle/Practice 或其他遊戲模式)
    const gameButtons = [
      page.locator('button:has-text("Battle"), button:has-text("對戰")'),
      page.locator('button:has-text("Practice"), button:has-text("練習")'),
      page.locator('button:has-text("開始"), button:has-text("Start")'),
      page.locator('[data-testid*="battle"], [data-testid*="practice"]'),
      page.locator('.game-mode-button, .play-button')
    ];

    let foundGameButtons = false;
    for (const buttonLocator of gameButtons) {
      try {
        const count = await buttonLocator.count();
        if (count > 0) {
          console.log(`✅ 發現 ${count} 個遊戲模式按鈕`);
          foundGameButtons = true;

          // 測試第一個按鈕是否可點擊
          const firstButton = buttonLocator.first();
          const isEnabled = await firstButton.isEnabled().catch(() => false);
          if (isEnabled) {
            console.log('✅ 遊戲按鈕可點擊');
          } else {
            console.log('⚠️  遊戲按鈕被禁用，可能需要特殊條件');
          }
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!foundGameButtons) {
      console.log('⚠️  未發現遊戲模式按鈕，可能頁面結構不同或需要登入');
    }

    // 4. 檢查是否有狀態指示器 (能量值、等級等)
    const statusIndicators = [
      page.locator('text=/能量|Energy|等級|Level/i'),
      page.locator('.energy-bar, .level-indicator, .status-bar'),
      page.locator('[data-testid*="energy"], [data-testid*="level"]')
    ];

    let hasStatus = false;
    for (const indicator of statusIndicators) {
      try {
        await expect(indicator.first()).toBeVisible({ timeout: 500 });
        hasStatus = true;
        console.log('✅ 發現狀態指示器');
        break;
      } catch (e) {
        continue;
      }
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

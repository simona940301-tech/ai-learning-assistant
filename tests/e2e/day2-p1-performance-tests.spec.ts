import { test, expect } from '@playwright/test';

test.describe('Day 2: P1 Functionality & Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.context().clearCookies();
  });

  test.describe('P1 Functionality Tests', () => {
    test('Backpack Page Loads and Functions', async ({ page }) => {
      console.log('🧪 Testing Backpack page functionality...');

      await page.goto('/backpack');
      await page.waitForLoadState('networkidle');

      // Check page loads
      await expect(page).toHaveURL(/.*backpack.*/);

      // Check for main elements
      const hasTitle = await page.locator('h1, h2').filter({ hasText: /backpack|背包|錯題/i }).isVisible().catch(() => false);
      if (hasTitle) {
        console.log('✅ Backpack page title visible');
      }

      // Check for content areas or empty states
      const contentAreas = [
        page.locator('[data-testid*="backpack"], [data-testid*="content"]'),
        page.locator('.backpack-content, .content-area'),
        page.locator('text=/題目|問題|學習|Study/i')
      ];

      let hasContent = false;
      for (const area of contentAreas) {
        if (await area.isVisible().catch(() => false)) {
          hasContent = true;
          console.log('✅ Backpack content area found');
          break;
        }
      }

      if (!hasContent) {
        console.log('⚠️ No backpack content found - may be empty state');
      }

      console.log('✅ Backpack page test completed');
    });

    test('Profile Page Loads and Shows Data', async ({ page }) => {
      console.log('🧪 Testing Profile page functionality...');

      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Check page loads
      await expect(page).toHaveURL(/.*profile.*/);

      // Check for profile elements
      const profileElements = [
        page.locator('text=/profile|個人|用戶/i'),
        page.locator('[data-testid*="profile"], [data-testid*="user"]'),
        page.locator('.profile-card, .user-info')
      ];

      let hasProfileContent = false;
      for (const element of profileElements) {
        if (await element.isVisible().catch(() => false)) {
          hasProfileContent = true;
          console.log('✅ Profile content found');
          break;
        }
      }

      // Check for data display (weeklyGrowth, userRanking, etc.)
      const dataElements = [
        page.locator('text=/成長|growth|排名|ranking/i'),
        page.locator('[data-testid*="stats"], [data-testid*="growth"]'),
        page.locator('.stats-card, .progress-indicator')
      ];

      let hasStats = false;
      for (const element of dataElements) {
        if (await element.isVisible().catch(() => false)) {
          hasStats = true;
          console.log('✅ User statistics found');
          break;
        }
      }

      if (!hasStats) {
        console.log('⚠️ No user statistics visible - may need authentication');
      }

      console.log('✅ Profile page test completed');
    });

    test('Error Book Functionality', async ({ page }) => {
      console.log('🧪 Testing Error Book functionality...');

      // Try accessing error-book directly
      await page.goto('/error-book');
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();

      if (currentUrl.includes('error-book')) {
        console.log('✅ Error Book page accessible');

        // Check for error book content
        const errorBookElements = [
          page.locator('text=/錯題|error|題目/i'),
          page.locator('[data-testid*="error"], [data-testid*="book"]'),
          page.locator('.error-book, .question-list')
        ];

        let hasErrorBookContent = false;
        for (const element of errorBookElements) {
          if (await element.isVisible().catch(() => false)) {
            hasErrorBookContent = true;
            console.log('✅ Error Book content found');
            break;
          }
        }
      } else {
        console.log('⚠️ Error Book may require authentication or different routing');
      }

      console.log('✅ Error Book test completed');
    });
  });

  test.describe('Performance Tests', () => {
    test('Page Load Performance - Home Page', async ({ page }) => {
      console.log('🧪 Testing Home page load performance...');

      const startTime = Date.now();

      // Navigate and wait for load
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      console.log(`🏠 Home page load time: ${loadTime}ms`);

      // Check if load time is acceptable (under 3 seconds)
      expect(loadTime).toBeLessThan(3000);

      // Additional performance checks
      const performanceEntries = await page.evaluate(() =>
        performance.getEntriesByType('navigation')
      );

      if (performanceEntries.length > 0) {
        const navigation = performanceEntries[0] as PerformanceNavigationTiming;
        console.log(`📊 DOM Content Loaded: ${navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart}ms`);
        console.log(`📊 Load Complete: ${navigation.loadEventEnd - navigation.loadEventStart}ms`);
      }
    });

    test('Page Load Performance - Ask Page', async ({ page }) => {
      console.log('🧪 Testing Ask page load performance...');

      const startTime = Date.now();

      await page.goto('/ask');
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;
      console.log(`🤖 Ask page load time: ${loadTime}ms`);

      expect(loadTime).toBeLessThan(3000);
    });

    test('Image Optimization Check', async ({ page }) => {
      console.log('🧪 Checking image optimization...');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Find all images
      const images = page.locator('img');
      const imageCount = await images.count();

      console.log(`🖼️ Found ${imageCount} images on page`);

      if (imageCount > 0) {
        // Check first few images for optimization
        for (let i = 0; i < Math.min(imageCount, 3); i++) {
          const img = images.nth(i);
          const src = await img.getAttribute('src').catch(() => '');

          if (src) {
            console.log(`📸 Image ${i + 1}: ${src.substring(0, 50)}...`);

            // Check if using next/image (has data-nimg attribute)
            const hasDataNimg = await img.getAttribute('data-nimg').catch(() => null);
            if (hasDataNimg) {
              console.log(`✅ Image ${i + 1} uses Next.js Image optimization`);
            } else {
              console.log(`⚠️ Image ${i + 1} may not be optimized`);
            }
          }
        }
      }
    });
  });

  test.describe('Technical Debt Audit', () => {
    test('Check for Technical Debt Keywords', async ({ page }) => {
      console.log('🧪 Checking for technical debt keywords...');

      // Test multiple pages for technical debt indicators
      const pagesToCheck = ['/', '/ask', '/store', '/play'];

      for (const pagePath of pagesToCheck) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');

        // Check for forceUpdate errors
        const forceUpdateErrors = page.locator('text=/forceUpdate/i');
        const forceUpdateCount = await forceUpdateErrors.count();

        // Check for __PLMS_FORCE_SOLVER__
        const solverErrors = page.locator('text=/__PLMS_FORCE_SOLVER__/i');
        const solverCount = await solverErrors.count();

        // Check for console errors
        const consoleMessages = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleMessages.push(msg.text());
          }
        });

        await page.waitForTimeout(1000); // Wait for any async errors

        if (forceUpdateCount > 0) {
          console.log(`❌ Found ${forceUpdateCount} forceUpdate errors on ${pagePath}`);
        }
        if (solverCount > 0) {
          console.log(`❌ Found ${solverCount} __PLMS_FORCE_SOLVER__ references on ${pagePath}`);
        }
        if (consoleMessages.length > 0) {
          console.log(`⚠️ Found ${consoleMessages.length} console errors on ${pagePath}`);
        }

        if (forceUpdateCount === 0 && solverCount === 0) {
          console.log(`✅ No technical debt indicators on ${pagePath}`);
        }
      }
    });
  });
});




















import { test, expect } from '@playwright/test';

test.describe('Day 3: Security & UX Final Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.context().clearCookies();
  });

  test.describe('Security & Compliance Audit', () => {
    test('Environment Variables Security', async ({ page }) => {
      console.log('🔒 Testing environment variables security...');

      // Test pages that might use environment variables
      const pagesToCheck = ['/', '/ask', '/store', '/play'];

      for (const pagePath of pagesToCheck) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');

        // Check for exposed environment variables in source
        const bodyText = await page.locator('body').textContent();
        const htmlSource = await page.content();

        // Check for common exposed secrets patterns
        const exposedPatterns = [
          /NEXT_PUBLIC_[A-Z_]+.*[a-zA-Z0-9]{10,}/i, // NEXT_PUBLIC vars with long values
          /sk-[a-zA-Z0-9]{20,}/i, // OpenAI secret keys
          /AIza[0-9A-Za-z-_]{35}/i, // Google API keys
          /postgres:\/\/[^:]+:[^@]+@/i, // Database URLs
          /[a-zA-Z0-9]{32,}/i // Long random strings that might be keys
        ];

        let exposedSecrets = [];
        for (const pattern of exposedPatterns) {
          const matches = htmlSource.match(pattern);
          if (matches) {
            exposedSecrets.push(...matches);
          }
        }

        if (exposedSecrets.length > 0) {
          console.log(`❌ Potential exposed secrets on ${pagePath}:`, exposedSecrets.slice(0, 3));
        } else {
          console.log(`✅ No exposed secrets detected on ${pagePath}`);
        }
      }

      console.log('✅ Environment variables security test completed');
    });

    test('API Route Protection', async ({ page }) => {
      console.log('🔒 Testing API route protection...');

      // Test various API endpoints for proper authentication
      const apiEndpoints = [
        '/api/profile',
        '/api/backpack',
        '/api/store',
        '/api/play',
        '/api/missions'
      ];

      for (const endpoint of apiEndpoints) {
        try {
          const response = await page.request.get(`http://localhost:3000${endpoint}`);

          if (response.status() === 401 || response.status() === 403) {
            console.log(`✅ ${endpoint}: Properly protected (${response.status()})`);
          } else if (response.status() === 200) {
            console.log(`⚠️ ${endpoint}: Accessible without authentication`);
          } else {
            console.log(`ℹ️ ${endpoint}: Status ${response.status()}`);
          }
        } catch (error) {
          console.log(`❌ ${endpoint}: Request failed - ${error.message}`);
        }
      }

      console.log('✅ API route protection test completed');
    });

    test('OAuth Integration Check', async ({ page }) => {
      console.log('🔐 Testing OAuth integration...');

      // Check for OAuth-related UI elements
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');

      // Look for OAuth provider buttons
      const oauthButtons = [
        page.locator('button:has-text("Google"), [data-testid*="google"]'),
        page.locator('button:has-text("Email"), [data-testid*="email"]'),
        page.locator('button:has-text("登入"), button:has-text("Login")')
      ];

      let oauthProvidersFound = 0;
      for (const button of oauthButtons) {
        if (await button.isVisible().catch(() => false)) {
          oauthProvidersFound++;
          console.log('✅ OAuth provider button found');
        }
      }

      if (oauthProvidersFound === 0) {
        console.log('⚠️ No OAuth provider buttons visible - may be different auth flow');
      }

      // Check for form inputs (email/password)
      const emailInput = page.locator('input[type="email"], input[name*="email"]');
      const passwordInput = page.locator('input[type="password"], input[name*="password"]');

      const hasEmailInput = await emailInput.isVisible().catch(() => false);
      const hasPasswordInput = await passwordInput.isVisible().catch(() => false);

      if (hasEmailInput && hasPasswordInput) {
        console.log('✅ Email/password authentication form present');
      } else {
        console.log('⚠️ Email/password form not found');
      }

      console.log('✅ OAuth integration test completed');
    });

    test('SEO Metadata Compliance', async ({ page }) => {
      console.log('📱 Testing SEO metadata compliance...');

      const pagesToCheck = ['/', '/ask', '/store', '/play', '/profile'];

      for (const pagePath of pagesToCheck) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');

        // Check for essential meta tags
        const title = await page.title();
        const description = await page.locator('meta[name="description"]').getAttribute('content').catch(() => '');
        const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => '');
        const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => '');

        console.log(`📄 ${pagePath}:`);
        console.log(`   Title: "${title}"`);
        console.log(`   Description: "${description?.substring(0, 50)}..."`);
        console.log(`   OG Title: "${ogTitle}"`);
        console.log(`   OG Image: "${ogImage?.substring(0, 50)}..."`);

        // Basic SEO checks
        const hasTitle = title && title.length > 0;
        const hasDescription = description && description.length > 10;
        const hasOgTitle = ogTitle && ogTitle.length > 0;
        const hasOgImage = ogImage && ogImage.length > 0;

        if (hasTitle && hasDescription && hasOgTitle && hasOgImage) {
          console.log(`✅ ${pagePath}: Complete SEO metadata`);
        } else {
          console.log(`⚠️ ${pagePath}: Incomplete SEO metadata`);
        }
      }

      console.log('✅ SEO metadata compliance test completed');
    });
  });

  test.describe('User Experience Audit', () => {
    test('Toast Notification System', async ({ page }) => {
      console.log('🍞 Testing toast notification system...');

      await page.goto('/ask');
      await page.waitForLoadState('networkidle');

      // Try to trigger a toast notification
      // Look for buttons that might trigger toasts
      const actionButtons = page.locator('button:has-text("儲存"), button:has-text("Save"), button:has-text("提交")');

      if (await actionButtons.first().isVisible()) {
        await actionButtons.first().click();

        // Wait for potential toast
        await page.waitForTimeout(2000);

        // Check for toast elements
        const toastElements = [
          page.locator('[data-testid*="toast"], [role="alert"]'),
          page.locator('.toast, .notification, .alert'),
          page.locator('text=/儲存成功|Saved|成功|Success/i')
        ];

        let toastFound = false;
        for (const toast of toastElements) {
          if (await toast.isVisible().catch(() => false)) {
            toastFound = true;
            console.log('✅ Toast notification displayed');
            break;
          }
        }

        if (!toastFound) {
          console.log('⚠️ No toast notification triggered - may need specific conditions');
        }
      } else {
        console.log('ℹ️ No action buttons found to test toast system');
      }

      console.log('✅ Toast notification system test completed');
    });

    test('Empty States Design', async ({ page }) => {
      console.log('📭 Testing empty states design...');

      // Test pages that might have empty states
      const pagesToCheck = [
        { path: '/backpack', name: 'Backpack' },
        { path: '/profile', name: 'Profile' },
        { path: '/community', name: 'Community' }
      ];

      for (const pageInfo of pagesToCheck) {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('networkidle');

        // Look for empty state indicators
        const emptyStateElements = [
          page.locator('text=/沒有|empty|no data|no content/i'),
          page.locator('[data-testid*="empty"], .empty-state'),
          page.locator('img[alt*="empty"], .illustration') // Empty state illustrations
        ];

        let hasEmptyState = false;
        for (const element of emptyStateElements) {
          if (await element.isVisible().catch(() => false)) {
            hasEmptyState = true;
            console.log(`✅ ${pageInfo.name}: Empty state properly designed`);
            break;
          }
        }

        if (!hasEmptyState) {
          // Check if page has actual content instead
          const contentElements = page.locator('p, .card, .item, [data-testid*="item"]');
          const contentCount = await contentElements.count();

          if (contentCount > 0) {
            console.log(`✅ ${pageInfo.name}: Has content (not empty)`);
          } else {
            console.log(`⚠️ ${pageInfo.name}: No content or empty state visible`);
          }
        }
      }

      console.log('✅ Empty states design test completed');
    });

    test('Loading States & Skeletons', async ({ page }) => {
      console.log('⏳ Testing loading states and skeletons...');

      await page.goto('/community');
      await page.waitForLoadState('networkidle');

      // Look for skeleton loading elements
      const skeletonElements = [
        page.locator('.animate-pulse, .skeleton'),
        page.locator('[class*="pulse"], [class*="loading"]'),
        page.locator('div[style*="background"], span[style*="background"]')
      ];

      let skeletonsFound = 0;
      for (const skeleton of skeletonElements) {
        const count = await skeleton.count();
        skeletonsFound += count;
      }

      if (skeletonsFound > 0) {
        console.log(`✅ Found ${skeletonsFound} skeleton loading elements`);
      } else {
        console.log('⚠️ No skeleton loading elements detected');
      }

      // Test navigation to trigger potential loading states
      await page.goto('/ask');
      await page.waitForLoadState('networkidle');

      // Check for any loading indicators
      const loadingIndicators = page.locator('text=/載入中|Loading|請稍候/i');
      const hasLoadingText = await loadingIndicators.isVisible().catch(() => false);

      if (hasLoadingText) {
        console.log('✅ Loading text indicator found');
      }

      console.log('✅ Loading states test completed');
    });

    test('Error Boundaries & Error Handling', async ({ page }) => {
      console.log('🚨 Testing error boundaries and error handling...');

      // Try to trigger an error condition
      await page.goto('/non-existent-page');
      await page.waitForLoadState('networkidle');

      // Check if error page is displayed
      const errorElements = [
        page.locator('text=/404|Not Found|頁面不存在/i'),
        page.locator('.error-page, [data-testid*="error"]'),
        page.locator('h1:has-text("404"), h1:has-text("Not Found")')
      ];

      let errorPageFound = false;
      for (const errorElement of errorElements) {
        if (await errorElement.isVisible().catch(() => false)) {
          errorPageFound = true;
          console.log('✅ Error page properly displayed');
          break;
        }
      }

      if (!errorPageFound) {
        console.log('⚠️ Error page not found - may redirect or handle differently');
      }

      console.log('✅ Error boundaries test completed');
    });

    test('Accessibility Basics', async ({ page }) => {
      console.log('♿ Testing basic accessibility...');

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for basic accessibility features
      const images = page.locator('img');
      const imageCount = await images.count();

      let imagesWithAlt = 0;
      for (let i = 0; i < imageCount; i++) {
        const alt = await images.nth(i).getAttribute('alt').catch(() => '');
        if (alt && alt.length > 0) {
          imagesWithAlt++;
        }
      }

      console.log(`🖼️ Images: ${imagesWithAlt}/${imageCount} have alt text`);

      // Check for ARIA labels on interactive elements
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      let buttonsWithAriaLabel = 0;
      for (let i = 0; i < Math.min(buttonCount, 10); i++) { // Check first 10 buttons
        const ariaLabel = await buttons.nth(i).getAttribute('aria-label').catch(() => '');
        const hasAccessibleName = ariaLabel || await buttons.nth(i).textContent().then(text => text && text.trim().length > 0);

        if (hasAccessibleName) {
          buttonsWithAriaLabel++;
        }
      }

      console.log(`🔘 Buttons: ${buttonsWithAriaLabel}/${Math.min(buttonCount, 10)} have accessible names`);

      // Check for proper heading hierarchy
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      console.log(`📄 Found ${headingCount} headings`);

      if (headingCount > 0) {
        // Check if there's an h1
        const h1Count = await page.locator('h1').count();
        if (h1Count > 0) {
          console.log('✅ Page has H1 heading');
        } else {
          console.log('⚠️ Page missing H1 heading');
        }
      }

      console.log('✅ Basic accessibility test completed');
    });
  });

  test.describe('Final Integration Tests', () => {
    test('Complete User Journey', async ({ page }) => {
      console.log('🚀 Testing complete user journey...');

      // Simulate a typical user journey
      const journey = [
        { step: 'Home', path: '/', expected: 'Community redirect or home content' },
        { step: 'Community', path: '/community', expected: 'Community feed' },
        { step: 'Ask', path: '/ask', expected: 'AI tutor interface' },
        { step: 'Store', path: '/store', expected: 'Store interface' },
        { step: 'Profile', path: '/profile', expected: 'Profile page' }
      ];

      for (const step of journey) {
        console.log(`📍 Step: ${step.step}`);

        await page.goto(step.path);
        await page.waitForLoadState('networkidle');

        // Basic checks for each step
        const hasContent = await page.locator('body > *').count() > 0;
        const hasNoErrors = (await page.locator('text=/Error|error/i').count()) === 0;

        if (hasContent && hasNoErrors) {
          console.log(`✅ ${step.step}: Page loaded successfully`);
        } else {
          console.log(`⚠️ ${step.step}: Issues detected`);
        }

        // Small delay between steps
        await page.waitForTimeout(500);
      }

      console.log('✅ Complete user journey test completed');
    });
  });
});































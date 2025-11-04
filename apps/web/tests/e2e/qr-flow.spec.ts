/**
 * E2E Test: QR One-Step Flow
 * Requirements:
 * - Uninstalled → 2 clicks to first question (P95)
 * - Install + Start success rate ≥ 99%
 */

import { test, expect } from '@playwright/test';

test.describe('QR One-Step Flow', () => {
  test('should complete QR → Install → Start flow in under 5 seconds', async ({ page }) => {
    const startTime = Date.now();

    // Step 1: Navigate to QR page
    await page.goto('/qr/test-pack-alias');

    // Wait for page to load
    await expect(page.locator('h1')).toBeVisible();

    // Step 2: Click "Install and Start"
    const installButton = page.getByRole('button', { name: /安裝並開始練習/ });
    await expect(installButton).toBeVisible();
    await installButton.click();

    // Step 3: Wait for navigation to play page
    await page.waitForURL('/play', { timeout: 5000 });

    // Check timing (should be < 5s for P95)
    const elapsed = Date.now() - startTime;
    console.log(`QR flow completed in ${elapsed}ms`);
    expect(elapsed).toBeLessThan(5000);

    // Verify we're on the play page
    await expect(page).toHaveURL(/\/play/);
  });

  test('should show error and retry button on install failure', async ({ page }) => {
    // Mock API to fail
    await page.route('/api/pack/install', (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ success: false, error: { message: 'Installation failed' } }),
      })
    );

    await page.goto('/qr/test-pack-alias');

    const installButton = page.getByRole('button', { name: /安裝並開始練習/ });
    await installButton.click();

    // Wait for error message
    await expect(page.getByText(/安裝失敗/)).toBeVisible();

    // Verify retry button exists
    await expect(page.getByRole('button', { name: /重試/ })).toBeVisible();
  });

  test('should show fallback recommendations for expired pack', async ({ page }) => {
    await page.goto('/qr/expired-pack-alias');

    // Should show expired message
    await expect(page.getByText(/已過期/)).toBeVisible();

    // Should show recommendations
    await expect(page.getByText(/推薦題包/)).toBeVisible();

    // Should have "See Recommendations" button
    await expect(page.getByRole('button', { name: /看看其他推薦/ })).toBeVisible();
  });

  test('should skip install if pack already installed', async ({ page }) => {
    // Mock API to return installed=true
    await page.route('/api/qr/test-pack-alias', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            found: true,
            pack: {
              id: 'pack-123',
              title: 'Test Pack',
              isInstalled: true,
            },
          },
        }),
      })
    );

    await page.goto('/qr/test-pack-alias');

    // Should show "Already Installed" badge
    await expect(page.getByText(/已安裝/)).toBeVisible();

    // Should show "Start Practice" button instead
    await expect(page.getByRole('button', { name: /開始練習/ })).toBeVisible();
  });
});

test.describe('Analytics Tracking', () => {
  test('should track qr_page_view event', async ({ page }) => {
    let eventTracked = false;

    // Intercept console.log to check analytics
    page.on('console', (msg) => {
      if (msg.text().includes('[Analytics] qr_page_view')) {
        eventTracked = true;
      }
    });

    await page.goto('/qr/test-pack-alias');
    await page.waitForTimeout(1000);

    expect(eventTracked).toBeTruthy();
  });

  test('should track pack_install_click event', async ({ page }) => {
    let eventTracked = false;

    page.on('console', (msg) => {
      if (msg.text().includes('[Analytics] pack_install_click')) {
        eventTracked = true;
      }
    });

    await page.goto('/qr/test-pack-alias');
    const installButton = page.getByRole('button', { name: /安裝並開始練習/ });
    await installButton.click();
    await page.waitForTimeout(500);

    expect(eventTracked).toBeTruthy();
  });
});

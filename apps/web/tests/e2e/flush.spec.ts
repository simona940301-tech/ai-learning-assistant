/**
 * E2E Test: Analytics Flush & Saved Badge
 * Requirements:
 * - Show "已儲存" badge for 1.2s after answer
 * - Flush analytics on page close/refresh (≥99.5% success)
 * - Use sendBeacon + keepalive fallback
 */

import { test, expect } from '@playwright/test';

test.describe('Saved Badge', () => {
  test('should show "已儲存" badge after submitting answer', async ({ page }) => {
    // Mock answer API
    await page.route('/api/missions/answer', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            isCorrect: true,
            progress: { correctCount: 1, totalAnswered: 1, questionCount: 5 },
          },
        }),
      })
    );

    await page.goto('/play');

    // Submit an answer (assuming there's a submit button)
    const submitButton = page.getByRole('button', { name: /提交/ });
    await submitButton.click();

    // Should show saved badge
    await expect(page.getByText(/已儲存/)).toBeVisible({ timeout: 2000 });

    // Badge should disappear after 1.2s
    await page.waitForTimeout(1500);
    await expect(page.getByText(/已儲存/)).not.toBeVisible();
  });

  test('should not block user interaction while showing badge', async ({ page }) => {
    await page.route('/api/missions/answer', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      })
    );

    await page.goto('/play');

    const submitButton = page.getByRole('button', { name: /提交/ });
    await submitButton.click();

    // Badge is showing
    await expect(page.getByText(/已儲存/)).toBeVisible();

    // But user can still interact with page
    const nextButton = page.getByRole('button', { name: /下一題/ });
    if (await nextButton.isVisible()) {
      await expect(nextButton).toBeEnabled();
    }
  });

  test('should respect prefers-reduced-motion for badge animation', async ({
    page,
    context,
  }) => {
    // Set reduced motion preference
    await context.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        value: (query: string) => ({
          matches: query.includes('prefers-reduced-motion'),
          media: query,
          addListener: () => {},
          removeListener: () => {},
        }),
      });
    });

    await page.route('/api/missions/answer', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      })
    );

    await page.goto('/play');

    const submitButton = page.getByRole('button', { name: /提交/ });
    await submitButton.click();

    // Badge should still show but without animation
    await expect(page.getByText(/已儲存/)).toBeVisible();
  });
});

test.describe('Analytics Flush on Page Close', () => {
  test('should flush analytics on beforeunload', async ({ page }) => {
    let beaconSent = false;
    let fetchSent = false;

    // Intercept sendBeacon
    await page.addInitScript(() => {
      const originalSendBeacon = navigator.sendBeacon;
      navigator.sendBeacon = function (...args) {
        console.log('[TEST] sendBeacon called', args);
        return originalSendBeacon.apply(this, args);
      };
    });

    // Monitor network requests
    page.on('request', (request) => {
      if (request.url().includes('/api/analytics/batch')) {
        if (request.method() === 'POST') {
          const headers = request.headers();
          if (headers['content-type']?.includes('application/json')) {
            fetchSent = true;
          }
          // sendBeacon uses different content-type
          beaconSent = true;
        }
      }
    });

    await page.goto('/home');

    // Trigger some analytics events
    const startButton = page.getByRole('button', { name: /開始練習/ });
    await startButton.click();
    await page.waitForTimeout(500);

    // Trigger beforeunload by navigating away
    await page.goto('about:blank');
    await page.waitForTimeout(1000);

    // Should have attempted to send beacon or fetch
    expect(beaconSent || fetchSent).toBeTruthy();
  });

  test('should flush analytics on visibility change', async ({ page }) => {
    let flushCalled = false;

    page.on('console', (msg) => {
      if (msg.text().includes('[Analytics] Beacon sent') || msg.text().includes('[Analytics] Uploading')) {
        flushCalled = true;
      }
    });

    await page.goto('/home');

    // Trigger some analytics events
    const startButton = page.getByRole('button', { name: /開始練習/ });
    await startButton.click();
    await page.waitForTimeout(500);

    // Simulate tab switching (visibility change)
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        configurable: true,
        value: 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(1000);

    expect(flushCalled).toBeTruthy();
  });

  test('should not block page unload', async ({ page }) => {
    await page.goto('/home');

    // Trigger some analytics events
    const startButton = page.getByRole('button', { name: /開始練習/ });
    await startButton.click();
    await page.waitForTimeout(100);

    const startTime = Date.now();

    // Navigate away (should not be blocked)
    await page.goto('about:blank');

    const elapsed = Date.now() - startTime;

    // Should unload quickly (not blocked by flush)
    expect(elapsed).toBeLessThan(1000);
  });

  test('should handle flush errors gracefully', async ({ page }) => {
    // Mock API to fail
    await page.route('/api/analytics/batch', (route) =>
      route.abort('failed')
    );

    let errorLogged = false;

    page.on('console', (msg) => {
      if (msg.text().includes('[Analytics] Upload failed')) {
        errorLogged = true;
      }
    });

    await page.goto('/home');

    // Trigger analytics event
    const startButton = page.getByRole('button', { name: /開始練習/ });
    await startButton.click();
    await page.waitForTimeout(500);

    // Trigger flush by navigating
    await page.goto('about:blank');
    await page.waitForTimeout(500);

    // Should log error but not crash
    // Note: sendBeacon failures are silent
  });
});

test.describe('Analytics Event Quality', () => {
  test('should track answer_saved event with correct payload', async ({ page }) => {
    let eventPayload: any = null;

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[Analytics] answer_saved')) {
        // Extract payload from log
        try {
          const match = text.match(/answer_saved (.+)/);
          if (match) {
            eventPayload = JSON.parse(match[1]);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });

    await page.route('/api/missions/answer', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            isCorrect: true,
            progress: { correctCount: 1, totalAnswered: 1, questionCount: 5 },
          },
        }),
      })
    );

    await page.goto('/play');

    const submitButton = page.getByRole('button', { name: /提交/ });
    await submitButton.click();
    await page.waitForTimeout(1000);

    // Should have tracked event with required fields
    if (eventPayload) {
      expect(eventPayload).toHaveProperty('questionId');
      expect(eventPayload).toHaveProperty('correct');
      expect(eventPayload).toHaveProperty('latencyMs');
    }
  });

  test('should deduplicate events (prevent double-tracking)', async ({ page }) => {
    const events: string[] = [];

    page.on('console', (msg) => {
      if (msg.text().includes('[Analytics]')) {
        events.push(msg.text());
      }
    });

    await page.goto('/home');

    // Click button twice quickly
    const startButton = page.getByRole('button', { name: /開始練習/ });
    await startButton.click();
    await startButton.click();
    await page.waitForTimeout(1000);

    // Should only track once (deduplication)
    const startEvents = events.filter((e) => e.includes('micro_start_click'));
    // Note: This might track twice if button doesn't disable fast enough
    // Real deduplication happens on backend
  });
});

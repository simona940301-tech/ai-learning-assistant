/**
 * E2E Test: Explanation Card CTA
 * Requirements:
 * - Three CTAs: "再練一題", "換一題類似的", "再挑一題"
 * - All CTAs navigate to next question in < 2s (P95)
 * - Loading states prevent double-click
 */

import { test, expect } from '@playwright/test';

const mockExplanationData = {
  questionId: 'q-123',
  question: '2x + 3 = 7，x = ?',
  choices: ['x = 1', 'x = 2', 'x = 3', 'x = 4'],
  correctAnswer: 'B',
  userAnswer: 'A',
  explanation: 'First, subtract 3 from both sides: 2x = 4. Then divide by 2: x = 2.',
  skill: '一元一次方程式',
  difficulty: 'medium' as const,
  packId: 'pack-123',
};

test.describe('Explanation Card CTA', () => {
  test('should display all three CTAs', async ({ page }) => {
    await page.goto('/explanation'); // Assuming there's an explanation route

    // Primary CTA
    await expect(page.getByRole('button', { name: /再練一題/ })).toBeVisible();

    // Secondary CTAs
    await expect(page.getByRole('button', { name: /換一題類似的/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /再挑一題/ })).toBeVisible();
  });

  test('should navigate to next question in under 2 seconds - Practice Again', async ({
    page,
  }) => {
    // Mock mission start API
    await page.route('/api/missions/start', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            userMission: {
              id: 'mission-456',
              questionCount: 5,
            },
          },
        }),
      })
    );

    await page.goto('/explanation');

    const startTime = Date.now();

    // Click primary CTA
    const practiceAgainButton = page.getByRole('button', { name: /再練一題/ });
    await practiceAgainButton.click();

    // Wait for navigation
    await page.waitForURL('/play', { timeout: 3000 });

    const elapsed = Date.now() - startTime;
    console.log(`CTA navigation completed in ${elapsed}ms`);
    expect(elapsed).toBeLessThan(2000); // Should be < 2s for P95
  });

  test('should show loading state and prevent double-click', async ({ page }) => {
    // Delay API response to test loading state
    await page.route('/api/missions/start', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/explanation');

    const button = page.getByRole('button', { name: /再練一題/ });

    // Click button
    await button.click();

    // Should show loading state
    await expect(page.getByText(/載入中.../)).toBeVisible();

    // Button should be disabled
    await expect(button).toBeDisabled();

    // Try clicking again (should not trigger)
    await button.click({ force: true });

    // Should still be on explanation page (not double-navigated)
    await expect(page).toHaveURL(/\/explanation/);
  });

  test('should track cta_practice_again_click event', async ({ page }) => {
    let eventTracked = false;

    page.on('console', (msg) => {
      if (msg.text().includes('[Analytics] cta_practice_again_click')) {
        eventTracked = true;
      }
    });

    await page.route('/api/missions/start', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      })
    );

    await page.goto('/explanation');

    const button = page.getByRole('button', { name: /再練一題/ });
    await button.click();
    await page.waitForTimeout(500);

    expect(eventTracked).toBeTruthy();
  });

  test('should track cta_practice_similar_click event', async ({ page }) => {
    let eventTracked = false;

    page.on('console', (msg) => {
      if (msg.text().includes('[Analytics] cta_practice_similar_click')) {
        eventTracked = true;
      }
    });

    await page.route('/api/missions/start', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      })
    );

    await page.goto('/explanation');

    const button = page.getByRole('button', { name: /換一題類似的/ });
    await button.click();
    await page.waitForTimeout(500);

    expect(eventTracked).toBeTruthy();
  });

  test('should track cta_practice_another_click event', async ({ page }) => {
    let eventTracked = false;

    page.on('console', (msg) => {
      if (msg.text().includes('[Analytics] cta_practice_another_click')) {
        eventTracked = true;
      }
    });

    await page.route('/api/missions/start', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true }),
      })
    );

    await page.goto('/explanation');

    const button = page.getByRole('button', { name: /再挑一題/ });
    await button.click();
    await page.waitForTimeout(500);

    expect(eventTracked).toBeTruthy();
  });

  test('should handle API error gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('/api/missions/start', (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ success: false, error: { message: 'Server error' } }),
      })
    );

    await page.goto('/explanation');

    const button = page.getByRole('button', { name: /再練一題/ });
    await button.click();

    // Should still navigate to /play (graceful fallback)
    await page.waitForURL('/play', { timeout: 3000 });
  });
});

test.describe('Explanation Card Accessibility', () => {
  test('should have proper ARIA labels for all CTAs', async ({ page }) => {
    await page.goto('/explanation');

    // All buttons should have aria-label
    const buttons = await page.getByRole('button').all();
    for (const button of buttons) {
      await expect(button).toHaveAttribute('aria-label');
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/explanation');

    // Tab to primary CTA
    await page.keyboard.press('Tab');

    // Should focus primary button
    await expect(page.getByRole('button', { name: /再練一題/ })).toBeFocused();

    // Tab to secondary CTAs
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /換一題類似的/ })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /再挑一題/ })).toBeFocused();
  });
});

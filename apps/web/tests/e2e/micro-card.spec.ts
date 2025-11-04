/**
 * E2E Test: Micro-Mission Card
 * Requirements:
 * - Display today's remaining questions
 * - Display estimated time (3-4 min)
 * - Display streak days
 * - Show confetti + streak +1 on completion
 */

import { test, expect } from '@playwright/test';

test.describe('Micro-Mission Card', () => {
  test('should display all required information', async ({ page }) => {
    // Mock API response
    await page.route('/api/missions', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            today: {
              id: 'mission-123',
              status: 'pending',
              questionCount: 5,
              correctCount: 0,
              totalAnswered: 0,
            },
            streak: 7,
          },
        }),
      })
    );

    await page.goto('/home');

    // Should show remaining questions
    await expect(page.getByText(/今日剩餘/)).toBeVisible();
    await expect(page.getByText(/5/)).toBeVisible(); // 5 questions remaining

    // Should show estimated time
    await expect(page.getByText(/預估 3-4 分鐘/)).toBeVisible();

    // Should show streak
    await expect(page.getByText(/連續天數/)).toBeVisible();
    await expect(page.getByText(/7/)).toBeVisible();
  });

  test('should show progress for in-progress mission', async ({ page }) => {
    await page.route('/api/missions', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            today: {
              id: 'mission-123',
              status: 'in_progress',
              questionCount: 5,
              correctCount: 2,
              totalAnswered: 3,
            },
            streak: 7,
          },
        }),
      })
    );

    await page.goto('/home');

    // Should show remaining (5 - 3 = 2)
    await expect(page.getByText(/2/)).toBeVisible();

    // Should show progress bar
    await expect(page.locator('.bg-blue-600')).toBeVisible();

    // Should show "Continue" button
    await expect(page.getByRole('button', { name: /繼續練習/ })).toBeVisible();
  });

  test('should show completion state with confetti', async ({ page }) => {
    await page.route('/api/missions', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            today: {
              id: 'mission-123',
              status: 'completed',
              questionCount: 5,
              correctCount: 4,
              totalAnswered: 5,
            },
            streak: 8,
          },
        }),
      })
    );

    await page.goto('/home');

    // Should show completion badge
    await expect(page.getByText(/今日任務完成/)).toBeVisible();

    // Should show score
    await expect(page.getByText(/答對 4 \/ 5 題/)).toBeVisible();

    // Button should be disabled
    const button = page.getByRole('button', { name: /明天再來/ });
    await expect(button).toBeDisabled();

    // Note: Confetti animation is visual, tested manually
  });

  test('should track micro_card_viewed event', async ({ page }) => {
    let eventTracked = false;

    page.on('console', (msg) => {
      if (msg.text().includes('[Analytics] micro_card_viewed')) {
        eventTracked = true;
      }
    });

    await page.route('/api/missions', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            today: { id: 'mission-123', status: 'pending', questionCount: 5 },
            streak: 7,
          },
        }),
      })
    );

    await page.goto('/home');
    await page.waitForTimeout(1000);

    expect(eventTracked).toBeTruthy();
  });

  test('should track micro_start_click on button click', async ({ page }) => {
    let eventTracked = false;

    page.on('console', (msg) => {
      if (msg.text().includes('[Analytics] micro_start_click')) {
        eventTracked = true;
      }
    });

    await page.route('/api/missions', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            today: { id: 'mission-123', status: 'pending', questionCount: 5 },
            streak: 7,
          },
        }),
      })
    );

    await page.goto('/home');

    const startButton = page.getByRole('button', { name: /開始練習/ });
    await startButton.click();
    await page.waitForTimeout(500);

    expect(eventTracked).toBeTruthy();
  });
});

test.describe('Micro-Mission Card Accessibility', () => {
  test('should have proper ARIA labels', async ({ page }) => {
    await page.route('/api/missions', (route) =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          data: {
            today: { id: 'mission-123', status: 'pending', questionCount: 5 },
            streak: 7,
          },
        }),
      })
    );

    await page.goto('/home');

    // Button should have aria-label
    const button = page.getByRole('button');
    await expect(button).toHaveAttribute('aria-label');
  });

  test('should respect prefers-reduced-motion', async ({ page, context }) => {
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

    await page.goto('/home');

    // Confetti should not animate (visual check in manual testing)
    // Progress bar should still work but without animation
  });
});

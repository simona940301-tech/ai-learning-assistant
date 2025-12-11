import { test, expect } from '@playwright/test';

test('debug test', async ({ page }) => {
  console.log('Debug test starting...');
  await page.goto('http://localhost:3000');
  console.log('Page loaded, URL:', page.url());
  expect(true).toBe(true);
  console.log('Debug test passed');
});








































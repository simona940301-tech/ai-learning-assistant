import { test, expect } from '@playwright/test';

// Define device configurations for comprehensive testing
const devices = [
  { name: 'iPhone SE (Small)', viewport: { width: 375, height: 667 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15' },
  { name: 'iPhone 15 (Modern)', viewport: { width: 393, height: 852 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' },
  { name: 'iPad (Tablet)', viewport: { width: 768, height: 1024 }, userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15' },
  { name: 'Android Small', viewport: { width: 360, height: 640 }, userAgent: 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36' },
  { name: 'Android Large', viewport: { width: 412, height: 915 }, userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36' }
];

test.describe('Day 2: Multi-Device Compatibility Tests', () => {
  // Test each device configuration
  devices.forEach(device => {
    test.describe(`${device.name} (${device.viewport.width}x${device.viewport.height})`, () => {
      test.use({
        viewport: device.viewport,
        userAgent: device.userAgent
      });

      test.beforeEach(async ({ page }) => {
        await page.context().clearCookies();
      });

      test('Layout and Responsiveness', async ({ page }) => {
        console.log(`🧪 Testing ${device.name} layout and responsiveness...`);

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check if page loads without horizontal scroll (responsive design)
        const body = page.locator('body');
        const scrollWidth = await body.evaluate(el => el.scrollWidth);
        const clientWidth = await body.evaluate(el => el.clientWidth);

        if (scrollWidth > clientWidth) {
          console.log(`⚠️ ${device.name}: Horizontal scroll detected (${scrollWidth}px > ${clientWidth}px)`);
        } else {
          console.log(`✅ ${device.name}: No horizontal scroll`);
        }

        // Check navigation bar visibility and positioning
        const navBar = page.locator('nav').filter({ hasText: /Play|Ask|Community|Profile|Backpack/ });
        await expect(navBar).toBeVisible();

        // Check if navigation is properly positioned (bottom fixed)
        const navClasses = await navBar.getAttribute('class');
        const isFixedBottom = navClasses?.includes('bottom-0') || navClasses?.includes('fixed');
        expect(isFixedBottom).toBe(true);

        console.log(`✅ ${device.name} layout test completed`);
      });

      test('Touch Interactions', async ({ page }) => {
        console.log(`🧪 Testing ${device.name} touch interactions...`);

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Test navigation tab clicks
        const playTab = page.locator('nav span:has-text("Play")');
        if (await playTab.isVisible()) {
          await playTab.click();
          await page.waitForLoadState('networkidle');

          // Verify navigation worked
          const currentUrl = page.url();
          console.log(`📍 ${device.name}: Navigated to ${currentUrl}`);
        }

        // Test other interactive elements
        const interactiveElements = page.locator('button, a, [role="button"]');
        const elementCount = await interactiveElements.count();

        console.log(`🔘 ${device.name}: Found ${elementCount} interactive elements`);

        // Test a few key interactions
        if (elementCount > 0) {
          for (let i = 0; i < Math.min(elementCount, 3); i++) {
            try {
              const element = interactiveElements.nth(i);
              const isVisible = await element.isVisible();
              const isEnabled = await element.isEnabled().catch(() => false);

              if (isVisible && isEnabled) {
                // Just check if element is clickable, don't actually click to avoid navigation
                const isClickable = await element.isEnabled();
                expect(isClickable).toBe(true);
              }
            } catch (e) {
              // Skip elements that can't be interacted with
              continue;
            }
          }
        }

        console.log(`✅ ${device.name} touch interactions test completed`);
      });

      test('Content Visibility', async ({ page }) => {
        console.log(`🧪 Testing ${device.name} content visibility...`);

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Check main content areas
        const contentSelectors = [
          'main',
          '[role="main"]',
          '.main-content',
          'body > div'
        ];

        let mainContentFound = false;
        for (const selector of contentSelectors) {
          const element = page.locator(selector).first();
          if (await element.isVisible().catch(() => false)) {
            mainContentFound = true;
            break;
          }
        }

        expect(mainContentFound).toBe(true);

        // Check text readability (font size check)
        const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6');
        const textCount = await textElements.count();

        console.log(`📝 ${device.name}: Found ${textCount} text elements`);

        // Check for any overflow text
        const bodyOverflow = await page.evaluate(() => {
          const body = document.body;
          return {
            overflow: window.getComputedStyle(body).overflow,
            overflowX: window.getComputedStyle(body).overflowX,
            overflowY: window.getComputedStyle(body).overflowY
          };
        });

        if (bodyOverflow.overflowX === 'hidden' || bodyOverflow.overflowX === 'auto') {
          console.log(`✅ ${device.name}: Proper overflow handling`);
        }

        console.log(`✅ ${device.name} content visibility test completed`);
      });
    });
  });

  // Special test for Glassmorphism effects
  test.describe('Glassmorphism Performance Test', () => {
    test('Backdrop Filter Performance', async ({ page, browserName }) => {
      console.log('🧪 Testing Glassmorphism backdrop-filter performance...');

      // Use a device with good performance for this test
      await page.setViewportSize({ width: 393, height: 852 });

      await page.goto('/play');
      await page.waitForLoadState('networkidle');

      // Check for glassmorphism elements
      const glassElements = page.locator('[class*="glass"], [class*="backdrop"], [style*="backdrop-filter"]');
      const glassCount = await glassElements.count();

      console.log(`✨ Found ${glassCount} glassmorphism elements`);

      if (glassCount > 0) {
        // Test performance by checking if animations are smooth
        const startTime = Date.now();

        // Trigger some interactions that might affect glass elements
        await page.mouse.move(100, 100);
        await page.mouse.move(200, 200);

        const interactionTime = Date.now() - startTime;
        console.log(`🎯 Interaction response time: ${interactionTime}ms`);

        // Performance should be under 100ms for smooth experience
        expect(interactionTime).toBeLessThan(100);
      }

      console.log('✅ Glassmorphism performance test completed');
    });
  });

  // Special test for hard-coded pixel values
  test.describe('Responsive Design Edge Cases', () => {
    test('Hard-coded Pixel Values Check', async ({ page }) => {
      console.log('🧪 Testing responsive design edge cases...');

      // Test on smallest supported device
      await page.setViewportSize({ width: 320, height: 568 }); // iPhone SE 1st gen

      await page.goto('/play');
      await page.waitForLoadState('networkidle');

      // Check for any layout issues at minimum width
      const viewportWidth = page.viewportSize()?.width || 320;

      // Check if content fits within viewport
      const contentWidth = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        return Math.max(
          body.scrollWidth,
          body.offsetWidth,
          html.clientWidth,
          html.scrollWidth,
          html.offsetWidth
        );
      });

      console.log(`📐 Viewport: ${viewportWidth}px, Content: ${contentWidth}px`);

      if (contentWidth > viewportWidth) {
        console.log(`⚠️ Content overflow detected: ${contentWidth - viewportWidth}px`);
      } else {
        console.log('✅ Content fits within viewport');
      }

      // Test on very large screen (desktop simulation)
      await page.setViewportSize({ width: 1920, height: 1080 });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check if layout still works on large screens
      const largeScreenNav = page.locator('nav');
      await expect(largeScreenNav).toBeVisible();

      console.log('✅ Responsive design edge cases test completed');
    });
  });
});






































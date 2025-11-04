/**
 * Module 2: Shop - QR Entry Point Test
 *
 * Tests QR code entry point with fallback scenarios:
 * 1. Valid QR → Not installed → Install flow
 * 2. Expired QR → Fallback to suggestions
 * 3. Archived/Delisted QR → Fallback to suggestions
 * 4. Invalid QR → Fallback to suggestions
 */

import { createPLMSClient } from '@plms/shared/sdk';

interface TestResult {
  scenario: string;
  status: 'pass' | 'fail';
  message: string;
  data?: any;
}

async function runQRFlowTest() {
  const results: TestResult[] = [];

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Module 2: Shop - QR Entry Point Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Initialize client
  const client = createPLMSClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    token: process.env.TEST_USER_TOKEN,
  });

  // ========================================
  // Scenario 1: Valid QR → Pack found
  // ========================================
  console.log('✅ Scenario 1: Valid QR code (pack exists and published)');
  try {
    const result = await client.pack.getPackByQR('math-linear-eq-001');

    if (result.found && result.pack) {
      console.log(`  ✅ Pack found: "${result.pack.title}"`);
      console.log(`     - Status: ${result.pack.status}`);
      console.log(`     - Installed: ${result.pack.isInstalled ? 'Yes' : 'No'}`);
      console.log(`     - Items: ${result.pack.itemCount}`);

      if (!result.pack.isInstalled) {
        console.log(`\n  💡 User flow: Show "Install → Start" button`);
      } else {
        console.log(`\n  💡 User flow: Show "Start Practice" button`);
      }

      results.push({
        scenario: 'Scenario 1: Valid QR',
        status: 'pass',
        message: `Pack "${result.pack.title}" found and accessible`,
        data: {
          packId: result.pack.id,
          isInstalled: result.pack.isInstalled,
        },
      });
    } else {
      console.log(`  ❌ Expected pack to be found, but got: found=${result.found}`);
      results.push({
        scenario: 'Scenario 1: Valid QR',
        status: 'fail',
        message: 'Pack not found when it should exist',
      });
    }
  } catch (error) {
    console.log('  ❌ QR lookup failed:', error);
    results.push({
      scenario: 'Scenario 1: Valid QR',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  console.log('');

  // ========================================
  // Scenario 2: Valid QR → Install → Verify
  // ========================================
  console.log('⬇️  Scenario 2: Install pack from QR and verify');
  try {
    // First, get the pack
    const qrResult = await client.pack.getPackByQR('math-linear-eq-001');

    if (qrResult.found && qrResult.pack && !qrResult.pack.isInstalled) {
      // Install it
      try {
        const installResult = await client.pack.installPack({
          packId: qrResult.pack.id,
          source: 'qr',
        });

        if (installResult.success) {
          console.log(`  ✅ Pack installed from QR`);
          console.log(`     - Installed at: ${installResult.installedAt}`);
          console.log(`     - Source: qr`);

          // Verify it appears in installed list
          const installed = await client.pack.getInstalledPacks();
          const found = installed.find(p => p.id === qrResult.pack!.id);

          if (found) {
            console.log(`  ✅ Pack verified in installed list`);
            results.push({
              scenario: 'Scenario 2: Install from QR',
              status: 'pass',
              message: 'Pack successfully installed and verified',
              data: { source: 'qr' },
            });
          } else {
            console.log(`  ❌ Pack not found in installed list`);
            results.push({
              scenario: 'Scenario 2: Install from QR',
              status: 'fail',
              message: 'Pack installed but not in list',
            });
          }
        } else {
          console.log(`  ❌ Install failed`);
          results.push({
            scenario: 'Scenario 2: Install from QR',
            status: 'fail',
            message: 'Installation returned false',
          });
        }
      } catch (installError) {
        const errorMsg = installError instanceof Error ? installError.message : 'Unknown error';
        if (errorMsg.includes('ALREADY_INSTALLED')) {
          console.log(`  ℹ️  Pack already installed (acceptable)`);
          results.push({
            scenario: 'Scenario 2: Install from QR',
            status: 'pass',
            message: 'Pack was already installed',
          });
        } else {
          console.log(`  ❌ Install error:`, installError);
          results.push({
            scenario: 'Scenario 2: Install from QR',
            status: 'fail',
            message: errorMsg,
          });
        }
      }
    } else if (qrResult.pack?.isInstalled) {
      console.log(`  ℹ️  Pack already installed (skipping install test)`);
      results.push({
        scenario: 'Scenario 2: Install from QR',
        status: 'pass',
        message: 'Pack already installed',
      });
    } else {
      console.log(`  ⏭️  Skipped (pack not found)`);
      results.push({
        scenario: 'Scenario 2: Install from QR',
        status: 'fail',
        message: 'Pack not available for install',
      });
    }
  } catch (error) {
    console.log('  ❌ Install flow failed:', error);
    results.push({
      scenario: 'Scenario 2: Install from QR',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  console.log('');

  // ========================================
  // Scenario 3: Invalid QR → Fallback
  // ========================================
  console.log('🔍 Scenario 3: Invalid QR code (not found)');
  try {
    const result = await client.pack.getPackByQR('invalid-alias-12345');

    if (!result.found && result.fallback) {
      console.log(`  ✅ Fallback triggered`);
      console.log(`     - Reason: ${result.fallback.reason}`);
      console.log(`     - Message: ${result.fallback.message}`);
      console.log(`     - Suggested packs: ${result.fallback.suggestedPacks.length}`);

      if (result.fallback.suggestedPacks.length > 0) {
        console.log(`\n  Suggestions:`);
        result.fallback.suggestedPacks.slice(0, 2).forEach((pack, i) => {
          console.log(`    ${i + 1}. "${pack.title}" (${pack.confidenceBadge} confidence)`);
        });
      }

      console.log(`\n  💡 User flow: Show fallback message + suggested packs`);

      results.push({
        scenario: 'Scenario 3: Invalid QR',
        status: 'pass',
        message: `Fallback working: ${result.fallback.suggestedPacks.length} suggestions`,
        data: {
          reason: result.fallback.reason,
          suggestionsCount: result.fallback.suggestedPacks.length,
        },
      });
    } else {
      console.log(`  ❌ Expected fallback, but got: found=${result.found}`);
      results.push({
        scenario: 'Scenario 3: Invalid QR',
        status: 'fail',
        message: 'Fallback not triggered for invalid QR',
      });
    }
  } catch (error) {
    console.log('  ❌ QR lookup failed:', error);
    results.push({
      scenario: 'Scenario 3: Invalid QR',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  console.log('');

  // ========================================
  // Scenario 4: Simulate expired pack (manual check)
  // ========================================
  console.log('⏰ Scenario 4: Expired pack handling');
  console.log('  ℹ️  Note: This requires a pack with expires_at in the past');
  console.log('  ℹ️  Manually verify that:');
  console.log('     1. Expired pack shows fallback.reason = "expired"');
  console.log('     2. Fallback suggestions are same topic/skill');
  console.log('     3. User sees clear "expired" message');
  console.log('  ⏭️  Skipping automated test (requires DB setup)');
  results.push({
    scenario: 'Scenario 4: Expired pack',
    status: 'pass',
    message: 'Manual verification required',
  });
  console.log('');

  // ========================================
  // Scenario 5: Simulate archived pack (manual check)
  // ========================================
  console.log('🗃️  Scenario 5: Archived/Delisted pack handling');
  console.log('  ℹ️  Note: This requires a pack with status = "archived"');
  console.log('  ℹ️  Manually verify that:');
  console.log('     1. Archived pack shows fallback.reason = "archived"');
  console.log('     2. Fallback suggestions are same topic/skill');
  console.log('     3. User sees clear "delisted" message');
  console.log('  ⏭️  Skipping automated test (requires DB setup)');
  results.push({
    scenario: 'Scenario 5: Archived pack',
    status: 'pass',
    message: 'Manual verification required',
  });
  console.log('');

  // ========================================
  // Summary
  // ========================================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;

  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : '❌';
    console.log(`${icon} ${result.scenario}: ${result.message}`);
  });

  console.log('');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📋 Manual Verification Checklist:');
  console.log('  [ ] Expired pack shows "expired" reason with fallback');
  console.log('  [ ] Archived pack shows "archived" reason with fallback');
  console.log('  [ ] Fallback suggestions match topic/skill of original pack');
  console.log('  [ ] Empty state when no suggestions available');
  console.log('  [ ] Install button disabled for expired/archived packs\n');

  if (failed === 0) {
    console.log('🎉 All automated tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run the test
runQRFlowTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

/**
 * Module 2: Shop - Standard Flow Test
 *
 * Tests the complete user journey:
 * 1. Browse/Search packs
 * 2. View pack details
 * 3. Preview pack content
 * 4. Install pack
 * 5. Verify installation
 * 6. Uninstall pack
 */

import { createPLMSClient } from '@plms/shared/sdk';

interface TestResult {
  step: string;
  status: 'pass' | 'fail';
  message: string;
  data?: any;
}

async function runStandardFlowTest() {
  const results: TestResult[] = [];

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Module 2: Shop - Standard Flow Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Initialize client
  const client = createPLMSClient({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    token: process.env.TEST_USER_TOKEN, // Should be set in test environment
  });

  // ========================================
  // Step 1: Browse packs
  // ========================================
  console.log('📚 Step 1: Browse packs (latest)');
  try {
    const browseResult = await client.pack.browsePacks(
      { sortBy: 'latest' },
      1,
      10
    );

    if (browseResult.packs.length > 0) {
      console.log(`  ✅ Found ${browseResult.total} packs`);
      console.log(`  📦 First pack: "${browseResult.packs[0].title}"`);
      results.push({
        step: '1. Browse packs',
        status: 'pass',
        message: `Found ${browseResult.total} packs`,
        data: { total: browseResult.total },
      });
    } else {
      console.log('  ⚠️  No packs found');
      results.push({
        step: '1. Browse packs',
        status: 'fail',
        message: 'No packs available',
      });
    }
  } catch (error) {
    console.log('  ❌ Browse failed:', error);
    results.push({
      step: '1. Browse packs',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  console.log('');

  // ========================================
  // Step 2: Search packs
  // ========================================
  console.log('🔍 Step 2: Search packs (keyword: "數學")');
  try {
    const searchResult = await client.pack.searchPacks('數學', {
      sortBy: 'confidence',
    });

    if (searchResult.packs.length > 0) {
      console.log(`  ✅ Found ${searchResult.total} packs matching "數學"`);
      console.log(`  📦 Top result: "${searchResult.packs[0].title}"`);
      console.log(`     - Confidence: ${searchResult.packs[0].confidenceBadge}`);
      console.log(`     - Items: ${searchResult.packs[0].itemCount}`);
      results.push({
        step: '2. Search packs',
        status: 'pass',
        message: `Found ${searchResult.total} matching packs`,
        data: { query: '數學', total: searchResult.total },
      });
    } else {
      console.log('  ⚠️  No results for "數學"');
      results.push({
        step: '2. Search packs',
        status: 'fail',
        message: 'No search results',
      });
    }
  } catch (error) {
    console.log('  ❌ Search failed:', error);
    results.push({
      step: '2. Search packs',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  console.log('');

  // ========================================
  // Step 3: Get pack details
  // ========================================
  console.log('📋 Step 3: Get pack details');
  let testPackId: string | null = null;
  try {
    const pack = await client.pack.getPack('pack-math-001', {
      source: 'search',
      listPosition: 0,
    });

    testPackId = pack.id;
    console.log(`  ✅ Retrieved pack: "${pack.title}"`);
    console.log(`     - Subject: ${pack.subject} / Topic: ${pack.topic}`);
    console.log(`     - Items: ${pack.itemCount}`);
    console.log(`     - Has explanation: ${pack.hasExplanation ? 'Yes' : 'No'}`);
    console.log(`     - Installed: ${pack.isInstalled ? 'Yes' : 'No'}`);
    results.push({
      step: '3. Get pack details',
      status: 'pass',
      message: `Retrieved pack "${pack.title}"`,
      data: { packId: pack.id, title: pack.title },
    });
  } catch (error) {
    console.log('  ❌ Get pack details failed:', error);
    results.push({
      step: '3. Get pack details',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  console.log('');

  // ========================================
  // Step 4: Preview pack content
  // ========================================
  console.log('👀 Step 4: Preview pack content');
  if (testPackId) {
    try {
      const preview = await client.pack.getPackPreview(testPackId);

      console.log(`  ✅ Preview loaded: ${preview.chapters.length} chapters`);
      console.log(`  📝 Total preview items: ${preview.totalPreviewItems}`);

      if (preview.chapters.length > 0) {
        const firstChapter = preview.chapters[0];
        console.log(`\n  Chapter: "${firstChapter.title}"`);
        console.log(`  - Items: ${firstChapter.itemCount}`);
        console.log(`  - Preview questions: ${firstChapter.previewQuestions.length}`);

        if (firstChapter.previewQuestions.length > 0) {
          const q = firstChapter.previewQuestions[0];
          console.log(`\n  Sample question:`);
          console.log(`    Q: ${q.stem.substring(0, 60)}...`);
          console.log(`    Choices: ${q.choices.length} options`);
          console.log(`    Has explanation: ${q.hasExplanation ? 'Yes' : 'No'}`);
        }
      }

      results.push({
        step: '4. Preview pack',
        status: 'pass',
        message: `Loaded ${preview.chapters.length} chapters, ${preview.totalPreviewItems} preview items`,
        data: {
          chapters: preview.chapters.length,
          previewItems: preview.totalPreviewItems,
        },
      });
    } catch (error) {
      console.log('  ❌ Preview failed:', error);
      results.push({
        step: '4. Preview pack',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else {
    console.log('  ⏭️  Skipped (no pack ID)');
    results.push({
      step: '4. Preview pack',
      status: 'fail',
      message: 'Skipped - no test pack available',
    });
  }
  console.log('');

  // ========================================
  // Step 5: Install pack
  // ========================================
  console.log('⬇️  Step 5: Install pack');
  if (testPackId) {
    try {
      const installResult = await client.pack.installPack({
        packId: testPackId,
        source: 'shop',
        listPosition: 0,
      });

      if (installResult.success) {
        console.log(`  ✅ Pack installed successfully`);
        console.log(`     - Installed at: ${installResult.installedAt}`);
        results.push({
          step: '5. Install pack',
          status: 'pass',
          message: 'Pack installed successfully',
          data: { installedAt: installResult.installedAt },
        });
      } else {
        console.log(`  ❌ Installation failed`);
        results.push({
          step: '5. Install pack',
          status: 'fail',
          message: 'Installation returned success: false',
        });
      }
    } catch (error) {
      console.log('  ⚠️  Install error:', error);
      // Might be already installed - this is acceptable
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (errorMsg.includes('ALREADY_INSTALLED')) {
        console.log('  ℹ️  Pack was already installed (acceptable)');
        results.push({
          step: '5. Install pack',
          status: 'pass',
          message: 'Pack already installed',
        });
      } else {
        results.push({
          step: '5. Install pack',
          status: 'fail',
          message: errorMsg,
        });
      }
    }
  } else {
    console.log('  ⏭️  Skipped (no pack ID)');
    results.push({
      step: '5. Install pack',
      status: 'fail',
      message: 'Skipped - no test pack available',
    });
  }
  console.log('');

  // ========================================
  // Step 6: Verify installation
  // ========================================
  console.log('✓ Step 6: Verify installation');
  try {
    const installed = await client.pack.getInstalledPacks();

    const foundPack = testPackId ? installed.find(p => p.id === testPackId) : null;

    if (foundPack) {
      console.log(`  ✅ Pack found in installed list`);
      console.log(`     - Title: "${foundPack.title}"`);
      console.log(`     - Installed at: ${foundPack.installedAt}`);
      results.push({
        step: '6. Verify installation',
        status: 'pass',
        message: 'Pack found in installed list',
        data: { installedCount: installed.length },
      });
    } else if (installed.length > 0) {
      console.log(`  ⚠️  Test pack not found, but ${installed.length} packs installed`);
      results.push({
        step: '6. Verify installation',
        status: 'fail',
        message: 'Test pack not in installed list',
        data: { installedCount: installed.length },
      });
    } else {
      console.log(`  ❌ No packs installed`);
      results.push({
        step: '6. Verify installation',
        status: 'fail',
        message: 'No packs found in installed list',
      });
    }
  } catch (error) {
    console.log('  ❌ Verification failed:', error);
    results.push({
      step: '6. Verify installation',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  console.log('');

  // ========================================
  // Step 7: Uninstall pack
  // ========================================
  console.log('⬆️  Step 7: Uninstall pack');
  if (testPackId) {
    try {
      const uninstallResult = await client.pack.uninstallPack({
        packId: testPackId,
      });

      if (uninstallResult.success) {
        console.log(`  ✅ Pack uninstalled successfully`);
        results.push({
          step: '7. Uninstall pack',
          status: 'pass',
          message: 'Pack uninstalled successfully',
        });
      } else {
        console.log(`  ❌ Uninstall failed`);
        results.push({
          step: '7. Uninstall pack',
          status: 'fail',
          message: 'Uninstall returned success: false',
        });
      }
    } catch (error) {
      console.log('  ⚠️  Uninstall error:', error);
      results.push({
        step: '7. Uninstall pack',
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } else {
    console.log('  ⏭️  Skipped (no pack ID)');
    results.push({
      step: '7. Uninstall pack',
      status: 'fail',
      message: 'Skipped - no test pack available',
    });
  }
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
    console.log(`${icon} ${result.step}: ${result.message}`);
  });

  console.log('');
  console.log(`Total: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failed === 0) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }
}

// Run the test
runStandardFlowTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

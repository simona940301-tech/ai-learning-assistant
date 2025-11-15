// PDF 文字選取診斷腳本
// 使用方法：在瀏覽器開發者工具的 Console 中複製貼上這段代碼並執行

(function() {
  console.log('=== PDF 文字選取診斷 ===\n');

  // 1. 檢查頁面容器
  const pages = document.querySelectorAll('[data-page-number]');
  console.log('📄 PDF 頁數:', pages.length);

  if (pages.length === 0) {
    console.error('❌ 找不到 PDF 頁面！請確認 PDF 已載入。');
    return;
  }

  pages.forEach((page, i) => {
    const pageNum = page.dataset.pageNumber;
    console.log(`\n📖 頁面 ${pageNum}:`);

    // 2. 檢查所有子層
    const children = Array.from(page.children);
    console.log('  層級結構:');
    children.forEach(child => {
      const styles = window.getComputedStyle(child);
      const className = child.className || child.tagName;
      console.log(`    - ${className}:`, {
        'z-index': styles.zIndex,
        'pointer-events': styles.pointerEvents,
        'user-select': styles.userSelect,
        'cursor': styles.cursor,
        'position': styles.position
      });
    });

    // 3. 檢查文字層
    const textLayer = page.querySelector('.textLayer');
    const ocrLayer = page.querySelector('.ocrTextLayer');
    const annotationLayer = page.querySelector('.absolute.inset-0');

    if (textLayer) {
      const spans = textLayer.querySelectorAll('span');
      const styles = window.getComputedStyle(textLayer);
      console.log('  ✅ 原生文字層:', {
        '文字元素數量': spans.length,
        'z-index': styles.zIndex,
        'pointer-events': styles.pointerEvents,
        'user-select': styles.userSelect,
        'cursor': styles.cursor
      });
    }

    if (ocrLayer) {
      const spans = ocrLayer.querySelectorAll('span');
      const styles = window.getComputedStyle(ocrLayer);
      console.log('  ✅ OCR 文字層:', {
        '文字元素數量': spans.length,
        'z-index': styles.zIndex,
        'pointer-events': styles.pointerEvents,
        'user-select': styles.userSelect,
        'cursor': styles.cursor
      });
    }

    if (annotationLayer) {
      const styles = window.getComputedStyle(annotationLayer);
      const isHidden = annotationLayer.children.length === 0;
      console.log('  📝 註解層:', {
        '是否隱藏': isHidden ? '是 (select 模式)' : '否',
        'z-index': styles.zIndex,
        'pointer-events': styles.pointerEvents,
        '子元素數量': annotationLayer.children.length
      });
    }

    if (!textLayer && !ocrLayer) {
      console.warn('  ⚠️  沒有文字層！');
    }
  });

  // 4. 檢查 Canvas
  console.log('\n🎨 Canvas 層:');
  const canvases = document.querySelectorAll('canvas');
  canvases.forEach((canvas, i) => {
    const styles = window.getComputedStyle(canvas);
    console.log(`  Canvas ${i + 1}:`, {
      'pointer-events': styles.pointerEvents,
      'z-index': styles.zIndex,
      '寬度': canvas.width,
      '高度': canvas.height
    });
  });

  // 5. 測試選取 API
  console.log('\n🔍 選取 API 測試:');
  const sel = window.getSelection();
  if (sel) {
    console.log('  ✅ Selection API 可用');
    const currentSelection = sel.toString();
    if (currentSelection) {
      console.log('  當前選取:', currentSelection.substring(0, 100));
    } else {
      console.log('  當前沒有選取');
    }
  } else {
    console.error('  ❌ Selection API 不可用！');
  }

  // 6. 層級問題診斷
  console.log('\n🔧 診斷結果:');

  let hasIssues = false;

  pages.forEach((page, i) => {
    const pageNum = page.dataset.pageNumber;
    const textLayer = page.querySelector('.textLayer');
    const ocrLayer = page.querySelector('.ocrTextLayer');
    const annotationLayer = page.querySelector('.absolute.inset-0');

    // 檢查是否有文字層
    if (!textLayer && !ocrLayer) {
      console.error(`  ❌ 頁面 ${pageNum}: 沒有文字層（既沒有原生文字層也沒有 OCR 文字層）`);
      hasIssues = true;
    }

    // 檢查文字層的 z-index
    if (textLayer) {
      const zIndex = parseInt(window.getComputedStyle(textLayer).zIndex);
      if (zIndex < 16) {
        console.warn(`  ⚠️  頁面 ${pageNum}: 原生文字層 z-index (${zIndex}) 應該是 16`);
        hasIssues = true;
      }
    }

    if (ocrLayer) {
      const zIndex = parseInt(window.getComputedStyle(ocrLayer).zIndex);
      if (zIndex < 16) {
        console.warn(`  ⚠️  頁面 ${pageNum}: OCR 文字層 z-index (${zIndex}) 應該是 16`);
        hasIssues = true;
      }
    }

    // 檢查註解層是否在 select 模式下隱藏
    if (annotationLayer && annotationLayer.children.length > 0) {
      const hasKonva = annotationLayer.querySelector('canvas');
      if (hasKonva) {
        console.warn(`  ⚠️  頁面 ${pageNum}: 註解層在 select 模式下應該隱藏，但仍然存在 Konva canvas`);
        hasIssues = true;
      }
    }

    // 檢查文字層的 pointer-events
    if (textLayer) {
      const pointerEvents = window.getComputedStyle(textLayer).pointerEvents;
      if (pointerEvents !== 'auto') {
        console.error(`  ❌ 頁面 ${pageNum}: 原生文字層 pointer-events 應該是 'auto'，當前是 '${pointerEvents}'`);
        hasIssues = true;
      }
    }

    if (ocrLayer) {
      const pointerEvents = window.getComputedStyle(ocrLayer).pointerEvents;
      if (pointerEvents !== 'auto') {
        console.error(`  ❌ 頁面 ${pageNum}: OCR 文字層 pointer-events 應該是 'auto'，當前是 '${pointerEvents}'`);
        hasIssues = true;
      }
    }
  });

  if (!hasIssues) {
    console.log('  ✅ 所有檢查通過！文字選取應該可以正常工作。');
    console.log('\n💡 如果仍然無法選取文字，請嘗試：');
    console.log('  1. 重新整理頁面');
    console.log('  2. 檢查是否在 select 模式（不是畫筆、螢光筆、便利貼模式）');
    console.log('  3. 確認 PDF 已完全載入（包括 OCR 處理）');
  } else {
    console.log('  ⚠️  發現一些問題，請根據上述警告進行修復。');
  }

  console.log('\n=== 診斷完成 ===');
})();

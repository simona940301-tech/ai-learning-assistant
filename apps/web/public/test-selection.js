// 測試文字選取功能
// 在瀏覽器控制台運行此腳本來測試文字選取

console.log('=== 測試文字選取 ===\n');

// 測試 1: 嘗試程式化選取文字
const textLayer = document.querySelector('.textLayer');
if (textLayer) {
  const firstSpan = textLayer.querySelector('span');
  if (firstSpan && firstSpan.textContent) {
    console.log('✅ 找到文字層和第一個 span');
    console.log('   文字內容:', firstSpan.textContent.substring(0, 50));

    // 嘗試選取
    const range = document.createRange();
    const selection = window.getSelection();

    try {
      range.selectNodeContents(firstSpan);
      selection?.removeAllRanges();
      selection?.addRange(range);

      const selectedText = selection?.toString();
      if (selectedText && selectedText.length > 0) {
        console.log('✅ 程式化選取成功！');
        console.log('   選取的文字:', selectedText.substring(0, 50));
      } else {
        console.error('❌ 程式化選取失敗 - selection.toString() 返回空字符串');
      }
    } catch (err) {
      console.error('❌ 程式化選取失敗:', err);
    }
  } else {
    console.error('❌ 文字層中沒有 span 元素');
  }
} else {
  console.error('❌ 找不到 .textLayer');
}

// 測試 2: 檢查是否有任何東西阻止文字選取
console.log('\n測試 2: 檢查阻擋因素');

const pages = document.querySelectorAll('[data-page-number]');
pages.forEach((page, i) => {
  const pageNum = page.dataset.pageNumber;

  // 檢查頁面容器本身
  const pageStyles = window.getComputedStyle(page);
  if (pageStyles.userSelect === 'none') {
    console.error(`❌ 頁面 ${pageNum}: 頁面容器的 user-select 是 'none'`);
  }
  if (pageStyles.pointerEvents === 'none') {
    console.error(`❌ 頁面 ${pageNum}: 頁面容器的 pointer-events 是 'none'`);
  }

  // 檢查所有祖先元素
  let parent = page.parentElement;
  let level = 0;
  while (parent && level < 10) {
    const parentStyles = window.getComputedStyle(parent);
    const className = parent.className || parent.tagName;

    if (parentStyles.userSelect === 'none') {
      console.warn(`⚠️  頁面 ${pageNum}: 祖先元素 '${className}' 的 user-select 是 'none'`);
    }
    if (parentStyles.pointerEvents === 'none') {
      console.warn(`⚠️  頁面 ${pageNum}: 祖先元素 '${className}' 的 pointer-events 是 'none'`);
    }

    parent = parent.parentElement;
    level++;
  }
});

// 測試 3: 監聽選取變化事件
console.log('\n測試 3: 監聽選取事件（請嘗試選取文字）');
console.log('接下來 10 秒內，請嘗試用滑鼠選取 PDF 中的文字...\n');

let selectionEventCount = 0;
let mouseupEventCount = 0;

const handleSelectionChange = () => {
  selectionEventCount++;
  const sel = window.getSelection();
  if (sel && sel.toString().length > 0) {
    console.log(`📝 selectionchange 事件 #${selectionEventCount}:`, sel.toString().substring(0, 50));
  }
};

const handleMouseUp = (e) => {
  mouseupEventCount++;
  console.log(`🖱️  mouseup 事件 #${mouseupEventCount} 在:`, e.target.className || e.target.tagName);
};

document.addEventListener('selectionchange', handleSelectionChange);
document.addEventListener('mouseup', handleMouseUp);

setTimeout(() => {
  document.removeEventListener('selectionchange', handleSelectionChange);
  document.removeEventListener('mouseup', handleMouseUp);

  console.log('\n=== 測試結果 ===');
  console.log(`selectionchange 事件觸發次數: ${selectionEventCount}`);
  console.log(`mouseup 事件觸發次數: ${mouseupEventCount}`);

  if (selectionEventCount === 0) {
    console.error('❌ 沒有 selectionchange 事件！這意味著瀏覽器沒有檢測到任何文字選取。');
    console.log('\n可能的原因：');
    console.log('1. 文字層的 CSS user-select 被覆蓋');
    console.log('2. 有 JavaScript 阻止了默認的選取行為');
    console.log('3. 有透明的覆蓋層阻擋了文字層');
  } else {
    console.log('✅ 有 selectionchange 事件，文字選取應該可以工作！');
  }
}, 10000);

console.log('⏳ 等待 10 秒...請嘗試選取文字');

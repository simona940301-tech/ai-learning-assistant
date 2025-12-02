# Safe Area Design Guidelines

## Prompt 1 – Top Header / 頂部

> **所有固定在頂部的導航欄 (`<header>` 或 `.navbar`) 必須使用 `safe-area-inset-top` 來計算其頂部內邊距（`padding-top`）。確保內容永遠不會被手機的瀏海或狀態列遮擋。**

```css
.header {
  position: fixed;
  top: 0;
  /* 這是關鍵：使用安全區域內邊距作為額外的 padding */
  padding-top: max(12px, env(safe-area-inset-top));
  /* 確保最小高度和安全區域都被考慮 */
}
```

---

## Prompt 2 – Bottom Footer / 底部

> **所有固定在底部的操作區或 Tab Bar (`<footer>` 或 `.tab-bar`) 必須使用 `safe-area-inset-bottom` 來計算其底部內邊距或高度。確保底部按鈕永遠不會被 iOS 的 Home Indicator 手勢條遮擋。**

```css
.tab-bar {
  position: fixed;
  bottom: 0;
  width: 100%;
  /* 這是關鍵：使用安全區域內邊距作為額外的 padding */
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## Prompt 3 – Main Content / 主要內容

> **主要可滾動內容（Main Content）的上邊緣和下邊緣，必須確保即使沒有固定的 Header/Footer，內容本身也不會滾動到安全區域之下。在無固定元件的頁面上，使用 Safe Area 變數作為 Margin。**

```css
.main-content {
  /* 若頁面沒有固定的 header/footer，使用 safe area 作為 margin */
  margin-top: env(safe-area-inset-top);
  margin-bottom: env(safe-area-inset-bottom);
  overflow-y: auto;
}
```

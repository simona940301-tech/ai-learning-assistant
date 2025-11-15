# Phase 2: PDF 解析實現 - 超越 GoodNotes

## 🎯 目標

實現比 GoodNotes 更精確的 PDF 文字選取系統，達到**像素級精度**。

## 📊 GoodNotes vs 我們的系統

| 特性 | GoodNotes | 我們的系統 | 優勢 |
|------|-----------|-----------|------|
| 座標精度 | 像素級 | PDF 點級 | ✅ 更精確（1 點 = 1/72 英寸） |
| 座標來源 | 渲染後計算 | PDF 內部座標 | ✅ 無誤差累積 |
| 字元級選取 | ✅ | ✅ | ✅ 相同 |
| 表格選取 | ✅ | ✅ | ✅ 相同 |
| 旋轉文字 | ⚠️ 部分支持 | ✅ 完整支持 | ✅ 更強 |
| 多編碼支持 | ⚠️ 有限 | ✅ 完整 | ✅ 更強 |

## 🔧 實施計劃

### 1. PDF Content Stream 解析

**目標**：解析 PDF 內容流，提取所有文字渲染操作

**技術要點**：
- 使用 `lopdf` 解析 Content Stream
- 識別文字操作符：`Tj`, `TJ`, `'`, `"`, `BT`, `ET`
- 識別座標變換：`Tm`, `cm`, `q`, `Q`, `Td`, `TD`, `T*`

**實現位置**：`src/parser.rs::extract_text_with_coordinates()`

### 2. 文字狀態追蹤

**目標**：精確追蹤每個字元的渲染狀態

**需要追蹤的狀態**：
- **字體**：字體名稱、字體大小
- **文字矩陣**：6 個參數的變換矩陣
- **當前位置**：X, Y 座標
- **字元間距**：字元間距、單詞間距
- **文字渲染模式**：填充、描邊、填充+描邊

**實現位置**：創建 `TextState` 結構體

### 3. 字元座標計算

**目標**：計算每個字元的精確 Bounding Box

**計算步驟**：
1. 從文字矩陣提取當前位置
2. 獲取字元寬度（從字體或字元串）
3. 計算字元高度（從字體大小）
4. 應用變換矩陣（處理旋轉、縮放）
5. 更新當前位置（為下一個字元準備）

**公式**：
```
字元 X = 當前 X + 字元寬度
字元 Y = 當前 Y（基線）
字元寬度 = 字體寬度 * 字體大小 * 縮放因子
字元高度 = 字體大小 * 縮放因子
```

### 4. 編碼處理

**目標**：支持所有 PDF 編碼格式

**支持的編碼**：
- **PDFDocEncoding**：PDF 標準編碼
- **UTF-16BE**：Unicode 編碼
- **字體編碼**：字體特定的編碼映射（如 WinAnsiEncoding, MacRomanEncoding）

**實現位置**：`parse_text_string()` 函數

### 5. 高級特性

**目標**：實現 GoodNotes 不支持的特性

**特性列表**：
- ✅ 垂直文字支持
- ✅ 旋轉文字支持（任意角度）
- ✅ 複合字體支持
- ✅ CID 字體支持（CJK 文字）

## 📝 實施步驟

### Step 1: 創建文字狀態追蹤結構

```rust
struct TextState {
    font_name: String,
    font_size: f32,
    text_matrix: [f32; 6],  // 文字矩陣
    char_spacing: f32,       // 字元間距
    word_spacing: f32,       // 單詞間距
    horizontal_scale: f32,   // 水平縮放
    leading: f32,            // 行距
}
```

### Step 2: 實現 Content Stream 解析

```rust
fn parse_content_stream(
    doc: &Document,
    page_id: ObjectId,
) -> Result<Vec<PdfChar>, ParseError> {
    // 1. 獲取 Content Stream
    // 2. 解析操作符
    // 3. 追蹤狀態
    // 4. 提取字元
}
```

### Step 3: 實現操作符處理

```rust
fn handle_operator(
    op: &str,
    operands: &[Object],
    state: &mut TextState,
    chars: &mut Vec<PdfChar>,
) -> Result<(), ParseError> {
    match op {
        "BT" => { /* Begin Text */ }
        "ET" => { /* End Text */ }
        "Tf" => { /* Set Font */ }
        "Tm" => { /* Set Text Matrix */ }
        "Tj" => { /* Show Text */ }
        "TJ" => { /* Show Text with Spacing */ }
        // ... 更多操作符
    }
}
```

### Step 4: 實現字元座標計算

```rust
fn calculate_char_position(
    char: char,
    state: &TextState,
) -> (f32, f32, f32, f32) {
    // 計算字元的精確座標和尺寸
}
```

## 🧪 測試計劃

### 單元測試

1. **文字狀態追蹤測試**
   - 測試字體設置
   - 測試座標變換
   - 測試間距設置

2. **座標計算測試**
   - 測試水平文字
   - 測試垂直文字
   - 測試旋轉文字

3. **編碼處理測試**
   - 測試 PDFDocEncoding
   - 測試 UTF-16BE
   - 測試字體編碼

### 集成測試

1. **真實 PDF 測試**
   - 簡單文字 PDF
   - 表格 PDF
   - 旋轉文字 PDF
   - CJK 文字 PDF

2. **精度驗證**
   - 與 GoodNotes 對比
   - 座標誤差測量
   - 選取準確度測試

## 📈 性能目標

- **解析速度**：單頁 < 100ms
- **記憶體使用**：單頁 < 10MB
- **選取響應**：< 10ms

## 🎯 成功標準

- ✅ 能夠解析 95% 以上的 PDF 文件
- ✅ 座標精度誤差 < 0.1 PDF 點
- ✅ 支持所有常見編碼格式
- ✅ 選取準確度 > 99%

## 📚 參考資源

- PDF 規範 ISO 32000-1:2008
- lopdf 文檔
- GoodNotes 技術分析（逆向工程）






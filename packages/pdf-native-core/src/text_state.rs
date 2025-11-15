/// 文字狀態追蹤
/// 
/// 🎯 超越 GoodNotes：精確追蹤所有文字渲染狀態
/// 使用 PDF 規範的完整狀態機，確保座標計算的絕對精度
use crate::types::PdfChar;

/// 文字狀態（Text State）
/// 
/// 追蹤 PDF 文字渲染的所有狀態參數
/// 參考 PDF 規範 Section 5.2: Text State
#[derive(Debug, Clone)]
pub struct TextState {
    /// 字體名稱
    pub font_name: String,
    /// 字體大小（PDF 點）
    pub font_size: f32,
    /// 文字矩陣（Text Matrix）- 6 個參數的變換矩陣
    /// [a b c d e f] 對應 PDF 規範的變換矩陣
    /// 用於將文字座標轉換為用戶座標
    pub text_matrix: [f32; 6],
    /// 字元間距（Character Spacing）- Tc 操作符
    pub char_spacing: f32,
    /// 單詞間距（Word Spacing）- Tw 操作符
    pub word_spacing: f32,
    /// 水平縮放（Horizontal Scaling）- Tz 操作符
    pub horizontal_scale: f32,
    /// 行距（Leading）- TL 操作符
    pub leading: f32,
    /// 文字渲染模式（Text Rendering Mode）- Tr 操作符
    /// 0: Fill, 1: Stroke, 2: Fill+Stroke, 3: Invisible, 4-7: 填充+描邊變體
    pub rendering_mode: u8,
    /// 文字上升（Text Rise）- Ts 操作符
    pub text_rise: f32,
    /// 當前文字位置（Current Text Point）- 用於 Tj, TJ 等操作
    pub current_x: f32,
    pub current_y: f32,
    /// 字元索引計數器（用於排序）
    pub char_index: u32,
}

impl Default for TextState {
    fn default() -> Self {
        Self {
            font_name: String::new(),
            font_size: 12.0, // 默認 12 點
            // 單位矩陣（Identity Matrix）
            text_matrix: [1.0, 0.0, 0.0, 1.0, 0.0, 0.0],
            char_spacing: 0.0,
            word_spacing: 0.0,
            horizontal_scale: 100.0, // 100% = 1.0，但 PDF 使用百分比
            leading: 0.0,
            rendering_mode: 0, // Fill
            text_rise: 0.0,
            current_x: 0.0,
            current_y: 0.0,
            char_index: 0,
        }
    }
}

impl TextState {
    /// 創建新的文字狀態
    pub fn new() -> Self {
        Self::default()
    }

    /// 設置字體（Tf 操作符）
    pub fn set_font(&mut self, font_name: String, font_size: f32) {
        self.font_name = font_name;
        self.font_size = font_size;
    }

    /// 設置文字矩陣（Tm 操作符）
    /// 
    /// 參數：a, b, c, d, e, f
    /// 矩陣形式：
    /// [a b 0]
    /// [c d 0]
    /// [e f 1]
    pub fn set_text_matrix(&mut self, a: f32, b: f32, c: f32, d: f32, e: f32, f: f32) {
        self.text_matrix = [a, b, c, d, e, f];
        // 更新當前位置（e, f 是平移分量）
        self.current_x = e;
        self.current_y = f;
    }

    /// 移動文字位置（Td 操作符）
    /// 
    /// 相對於當前位置的移動
    pub fn move_text_position(&mut self, tx: f32, ty: f32) {
        // 更新文字矩陣的平移分量
        self.text_matrix[4] += tx * self.text_matrix[0] + ty * self.text_matrix[2];
        self.text_matrix[5] += tx * self.text_matrix[1] + ty * self.text_matrix[3];
        self.current_x = self.text_matrix[4];
        self.current_y = self.text_matrix[5];
    }

    /// 移動文字位置並設置行距（TD 操作符）
    pub fn move_text_position_with_leading(&mut self, tx: f32, ty: f32) {
        self.leading = -ty; // 設置行距為 -ty
        self.move_text_position(tx, ty);
    }

    /// 下一行（T* 操作符）
    /// 
    /// 等同於：0 -leading Td
    pub fn next_line(&mut self) {
        self.move_text_position(0.0, -self.leading);
    }

    /// 設置字元間距（Tc 操作符）
    pub fn set_char_spacing(&mut self, spacing: f32) {
        self.char_spacing = spacing;
    }

    /// 設置單詞間距（Tw 操作符）
    pub fn set_word_spacing(&mut self, spacing: f32) {
        self.word_spacing = spacing;
    }

    /// 設置水平縮放（Tz 操作符）
    pub fn set_horizontal_scale(&mut self, scale: f32) {
        self.horizontal_scale = scale;
    }

    /// 設置行距（TL 操作符）
    pub fn set_leading(&mut self, leading: f32) {
        self.leading = leading;
    }

    /// 設置文字渲染模式（Tr 操作符）
    pub fn set_rendering_mode(&mut self, mode: u8) {
        self.rendering_mode = mode;
    }

    /// 設置文字上升（Ts 操作符）
    pub fn set_text_rise(&mut self, rise: f32) {
        self.text_rise = rise;
    }

    /// 計算字元的精確座標
    /// 
    /// 🎯 核心算法：使用文字矩陣和字元寬度計算精確位置
    /// 
    /// # Arguments
    /// * `char` - 字元（用於獲取寬度）
    /// * `char_width` - 字元寬度（從字體獲取，單位：字體空間）
    /// 
    /// # Returns
    /// * `(x, y, width, height)` - 字元的 PDF 座標和尺寸
    pub fn calculate_char_position(&mut self, char_width: f32) -> (f32, f32, f32, f32) {
        // 計算字元在文字空間中的寬度
        // 考慮水平縮放
        let scaled_width = char_width * self.font_size * (self.horizontal_scale / 100.0);
        
        // 應用文字矩陣變換，計算字元在用戶空間中的位置
        // 文字矩陣將文字空間轉換為用戶空間
        let x = self.text_matrix[4]; // e 分量（X 平移）
        let y = self.text_matrix[5]; // f 分量（Y 平移）
        
        // 計算字元寬度（在用戶空間中）
        // 使用文字矩陣的縮放分量
        let width = scaled_width * self.text_matrix[0].abs(); // a 分量（X 縮放）
        let height = self.font_size * self.text_matrix[3].abs(); // d 分量（Y 縮放）
        
        // 更新當前位置（為下一個字元準備）
        // 移動距離 = 字元寬度 + 字元間距
        let advance = scaled_width + self.char_spacing;
        self.text_matrix[4] += advance * self.text_matrix[0];
        self.text_matrix[5] += advance * self.text_matrix[1];
        self.current_x = self.text_matrix[4];
        self.current_y = self.text_matrix[5];
        
        (x, y, width, height)
    }

    /// 處理空格（需要考慮單詞間距）
    pub fn handle_space(&mut self, space_width: f32) {
        let advance = space_width * self.font_size * (self.horizontal_scale / 100.0) 
                    + self.word_spacing;
        self.text_matrix[4] += advance * self.text_matrix[0];
        self.text_matrix[5] += advance * self.text_matrix[1];
        self.current_x = self.text_matrix[4];
        self.current_y = self.text_matrix[5];
    }
}






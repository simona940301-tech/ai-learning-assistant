use serde::{Deserialize, Serialize};

/// PDF 字元（Glyph）數據結構
/// 包含字元的精確 PDF 座標和內容
/// 
/// 🎯 GoodNotes 級別精度：每個字元都有精確的 Bounding Box
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PdfChar {
    /// PDF 座標系 X（左下角為原點）
    pub x: f32,
    /// PDF 座標系 Y（左下角為原點）
    pub y: f32,
    /// 字元寬度（PDF 點）
    pub width: f32,
    /// 字元高度（PDF 點）
    pub height: f32,
    /// 字元內容（UTF-8）
    pub content: String,
    /// 字體大小（PDF 點）
    pub font_size: f32,
    /// 頁碼（從 1 開始）
    pub page_number: u32,
    /// 字元索引（在文字流中的位置，用於排序）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub char_index: Option<u32>,
}

/// 選取範圍框（用戶拖曳的矩形）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionBox {
    /// 起始 X 座標（PDF 座標系）
    pub x1: f32,
    /// 起始 Y 座標（PDF 座標系）
    pub y1: f32,
    /// 結束 X 座標（PDF 座標系）
    pub x2: f32,
    /// 結束 Y 座標（PDF 座標系）
    pub y2: f32,
    /// 頁碼（從 1 開始）
    pub page_number: u32,
}

/// 選取結果（精確的 Bounding Box 列表）
/// 
/// 🎯 超越 GoodNotes：不僅提供文字，還提供像素級精確的 Bounding Box
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionResult {
    /// 選取的文字內容
    pub text: String,
    /// 精確的 Bounding Box 列表（用於高亮渲染）
    /// 每個 Box 對應一個連續的文字段
    pub bounding_boxes: Vec<BoundingBox>,
    /// 頁碼
    pub page_number: u32,
    /// 選取的字元列表（用於高級功能，如字元級編輯）
    pub chars: Vec<PdfChar>,
}

/// Bounding Box（用於高亮渲染）
/// 
/// 🎯 像素級精度：每個座標都是精確的 PDF 點，無誤差累積
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox {
    /// X 座標（PDF 座標系）
    pub x: f32,
    /// Y 座標（PDF 座標系）
    pub y: f32,
    /// 寬度（PDF 點）
    pub width: f32,
    /// 高度（PDF 點）
    pub height: f32,
}

/// PDF 頁面數據（快取結構）
#[derive(Debug, Clone)]
pub struct PageData {
    /// 頁碼
    pub page_number: u32,
    /// 該頁的所有字元（按閱讀順序排序）
    pub chars: Vec<PdfChar>,
    /// 頁面寬度（PDF 點）
    pub width: f32,
    /// 頁面高度（PDF 點）
    pub height: f32,
}


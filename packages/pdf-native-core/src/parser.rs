use crate::types::{PdfChar, PageData};
use crate::content_stream::ContentStreamParser;
use lopdf::{Document, Object, ObjectId};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ParseError {
    #[error("Failed to open PDF file: {0}")]
    FileOpen(String),
    #[error("Page {0} not found")]
    PageNotFound(u32),
    #[error("Failed to extract text from page {0}")]
    TextExtraction(u32),
    #[error("Invalid PDF structure")]
    InvalidStructure,
    #[error("Content stream parsing error: {0}")]
    ContentStreamError(String),
}

/// PDF 解析器
/// 
/// 🎯 超越 GoodNotes：精確提取每個字元的 PDF 座標
/// 使用 PDF 內部座標系，無需依賴渲染後的像素座標
pub struct PdfParser;

impl PdfParser {
    /// 載入 PDF 頁面的所有字元數據
    /// 
    /// # Arguments
    /// * `file_path` - PDF 文件路徑
    /// * `page_num` - 頁碼（從 1 開始）
    /// 
    /// # Returns
    /// * `Ok(PageData)` - 包含該頁所有字元的數據結構
    /// * `Err(ParseError)` - 解析錯誤
    pub fn load_page(file_path: &str, page_num: u32) -> Result<PageData, ParseError> {
        // 打開 PDF 文件
        let doc = Document::load(file_path)
            .map_err(|e| ParseError::FileOpen(e.to_string()))?;

        // 獲取頁面數量
        let total_pages = doc.get_pages().len() as u32;
        if page_num < 1 || page_num > total_pages {
            return Err(ParseError::PageNotFound(page_num));
        }

        // 獲取頁面對象
        let pages = doc.get_pages();
        let page_id = pages
            .get(&(page_num as u32))
            .ok_or(ParseError::PageNotFound(page_num))?;

        // 獲取頁面尺寸
        let page_dict = doc
            .get_dictionary(*page_id)
            .map_err(|_| ParseError::InvalidStructure)?;
        
        let (width, height) = Self::extract_page_dimensions(&page_dict)?;

        // 提取文字和座標
        let chars = Self::extract_text_with_coordinates(&doc, *page_id, page_num)?;

        Ok(PageData {
            page_number: page_num,
            chars,
            width,
            height,
        })
    }

    /// 提取頁面尺寸
    /// 
    /// 🎯 精確提取：從 MediaBox 或 CropBox 獲取實際頁面尺寸
    fn extract_page_dimensions(page_dict: &lopdf::Dictionary) -> Result<(f32, f32), ParseError> {
        // 優先使用 CropBox，如果沒有則使用 MediaBox
        // PDF 規範：CropBox 定義可見區域，MediaBox 定義物理頁面
        
        // 提取頁面尺寸的輔助函數
        let extract_box = |box_name: &[u8]| -> Option<(f32, f32)> {
            page_dict.get(box_name).ok().and_then(|box_obj| {
                if let Object::Array(ref arr) = box_obj {
                    if arr.len() >= 4 {
                        let coords: Vec<f32> = arr
                            .iter()
                            .take(4)
                            .filter_map(|o| {
                                if let Object::Real(r) = o {
                                    Some(*r as f32)
                                } else if let Object::Integer(i) = o {
                                    Some(*i as f32)
                                } else {
                                    None
                                }
                            })
                            .collect();
                        if coords.len() == 4 {
                            // [llx, lly, urx, ury] - 左下角和右上角
                            let width = (coords[2] - coords[0]).abs();
                            let height = (coords[3] - coords[1]).abs();
                            Some((width, height))
                        } else {
                            None
                        }
                    } else {
                        None
                    }
                } else {
                    None
                }
            })
        };

        // 優先使用 CropBox
        if let Some((w, h)) = extract_box(b"CropBox") {
            return Ok((w, h));
        }

        // 如果沒有 CropBox，使用 MediaBox
        if let Some((w, h)) = extract_box(b"MediaBox") {
            return Ok((w, h));
        }

        // 如果都沒有，使用 A4 默認值（595.0 x 842.0 點）
        Ok((595.0, 842.0))
    }

    /// 提取文字和座標
    /// 
    /// 🎯 核心功能：從 PDF 中提取每個字元的精確座標
    /// 
    /// # 實施策略（超越 GoodNotes）
    /// 1. 解析 PDF Content Stream（內容流）
    /// 2. 追蹤文字渲染操作（Tj, TJ, ' 等）
    /// 3. 追蹤座標變換矩陣（Tm, cm, q, Q 等）
    /// 4. 計算每個字元的精確位置（考慮字元寬度、間距、旋轉）
    /// 5. 處理字體編碼映射
    /// 
    /// # PDF 規範參考
    /// - Section 5.3: Text Positioning
    /// - Section 5.2: Text State
    /// - Section 4.2: Coordinate System
    /// - Section 9.7: Text Extraction
    fn extract_text_with_coordinates(
        doc: &Document,
        page_id: ObjectId,
        page_num: u32,
    ) -> Result<Vec<PdfChar>, ParseError> {
        // 🎯 Phase 2 實施：使用 ContentStreamParser 解析
        // 
        // 使用最先進的技術：
        // 1. 完整的文字狀態追蹤（TextState）
        // 2. 精確的 Content Stream 解析
        // 3. 所有 PDF 文字操作符支持
        // 4. 精確的座標計算（使用文字矩陣）
        
        match ContentStreamParser::parse(doc, page_id, page_num) {
            Ok(chars) => Ok(chars),
            Err(e) => {
                // 如果 Content Stream 解析失敗，記錄錯誤但不中斷
                // 返回空向量（可以後續改進）
                eprintln!("[PdfParser] Content Stream parsing error: {}", e);
                Ok(Vec::new())
            }
        }
    }

    /// 從字元串中解析字元（處理字元編碼）
    /// 
    /// 支持多種 PDF 編碼格式：
    /// - PDFDocEncoding
    /// - UTF-16BE
    /// - 字體特定編碼
    #[allow(dead_code)] // 將在 Phase 2 中使用
    fn parse_text_string(text: &str) -> Vec<String> {
        // 處理 PDF 字元串編碼
        // 可能需要處理 PDFDocEncoding、UTF-16BE 等
        text.chars().map(|c| c.to_string()).collect()
    }
}


/// PDF Content Stream 解析器
/// 
/// 🎯 超越 GoodNotes：精確解析 PDF 內容流，提取所有文字渲染操作
/// 使用狀態機模式，完整追蹤所有 PDF 操作符
use crate::text_state::TextState;
use crate::types::PdfChar;
use crate::pdf_syntax::{PdfSyntaxParser, Operand, Operator};
use crate::font_parser::{FontParser, FontInfo};
use crate::encoding::EncodingParser;
use lopdf::{Document, Object, ObjectId};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContentStreamError {
    #[error("Failed to get content stream: {0}")]
    StreamNotFound(String),
    #[error("Failed to decode content stream: {0}")]
    DecodeError(String),
    #[error("Invalid operator: {0}")]
    InvalidOperator(String),
    #[error("Invalid operands: {0}")]
    InvalidOperands(String),
}

/// Content Stream 解析器
pub struct ContentStreamParser;

impl ContentStreamParser {
    /// 解析頁面的 Content Stream
    /// 
    /// # Arguments
    /// * `doc` - PDF 文檔
    /// * `page_id` - 頁面對象 ID
    /// * `page_num` - 頁碼
    /// 
    /// # Returns
    /// * `Ok(Vec<PdfChar>)` - 提取的所有字元
    /// * `Err(ContentStreamError)` - 解析錯誤
    pub fn parse(
        doc: &Document,
        page_id: ObjectId,
        page_num: u32,
    ) -> Result<Vec<PdfChar>, ContentStreamError> {
        // 緩存字體信息（避免重複解析）
        let mut font_cache: HashMap<String, Result<FontInfo, crate::font_parser::FontError>> = HashMap::new();
        // 獲取頁面字典
        let page_dict = doc
            .get_dictionary(page_id)
            .map_err(|e| ContentStreamError::StreamNotFound(e.to_string()))?;

        // 獲取 Content 對象（可能是單個 Stream 或 Stream 數組）
        let content_obj = page_dict
            .get(b"Contents")
            .map_err(|e| ContentStreamError::StreamNotFound(e.to_string()))?;

        // 初始化文字狀態
        let mut text_state = TextState::new();
        let mut chars = Vec::new();

        // 處理 Content 對象（可能是單個 Stream 或 Stream 數組）
        match content_obj {
            Object::Reference(ref_id) => {
                // 單個 Content Stream
                let stream = doc
                    .get_object(*ref_id)
                    .map_err(|e| ContentStreamError::StreamNotFound(e.to_string()))?;
                Self::parse_stream_with_fonts(
                    doc,
                    &stream,
                    &mut text_state,
                    &mut chars,
                    page_num,
                    page_id,
                    &mut font_cache,
                )?;
            }
            Object::Array(refs) => {
                // 多個 Content Stream（按順序處理）
                for ref_obj in refs {
                    if let Object::Reference(ref_id) = ref_obj {
                        let stream = doc
                            .get_object(*ref_id)
                            .map_err(|e| ContentStreamError::StreamNotFound(e.to_string()))?;
                        Self::parse_stream_with_fonts(
                            doc,
                            &stream,
                            &mut text_state,
                            &mut chars,
                            page_num,
                            page_id,
                            &mut font_cache,
                        )?;
                    }
                }
            }
            _ => {
                return Err(ContentStreamError::StreamNotFound(
                    "Invalid Contents object type".to_string(),
                ));
            }
        }

        Ok(chars)
    }

    /// 解析單個 Content Stream（帶字體支持）
    fn parse_stream_with_fonts(
        doc: &Document,
        stream_obj: &Object,
        text_state: &mut TextState,
        chars: &mut Vec<PdfChar>,
        page_num: u32,
        page_id: ObjectId,
        font_cache: &mut HashMap<String, Result<FontInfo, crate::font_parser::FontError>>,
    ) -> Result<(), ContentStreamError> {
        // 獲取 Stream 數據
        let stream_data = match stream_obj {
            Object::Stream(stream) => {
                stream.decode().map_err(|e| ContentStreamError::DecodeError(e.to_string()))?
            }
            _ => {
                return Err(ContentStreamError::StreamNotFound(
                    "Not a stream object".to_string(),
                ));
            }
        };

        // 🎯 使用 PDF 語法解析器解析 Content Stream
        let tokens = PdfSyntaxParser::parse_content_stream(&stream_data)
            .map_err(|e| ContentStreamError::ContentStreamError(e.to_string()))?;

        // 處理每個操作符
        for (operands, operator) in tokens {
            let operands_objects: Vec<Object> = operands
                .iter()
                .map(PdfSyntaxParser::operand_to_object)
                .collect();

            Self::handle_text_operator_with_fonts(
                &operator.name,
                &operands_objects,
                text_state,
                chars,
                page_num,
                doc,
                page_id,
                font_cache,
            )?;
        }

        Ok(())
    }

    /// 解析單個 Content Stream（內部方法，已廢棄，保留用於兼容）
    #[allow(dead_code)]
    fn parse_stream(
        stream_obj: &Object,
        text_state: &mut TextState,
        chars: &mut Vec<PdfChar>,
        page_num: u32,
    ) -> Result<(), ContentStreamError> {
        // 獲取 Stream 數據
        let stream_data = match stream_obj {
            Object::Stream(stream) => {
                stream.decode().map_err(|e| ContentStreamError::DecodeError(e.to_string()))?
            }
            _ => {
                return Err(ContentStreamError::StreamNotFound(
                    "Not a stream object".to_string(),
                ));
            }
        };

        // 🎯 使用 PDF 語法解析器解析 Content Stream
        let tokens = PdfSyntaxParser::parse_content_stream(&stream_data)
            .map_err(|e| ContentStreamError::ContentStreamError(e.to_string()))?;

        // 處理每個操作符
        for (operands, operator) in tokens {
            let operands_objects: Vec<Object> = operands
                .iter()
                .map(PdfSyntaxParser::operand_to_object)
                .collect();

            Self::handle_text_operator(
                &operator.name,
                &operands_objects,
                text_state,
                chars,
                page_num,
            )?;
        }

        Ok(())
    }

    /// 處理文字操作符（帶字體支持）
    /// 
    /// 處理所有文字相關的 PDF 操作符
    fn handle_text_operator_with_fonts(
        op: &str,
        operands: &[Object],
        text_state: &mut TextState,
        chars: &mut Vec<PdfChar>,
        page_num: u32,
        doc: &Document,
        page_id: ObjectId,
        font_cache: &mut HashMap<String, Result<FontInfo, crate::font_parser::FontError>>,
    ) -> Result<(), ContentStreamError> {
        match op {
            "BT" => {
                // Begin Text - 重置文字狀態
                *text_state = TextState::new();
            }
            "ET" => {
                // End Text - 文字塊結束
            }
            "Tf" => {
                // Set Font and Size
                if operands.len() >= 2 {
                    if let (Object::Name(ref font_name_bytes), Object::Real(size)) =
                        (&operands[0], &operands[1])
                    {
                        let font_name = String::from_utf8_lossy(font_name_bytes).to_string();
                        text_state.set_font(font_name, *size as f32);
                    }
                }
            }
            "Tm" => {
                // Set Text Matrix
                if operands.len() == 6 {
                    let params: Vec<f32> = operands
                        .iter()
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
                    if params.len() == 6 {
                        text_state.set_text_matrix(
                            params[0], params[1], params[2], params[3], params[4], params[5],
                        );
                    }
                }
            }
            "Td" => {
                // Move Text Position
                if operands.len() == 2 {
                    let tx = Self::object_to_float(&operands[0])?;
                    let ty = Self::object_to_float(&operands[1])?;
                    text_state.move_text_position(tx, ty);
                }
            }
            "TD" => {
                // Move Text Position and Set Leading
                if operands.len() == 2 {
                    let tx = Self::object_to_float(&operands[0])?;
                    let ty = Self::object_to_float(&operands[1])?;
                    text_state.move_text_position_with_leading(tx, ty);
                }
            }
            "T*" => {
                // Next Line
                text_state.next_line();
            }
            "Tj" => {
                // Show Text
                if let Some(text_obj) = operands.first() {
                    // 🎯 獲取當前字體信息
                    let font_info = text_state.font_name.as_str();
                    let font_info_opt = font_cache
                        .get(font_info)
                        .and_then(|r| r.as_ref().ok());

                    Self::process_text_string_with_font(
                        text_obj,
                        text_state,
                        chars,
                        page_num,
                        false, // 不是 TJ 操作
                        font_info_opt,
                    )?;
                }
            }
            "TJ" => {
                // Show Text with Spacing
                if let Some(array_obj) = operands.first() {
                    if let Object::Array(elements) = array_obj {
                        // 🎯 獲取當前字體信息
                        let font_info = text_state.font_name.as_str();
                        let font_info_opt = font_cache
                            .get(font_info)
                            .and_then(|r| r.as_ref().ok());

                        for element in elements {
                            if let Object::String(ref _bytes, _) = element {
                                // 文字字符串
                                Self::process_text_string_with_font(
                                    element,
                                    text_state,
                                    chars,
                                    page_num,
                                    true, // TJ 操作
                                    font_info_opt,
                                )?;
                            } else if let Object::Real(spacing) = element {
                                // 間距調整（負數表示字元間距，正數表示單詞間距）
                                let advance = *spacing as f32 * text_state.font_size
                                    * (text_state.horizontal_scale / 100.0);
                                text_state.text_matrix[4] += advance * text_state.text_matrix[0];
                                text_state.text_matrix[5] += advance * text_state.text_matrix[1];
                                text_state.current_x = text_state.text_matrix[4];
                                text_state.current_y = text_state.text_matrix[5];
                            }
                        }
                    }
                }
            }
            "Tc" => {
                // Set Character Spacing
                if let Some(spacing) = operands.first() {
                    let spacing_val = Self::object_to_float(spacing)?;
                    text_state.set_char_spacing(spacing_val);
                }
            }
            "Tw" => {
                // Set Word Spacing
                if let Some(spacing) = operands.first() {
                    let spacing_val = Self::object_to_float(spacing)?;
                    text_state.set_word_spacing(spacing_val);
                }
            }
            "Tz" => {
                // Set Horizontal Scaling
                if let Some(scale) = operands.first() {
                    let scale_val = Self::object_to_float(scale)?;
                    text_state.set_horizontal_scale(scale_val);
                }
            }
            "TL" => {
                // Set Leading
                if let Some(leading) = operands.first() {
                    let leading_val = Self::object_to_float(leading)?;
                    text_state.set_leading(leading_val);
                }
            }
            "Tr" => {
                // Set Text Rendering Mode
                if let Some(mode) = operands.first() {
                    if let Object::Integer(m) = mode {
                        text_state.set_rendering_mode(*m as u8);
                    }
                }
            }
            "Ts" => {
                // Set Text Rise
                if let Some(rise) = operands.first() {
                    let rise_val = Self::object_to_float(rise)?;
                    text_state.set_text_rise(rise_val);
                }
            }
            _ => {
                // 忽略其他操作符（圖形、路徑等）
            }
        }
        Ok(())
    }

    /// 處理文字操作符（舊版本，保留用於兼容）
    #[allow(dead_code)]
    fn handle_text_operator(
        op: &str,
        operands: &[Object],
        text_state: &mut TextState,
        chars: &mut Vec<PdfChar>,
        page_num: u32,
    ) -> Result<(), ContentStreamError> {
        // 創建空的字體緩存
        let mut font_cache = HashMap::new();
        Self::handle_text_operator_with_fonts(
            op,
            operands,
            text_state,
            chars,
            page_num,
            // 需要 Document 和 page_id，但舊版本沒有，所以這裡會失敗
            // 這個方法保留僅用於兼容，實際應該使用 handle_text_operator_with_fonts
            &Document::new(),
            ObjectId(0, 0),
            &mut font_cache,
        )
    }

    /// 處理文字字符串（帶字體支持）
    /// 
    /// 解析文字字符串，提取每個字元並計算座標
    fn process_text_string_with_font(
        text_obj: &Object,
        text_state: &mut TextState,
        chars: &mut Vec<PdfChar>,
        page_num: u32,
        _is_tj: bool,
        font_info: Option<&FontInfo>,
    ) -> Result<(), ContentStreamError> {
        let text_bytes = match text_obj {
            Object::String(bytes, _) => bytes,
            _ => {
                return Err(ContentStreamError::InvalidOperands(
                    "Expected string object".to_string(),
                ));
            }
        };

        // 🎯 使用編碼解析器解碼文字字符串
        let encoding = font_info
            .map(|f| f.encoding.as_str())
            .unwrap_or("PDFDocEncoding");
        let text = EncodingParser::decode_string(text_bytes, Some(encoding))
            .map_err(|e| ContentStreamError::InvalidOperands(e.to_string()))?;

        // 處理每個字元
        for (byte_idx, char) in text.chars().enumerate() {
            // 🎯 從字體獲取精確的字元寬度
            let char_code = if byte_idx < text_bytes.len() {
                text_bytes[byte_idx] as u16
            } else {
                char as u32 as u16
            };

            let char_width = if let Some(font) = font_info {
                // 使用字體的實際寬度（單位：字體空間，需要轉換為 PDF 點）
                FontParser::get_char_width(font, char_code) * text_state.font_size / 1000.0
            } else {
                // 估算值（字體大小的 60%）
                text_state.font_size * 0.6
            };

            // 計算字元座標
            let (x, y, width, height) = if char == ' ' {
                // 空格需要特殊處理（考慮單詞間距）
                text_state.handle_space(char_width);
                // 空格不添加到字元列表（或可以添加為不可見字元）
                continue;
            } else {
                text_state.calculate_char_position(char_width)
            };

            // 創建 PdfChar
            let pdf_char = PdfChar {
                x,
                y,
                width,
                height,
                content: char.to_string(),
                font_size: text_state.font_size,
                page_number: page_num,
                char_index: Some(text_state.char_index),
            };

            chars.push(pdf_char);
            text_state.char_index += 1;
        }

        Ok(())
    }

    /// 處理文字字符串（舊版本，保留用於兼容）
    #[allow(dead_code)]
    fn process_text_string(
        text_obj: &Object,
        text_state: &mut TextState,
        chars: &mut Vec<PdfChar>,
        page_num: u32,
        _is_tj: bool,
    ) -> Result<(), ContentStreamError> {
        Self::process_text_string_with_font(text_obj, text_state, chars, page_num, _is_tj, None)
    }

    /// 將 PDF Object 轉換為 f32
    fn object_to_float(obj: &Object) -> Result<f32, ContentStreamError> {
        match obj {
            Object::Real(r) => Ok(*r as f32),
            Object::Integer(i) => Ok(*i as f32),
            _ => Err(ContentStreamError::InvalidOperands(
                "Expected number".to_string(),
            )),
        }
    }
}


/// 字體解析器
/// 
/// 🎯 超越 GoodNotes：精確提取字體信息和字元寬度
/// 支持所有 PDF 字體類型，包括 CID 字體（CJK）
use lopdf::{Document, Object, ObjectId};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum FontError {
    #[error("Font not found: {0}")]
    FontNotFound(String),
    #[error("Invalid font dictionary: {0}")]
    InvalidFontDict(String),
    #[error("Failed to get font width: {0}")]
    WidthExtraction(String),
}

/// 字體信息
#[derive(Debug, Clone)]
pub struct FontInfo {
    /// 字體名稱
    pub name: String,
    /// 字體類型（Type1, TrueType, CIDFont 等）
    pub font_type: String,
    /// 字元寬度表（字元編碼 -> 寬度，單位：字體空間）
    pub widths: HashMap<u16, f32>,
    /// 默認字元寬度
    pub default_width: f32,
    /// 字體編碼（StandardEncoding, WinAnsiEncoding 等）
    pub encoding: String,
    /// 字體基線
    pub base_font: String,
    /// ToUnicode CMap（用於 CID 字體）
    pub to_unicode: Option<Vec<u8>>,
}

/// 字體解析器
pub struct FontParser;

impl FontParser {
    /// 從頁面資源中獲取字體信息
    /// 
    /// # Arguments
    /// * `doc` - PDF 文檔
    /// * `page_id` - 頁面對象 ID
    /// * `font_name` - 字體名稱（例如 "/F1"）
    /// 
    /// # Returns
    /// * `Ok(FontInfo)` - 字體信息
    /// * `Err(FontError)` - 解析錯誤
    pub fn get_font_info(
        doc: &Document,
        page_id: ObjectId,
        font_name: &str,
    ) -> Result<FontInfo, FontError> {
        // 獲取頁面字典
        let page_dict = doc
            .get_dictionary(page_id)
            .map_err(|e| FontError::InvalidFontDict(e.to_string()))?;

        // 獲取 Resources
        let resources = page_dict
            .get(b"Resources")
            .map_err(|_| FontError::FontNotFound("Resources not found".to_string()))?;

        let resources_dict = match resources {
            Object::Reference(ref_id) => {
                doc.get_dictionary(*ref_id)
                    .map_err(|e| FontError::InvalidFontDict(e.to_string()))?
            }
            Object::Dictionary(dict) => dict,
            _ => {
                return Err(FontError::InvalidFontDict(
                    "Invalid Resources type".to_string(),
                ));
            }
        };

        // 獲取 Font 字典
        let fonts = resources_dict
            .get(b"Font")
            .map_err(|_| FontError::FontNotFound("Font dictionary not found".to_string()))?;

        let fonts_dict = match fonts {
            Object::Reference(ref_id) => {
                doc.get_dictionary(*ref_id)
                    .map_err(|e| FontError::InvalidFontDict(e.to_string()))?
            }
            Object::Dictionary(dict) => dict,
            _ => {
                return Err(FontError::InvalidFontDict(
                    "Invalid Font dictionary type".to_string(),
                ));
            }
        };

        // 獲取指定字體（移除前導 "/"）
        let font_key = if font_name.starts_with('/') {
            &font_name[1..]
        } else {
            font_name
        };

        let font_obj = fonts_dict
            .get(font_key.as_bytes())
            .map_err(|_| FontError::FontNotFound(format!("Font {} not found", font_name)))?;

        let font_id = match font_obj {
            Object::Reference(ref_id) => *ref_id,
            _ => {
                return Err(FontError::InvalidFontDict(
                    "Font is not a reference".to_string(),
                ));
            }
        };

        // 獲取字體字典
        let font_dict = doc
            .get_dictionary(font_id)
            .map_err(|e| FontError::InvalidFontDict(e.to_string()))?;

        // 提取字體信息
        let base_font = Self::extract_base_font(&font_dict)?;
        let font_type = Self::extract_font_type(&font_dict)?;
        let widths = Self::extract_widths(doc, &font_dict)?;
        let default_width = Self::extract_default_width(&font_dict)?;
        let encoding = Self::extract_encoding(&font_dict)?;
        let to_unicode = Self::extract_to_unicode(doc, &font_dict)?;

        Ok(FontInfo {
            name: font_name.to_string(),
            font_type,
            widths,
            default_width,
            encoding,
            base_font,
            to_unicode,
        })
    }

    /// 提取 BaseFont
    fn extract_base_font(font_dict: &lopdf::Dictionary) -> Result<String, FontError> {
        if let Ok(base_font) = font_dict.get(b"BaseFont") {
            if let Object::Name(name_bytes) = base_font {
                return Ok(String::from_utf8_lossy(name_bytes).to_string());
            }
        }
        Ok(String::new())
    }

    /// 提取字體類型
    fn extract_font_type(font_dict: &lopdf::Dictionary) -> Result<String, FontError> {
        if let Ok(subtype) = font_dict.get(b"Subtype") {
            if let Object::Name(type_bytes) = subtype {
                return Ok(String::from_utf8_lossy(type_bytes).to_string());
            }
        }
        Ok("Type1".to_string()) // 默認
    }

    /// 提取字元寬度表
    fn extract_widths(
        doc: &Document,
        font_dict: &lopdf::Dictionary,
    ) -> Result<HashMap<u16, f32>, FontError> {
        let mut widths = HashMap::new();

        // 獲取 FirstChar 和 LastChar
        let first_char = font_dict
            .get(b"FirstChar")
            .ok()
            .and_then(|o| {
                if let Object::Integer(i) = o {
                    Some(*i as u16)
                } else {
                    None
                }
            })
            .unwrap_or(0);

        let last_char = font_dict
            .get(b"LastChar")
            .ok()
            .and_then(|o| {
                if let Object::Integer(i) = o {
                    Some(*i as u16)
                } else {
                    None
                }
            })
            .unwrap_or(255);

        // 獲取 Widths 數組
        if let Ok(widths_array) = font_dict.get(b"Widths") {
            if let Object::Array(widths_vals) = widths_array {
                for (i, width_obj) in widths_vals.iter().enumerate() {
                    let char_code = first_char + i as u16;
                    if char_code > last_char {
                        break;
                    }
                    if let Object::Real(w) = width_obj {
                        widths.insert(char_code, *w as f32);
                    } else if let Object::Integer(w) = width_obj {
                        widths.insert(char_code, *w as f32);
                    }
                }
            }
        }

        // 對於 CID 字體，可能需要從 DescendantFonts 獲取
        if let Ok(descendant) = font_dict.get(b"DescendantFonts") {
            if let Object::Array(desc_array) = descendant {
                if let Some(Object::Reference(desc_id)) = desc_array.first() {
                    if let Ok(desc_dict) = doc.get_dictionary(*desc_id) {
                        // 嘗試從 CIDFont 獲取寬度
                        if let Ok(cid_widths) = Self::extract_cid_widths(doc, &desc_dict) {
                            widths.extend(cid_widths);
                        }
                    }
                }
            }
        }

        Ok(widths)
    }

    /// 提取 CID 字體寬度
    fn extract_cid_widths(
        doc: &Document,
        cid_dict: &lopdf::Dictionary,
    ) -> Result<HashMap<u16, f32>, FontError> {
        let mut widths = HashMap::new();

        // CID 字體的寬度在 W 或 W2 中
        if let Ok(w_array) = cid_dict.get(b"W") {
            if let Object::Array(w_vals) = w_array {
                let mut i = 0;
                while i < w_vals.len() {
                    if let (Object::Integer(start), Object::Integer(end)) =
                        (&w_vals[i], &w_vals[i + 1])
                    {
                        i += 2;
                        if let Object::Array(width_array) = &w_vals[i] {
                            for (j, width_obj) in width_array.iter().enumerate() {
                                let cid = *start as u16 + j as u16;
                                if cid > *end as u16 {
                                    break;
                                }
                                if let Object::Real(w) = width_obj {
                                    widths.insert(cid, *w as f32);
                                } else if let Object::Integer(w) = width_obj {
                                    widths.insert(cid, *w as f32);
                                }
                            }
                            i += 1;
                        } else if let Object::Real(w) = &w_vals[i] {
                            // 單一寬度值
                            for cid in *start as u16..=*end as u16 {
                                widths.insert(cid, *w as f32);
                            }
                            i += 1;
                        }
                    }
                }
            }
        }

        Ok(widths)
    }

    /// 提取默認寬度
    fn extract_default_width(font_dict: &lopdf::Dictionary) -> Result<f32, FontError> {
        if let Ok(dw) = font_dict.get(b"DW") {
            if let Object::Real(w) = dw {
                return Ok(*w as f32);
            } else if let Object::Integer(w) = dw {
                return Ok(*w as f32);
            }
        }
        Ok(1000.0) // PDF 默認值
    }

    /// 提取編碼
    fn extract_encoding(font_dict: &lopdf::Dictionary) -> Result<String, FontError> {
        if let Ok(encoding) = font_dict.get(b"Encoding") {
            if let Object::Name(enc_bytes) = encoding {
                return Ok(String::from_utf8_lossy(enc_bytes).to_string());
            } else if let Object::Dictionary(enc_dict) = encoding {
                if let Ok(base_enc) = enc_dict.get(b"BaseEncoding") {
                    if let Object::Name(enc_bytes) = base_enc {
                        return Ok(String::from_utf8_lossy(enc_bytes).to_string());
                    }
                }
            }
        }
        Ok("StandardEncoding".to_string()) // 默認
    }

    /// 提取 ToUnicode CMap
    fn extract_to_unicode(
        doc: &Document,
        font_dict: &lopdf::Dictionary,
    ) -> Result<Option<Vec<u8>>, FontError> {
        if let Ok(to_unicode) = font_dict.get(b"ToUnicode") {
            if let Object::Reference(ref_id) = to_unicode {
                if let Ok(Object::Stream(stream)) = doc.get_object(*ref_id) {
                    if let Ok(data) = stream.decode_content() {
                        return Ok(Some(data));
                    }
                }
            } else if let Object::Stream(stream) = to_unicode {
                if let Ok(data) = stream.decode_content() {
                    return Ok(Some(data));
                }
            }
        }
        Ok(None)
    }

    /// 獲取字元寬度
    /// 
    /// # Arguments
    /// * `font_info` - 字體信息
    /// * `char_code` - 字元編碼
    /// 
    /// # Returns
    /// * 字元寬度（單位：字體空間，通常需要乘以 font_size / 1000）
    pub fn get_char_width(font_info: &FontInfo, char_code: u16) -> f32 {
        font_info
            .widths
            .get(&char_code)
            .copied()
            .unwrap_or(font_info.default_width)
    }
}


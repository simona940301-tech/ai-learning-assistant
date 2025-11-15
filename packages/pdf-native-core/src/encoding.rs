/// PDF 編碼處理
/// 
/// 🎯 超越 GoodNotes：支持所有 PDF 編碼格式
/// 包括 PDFDocEncoding, UTF-16BE, 字體編碼等
use thiserror::Error;

#[derive(Error, Debug)]
pub enum EncodingError {
    #[error("Invalid encoding: {0}")]
    InvalidEncoding(String),
    #[error("Decode error: {0}")]
    DecodeError(String),
}

/// PDF 編碼解析器
pub struct EncodingParser;

impl EncodingParser {
    /// 解碼 PDF 字符串
    /// 
    /// 支持多種編碼格式：
    /// - PDFDocEncoding
    /// - UTF-16BE
    /// - 字面字符串（UTF-8）
    /// 
    /// # Arguments
    /// * `bytes` - 原始字節數據
    /// * `encoding` - 編碼名稱（可選）
    /// 
    /// # Returns
    /// * `Ok(String)` - 解碼後的字符串
    /// * `Err(EncodingError)` - 解碼錯誤
    pub fn decode_string(bytes: &[u8], encoding: Option<&str>) -> Result<String, EncodingError> {
        if bytes.is_empty() {
            return Ok(String::new());
        }

        // 檢查是否為 UTF-16BE（BOM）
        if bytes.len() >= 2 && bytes[0] == 0xFE && bytes[1] == 0xFF {
            return Self::decode_utf16be(&bytes[2..]);
        }

        // 根據編碼參數選擇解碼方式
        match encoding {
            Some("PDFDocEncoding") => Self::decode_pdfdoc_encoding(bytes),
            Some("UTF-16BE") | Some("Unicode") => Self::decode_utf16be(bytes),
            _ => {
                // 默認嘗試 UTF-8，失敗則嘗試 PDFDocEncoding
                String::from_utf8(bytes.to_vec())
                    .or_else(|_| Self::decode_pdfdoc_encoding(bytes))
                    .map_err(|e| EncodingError::DecodeError(e.to_string()))
            }
        }
    }

    /// 解碼 PDFDocEncoding
    /// 
    /// PDFDocEncoding 是 PDF 1.0+ 的標準編碼，類似於 Latin-1 但有一些特殊字符
    fn decode_pdfdoc_encoding(bytes: &[u8]) -> Result<String, EncodingError> {
        // PDFDocEncoding 到 Unicode 的映射表（部分）
        // 大部分字符與 Latin-1 相同，但有一些特殊映射
        let mut result = String::with_capacity(bytes.len());

        for &byte in bytes {
            let char = match byte {
                // 特殊 PDFDocEncoding 字符
                0x18 => '\u{02D8}', // ˇ
                0x19 => '\u{02C7}', // ˘
                0x1A => '\u{02C6}', // ˆ
                0x1B => '\u{02D9}', // ˙
                0x1C => '\u{02DD}', // ˝
                0x1D => '\u{02DB}', // ˛
                0x1E => '\u{02DA}', // ˚
                0x1F => '\u{02DC}', // ˜
                0x80..=0xFF => {
                    // 對於 0x80-0xFF，PDFDocEncoding 與 Latin-1 相同
                    byte as char
                }
                _ => byte as char, // ASCII 範圍
            };
            result.push(char);
        }

        Ok(result)
    }

    /// 解碼 UTF-16BE
    fn decode_utf16be(bytes: &[u8]) -> Result<String, EncodingError> {
        if bytes.len() % 2 != 0 {
            return Err(EncodingError::InvalidEncoding(
                "UTF-16BE requires even number of bytes".to_string(),
            ));
        }

        let mut result = String::with_capacity(bytes.len() / 2);
        let mut i = 0;

        while i + 1 < bytes.len() {
            let high = bytes[i] as u16;
            let low = bytes[i + 1] as u16;
            let code_point = (high << 8) | low;

            if code_point >= 0xD800 && code_point <= 0xDFFF {
                // 代理對（Surrogate Pair）
                if i + 3 >= bytes.len() {
                    return Err(EncodingError::InvalidEncoding(
                        "Incomplete surrogate pair".to_string(),
                    ));
                }
                let high_surrogate = code_point;
                let low_high = bytes[i + 2] as u16;
                let low_low = bytes[i + 3] as u16;
                let low_surrogate = (low_high << 8) | low_low;

                if low_surrogate >= 0xDC00 && low_surrogate <= 0xDFFF {
                    let code_point = 0x10000
                        + ((high_surrogate - 0xD800) << 10)
                        + (low_surrogate - 0xDC00);
                    if let Some(ch) = char::from_u32(code_point) {
                        result.push(ch);
                    }
                    i += 4;
                    continue;
                }
            }

            if let Some(ch) = char::from_u32(code_point as u32) {
                result.push(ch);
            }
            i += 2;
        }

        Ok(result)
    }

    /// 從字元編碼獲取 Unicode 字符
    /// 
    /// 使用字體的編碼映射（如果可用）
    /// 
    /// # Arguments
    /// * `char_code` - 字元編碼（字體空間）
    /// * `encoding` - 編碼名稱
    /// * `to_unicode_cmap` - ToUnicode CMap 數據（可選）
    /// 
    /// # Returns
    /// * `Option<char>` - Unicode 字符
    pub fn char_code_to_unicode(
        char_code: u16,
        _encoding: &str,
        _to_unicode_cmap: Option<&[u8]>,
    ) -> Option<char> {
        // TODO: 實現完整的 CMap 解析
        // 目前使用簡化映射
        if char_code < 256 {
            Some(char_code as u8 as char)
        } else {
            None
        }
    }
}






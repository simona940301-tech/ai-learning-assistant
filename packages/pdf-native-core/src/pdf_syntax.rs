/// PDF 語法解析器
/// 
/// 🎯 超越 GoodNotes：精確解析 PDF Content Stream 語法
/// 實現完整的 PDF 操作符和操作數解析
use lopdf::Object;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SyntaxError {
    #[error("Unexpected end of stream")]
    UnexpectedEnd,
    #[error("Invalid number format: {0}")]
    InvalidNumber(String),
    #[error("Invalid string format: {0}")]
    InvalidString(String),
    #[error("Invalid name format: {0}")]
    InvalidName(String),
    #[error("Invalid array format")]
    InvalidArray,
    #[error("Invalid dictionary format")]
    InvalidDictionary,
    #[error("Unknown operator: {0}")]
    UnknownOperator(String),
}

/// PDF 操作數類型
#[derive(Debug, Clone)]
pub enum Operand {
    Integer(i32),
    Real(f32),
    String(Vec<u8>),
    Name(Vec<u8>),
    Array(Vec<Operand>),
    Dictionary(Vec<(Vec<u8>, Operand)>),
    Boolean(bool),
    Null,
    Reference(u32, u16),
}

/// PDF 操作符
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Operator {
    pub name: String,
}

/// PDF 語法解析器
pub struct PdfSyntaxParser;

impl PdfSyntaxParser {
    /// 解析 Content Stream 字節數據
    /// 
    /// 返回操作數和操作符的序列
    pub fn parse_content_stream(
        data: &[u8],
    ) -> Result<Vec<(Vec<Operand>, Operator)>, SyntaxError> {
        let mut tokens = Vec::new();
        let mut i = 0;
        let mut operands = Vec::new();

        while i < data.len() {
            // 跳過空白字符
            while i < data.len() && Self::is_whitespace(data[i]) {
                i += 1;
            }
            if i >= data.len() {
                break;
            }

            // 嘗試解析操作數
            match Self::parse_operand(data, &mut i)? {
                Some(operand) => {
                    operands.push(operand);
                }
                None => {
                    // 可能是操作符
                    if let Some(op) = Self::parse_operator(data, &mut i)? {
                        tokens.push((operands, op));
                        operands = Vec::new();
                    }
                }
            }
        }

        // 處理最後的操作符（如果有剩餘操作數）
        if !operands.is_empty() {
            // 如果沒有操作符，可能是格式錯誤，但我們繼續處理
        }

        Ok(tokens)
    }

    /// 解析操作數
    fn parse_operand(data: &[u8], i: &mut usize) -> Result<Option<Operand>, SyntaxError> {
        if *i >= data.len() {
            return Ok(None);
        }

        let start = *i;
        let ch = data[start];

        match ch {
            b'/' => {
                // 名稱
                *i += 1;
                let name = Self::parse_name(data, i)?;
                Ok(Some(Operand::Name(name)))
            }
            b'(' => {
                // 字面字符串
                *i += 1;
                let string = Self::parse_literal_string(data, i)?;
                Ok(Some(Operand::String(string)))
            }
            b'<' => {
                *i += 1;
                if *i < data.len() && data[*i] == b'<' {
                    // 字典
                    *i += 1;
                    let dict = Self::parse_dictionary(data, i)?;
                    Ok(Some(Operand::Dictionary(dict)))
                } else {
                    // 十六進制字符串
                    let string = Self::parse_hex_string(data, i)?;
                    Ok(Some(Operand::String(string)))
                }
            }
            b'[' => {
                // 數組
                *i += 1;
                let array = Self::parse_array(data, i)?;
                Ok(Some(Operand::Array(array)))
            }
            b'n' if *i + 3 < data.len() && &data[*i..*i + 4] == b"null" => {
                *i += 4;
                Ok(Some(Operand::Null))
            }
            b't' if *i + 3 < data.len() && &data[*i..*i + 4] == b"true" => {
                *i += 4;
                Ok(Some(Operand::Boolean(true)))
            }
            b'f' if *i + 4 < data.len() && &data[*i..*i + 5] == b"false" => {
                *i += 5;
                Ok(Some(Operand::Boolean(false)))
            }
            b'R' if *i + 1 < data.len() => {
                // 可能是引用（需要前面有兩個數字）
                // 這裡簡化處理，實際應該檢查前面的操作數
                // 跳過 'R' 字符
                *i += 1;
                Ok(None)
            }
            b'0'..=b'9' | b'+' | b'-' | b'.' => {
                // 數字
                let num = Self::parse_number(data, i)?;
                Ok(Some(num))
            }
            _ => {
                // 可能是操作符，返回 None 讓調用者處理
                Ok(None)
            }
        }
    }

    /// 解析名稱
    fn parse_name(data: &[u8], i: &mut usize) -> Result<Vec<u8>, SyntaxError> {
        let mut name = Vec::new();
        while *i < data.len() {
            let ch = data[*i];
            if Self::is_delimiter(ch) {
                break;
            }
            if ch == b'#' && *i + 2 < data.len() {
                // 十六進制轉義
                let hex = &data[*i + 1..*i + 3];
                if let Ok(byte) = u8::from_str_radix(
                    &String::from_utf8_lossy(hex),
                    16,
                ) {
                    name.push(byte);
                    *i += 3;
                    continue;
                }
            }
            name.push(ch);
            *i += 1;
        }
        Ok(name)
    }

    /// 解析字面字符串
    fn parse_literal_string(data: &[u8], i: &mut usize) -> Result<Vec<u8>, SyntaxError> {
        let mut string = Vec::new();
        let mut depth = 1;
        let mut escape = false;

        while *i < data.len() {
            let ch = data[*i];
            *i += 1;

            if escape {
                match ch {
                    b'n' => string.push(b'\n'),
                    b'r' => string.push(b'\r'),
                    b't' => string.push(b'\t'),
                    b'b' => string.push(b'\x08'),
                    b'f' => string.push(b'\x0c'),
                    b'(' => string.push(b'('),
                    b')' => string.push(b')'),
                    b'\\' => string.push(b'\\'),
                    b'\n' | b'\r' => {
                        // 行繼續
                    }
                    b'0'..=b'7' => {
                        // 八進制轉義
                        let mut oct = (ch - b'0') as u32;
                        let mut count = 1;
                        while count < 3 && *i < data.len() {
                            let next = data[*i];
                            if next >= b'0' && next <= b'7' {
                                oct = oct * 8 + (next - b'0') as u32;
                                *i += 1;
                                count += 1;
                            } else {
                                break;
                            }
                        }
                        if oct <= 0xFF {
                            string.push(oct as u8);
                        }
                    }
                    _ => string.push(ch),
                }
                escape = false;
            } else if ch == b'\\' {
                escape = true;
            } else if ch == b'(' {
                depth += 1;
                string.push(ch);
            } else if ch == b')' {
                depth -= 1;
                if depth == 0 {
                    break;
                }
                string.push(ch);
            } else {
                string.push(ch);
            }
        }

        if depth != 0 {
            return Err(SyntaxError::InvalidString("Unclosed string".to_string()));
        }

        Ok(string)
    }

    /// 解析十六進制字符串
    fn parse_hex_string(data: &[u8], i: &mut usize) -> Result<Vec<u8>, SyntaxError> {
        let mut hex_chars = Vec::new();
        while *i < data.len() {
            let ch = data[*i];
            if ch == b'>' {
                *i += 1;
                break;
            }
            if !Self::is_whitespace(ch) {
                hex_chars.push(ch);
            }
            *i += 1;
        }

        // 轉換十六進制字符串為字節
        let mut bytes = Vec::new();
        let hex_str = String::from_utf8_lossy(&hex_chars);
        let hex_clean: String = hex_str.chars().filter(|c| c.is_ascii_hexdigit()).collect();

        for i in (0..hex_clean.len()).step_by(2) {
            if i + 1 < hex_clean.len() {
                if let Ok(byte) = u8::from_str_radix(&hex_clean[i..i + 2], 16) {
                    bytes.push(byte);
                }
            } else {
                // 奇數長度，補零
                if let Ok(byte) = u8::from_str_radix(&format!("{}0", &hex_clean[i..i + 1]), 16) {
                    bytes.push(byte);
                }
            }
        }

        Ok(bytes)
    }

    /// 解析數組
    fn parse_array(data: &[u8], i: &mut usize) -> Result<Vec<Operand>, SyntaxError> {
        let mut array = Vec::new();
        while *i < data.len() {
            // 跳過空白
            while *i < data.len() && Self::is_whitespace(data[*i]) {
                *i += 1;
            }
            if *i >= data.len() {
                break;
            }
            if data[*i] == b']' {
                *i += 1;
                break;
            }
            if let Some(operand) = Self::parse_operand(data, i)? {
                array.push(operand);
            } else {
                break;
            }
        }
        Ok(array)
    }

    /// 解析字典
    fn parse_dictionary(data: &[u8], i: &mut usize) -> Result<Vec<(Vec<u8>, Operand)>, SyntaxError> {
        let mut dict = Vec::new();
        while *i < data.len() {
            // 跳過空白
            while *i < data.len() && Self::is_whitespace(data[*i]) {
                *i += 1;
            }
            if *i >= data.len() {
                break;
            }
            if *i + 1 < data.len() && data[*i] == b'>' && data[*i + 1] == b'>' {
                *i += 2;
                break;
            }
            // 解析鍵（名稱）
            if data[*i] == b'/' {
                *i += 1;
                let key = Self::parse_name(data, i)?;
                // 解析值
                if let Some(value) = Self::parse_operand(data, i)? {
                    dict.push((key, value));
                } else {
                    break;
                }
            } else {
                break;
            }
        }
        Ok(dict)
    }

    /// 解析數字
    fn parse_number(data: &[u8], i: &mut usize) -> Result<Operand, SyntaxError> {
        let start = *i;
        let mut has_dot = false;
        let mut has_exp = false;
        let mut exp_sign = 1;

        // 解析符號
        if *i < data.len() && (data[*i] == b'+' || data[*i] == b'-') {
            *i += 1;
        }

        // 解析整數部分
        while *i < data.len() && data[*i].is_ascii_digit() {
            *i += 1;
        }

        // 解析小數點
        if *i < data.len() && data[*i] == b'.' {
            has_dot = true;
            *i += 1;
            while *i < data.len() && data[*i].is_ascii_digit() {
                *i += 1;
            }
        }

        // 解析指數
        if *i < data.len() && (data[*i] == b'e' || data[*i] == b'E') {
            has_exp = true;
            *i += 1;
            if *i < data.len() && (data[*i] == b'+' || data[*i] == b'-') {
                if data[*i] == b'-' {
                    _exp_sign = -1;
                }
                *i += 1;
            }
            while *i < data.len() && data[*i].is_ascii_digit() {
                *i += 1;
            }
        }

        let num_str = String::from_utf8_lossy(&data[start..*i]);
        if has_dot || has_exp {
            num_str
                .parse::<f32>()
                .map(Operand::Real)
                .map_err(|e| SyntaxError::InvalidNumber(e.to_string()))
        } else {
            num_str
                .parse::<i32>()
                .map(Operand::Integer)
                .map_err(|e| SyntaxError::InvalidNumber(e.to_string()))
        }
    }

    /// 解析操作符
    fn parse_operator(data: &[u8], i: &mut usize) -> Result<Option<Operator>, SyntaxError> {
        let start = *i;
        let mut len = 0;

        // PDF 操作符是字母序列，以空白或分隔符結束
        while *i < data.len() {
            let ch = data[*i];
            if ch.is_ascii_alphabetic() {
                len += 1;
                *i += 1;
            } else {
                break;
            }
        }

        if len > 0 {
            let op_name = String::from_utf8_lossy(&data[start..start + len]).to_string();
            Ok(Some(Operator { name: op_name }))
        } else {
            Ok(None)
        }
    }

    /// 判斷是否為空白字符
    fn is_whitespace(ch: u8) -> bool {
        matches!(ch, 0x00 | 0x09 | 0x0A | 0x0C | 0x0D | 0x20)
    }

    /// 判斷是否為分隔符
    fn is_delimiter(ch: u8) -> bool {
        Self::is_whitespace(ch)
            || matches!(ch, b'(' | b')' | b'<' | b'>' | b'[' | b']' | b'{' | b'}' | b'/' | b'%')
    }

    /// 將 Operand 轉換為 lopdf Object
    pub fn operand_to_object(operand: &Operand) -> Object {
        match operand {
            Operand::Integer(i) => Object::Integer(*i),
            Operand::Real(r) => Object::Real(*r),
            Operand::String(s) => Object::String(s.clone(), lopdf::StringFormat::Literal),
            Operand::Name(n) => Object::Name(n.clone()),
            Operand::Array(arr) => {
                Object::Array(arr.iter().map(Self::operand_to_object).collect())
            }
            Operand::Dictionary(dict) => {
                let mut dict_obj = lopdf::Dictionary::new();
                for (key, value) in dict {
                    dict_obj.set(key.clone(), Self::operand_to_object(value));
                }
                Object::Dictionary(dict_obj)
            }
            Operand::Boolean(b) => Object::Boolean(*b),
            Operand::Null => Object::Null,
            Operand::Reference(gen, num) => Object::Reference((*gen, *num)),
        }
    }
}


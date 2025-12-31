mod types;
mod parser;
mod selector;
mod text_state;
mod content_stream;
mod pdf_syntax;
mod font_parser;
mod encoding;

pub use types::*;
pub use parser::*;
pub use selector::*;
pub use text_state::*;
pub use content_stream::*;
pub use pdf_syntax::*;
pub use font_parser::*;
pub use encoding::*;

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_void};
use std::ptr;

/// FFI: 載入 PDF 頁面數據
/// 
/// # Arguments
/// * `file_path` - PDF 文件路徑（C 字符串）
/// * `page_num` - 頁碼（從 1 開始）
/// 
/// # Returns
/// * 成功：返回不透明的指針（PageData）
/// * 失敗：返回 NULL
/// 
/// # Safety
/// 調用者必須使用 `pdf_free_page_data` 釋放返回的指針
#[no_mangle]
pub unsafe extern "C" fn pdf_load_page_data(
    file_path: *const c_char,
    page_num: u32,
) -> *mut c_void {
    if file_path.is_null() {
        return ptr::null_mut();
    }

    let path = match CStr::from_ptr(file_path).to_str() {
        Ok(s) => s,
        Err(_) => return ptr::null_mut(),
    };

    match PdfParser::load_page(path, page_num) {
        Ok(page_data) => {
            let boxed = Box::new(page_data);
            Box::into_raw(boxed) as *mut c_void
        }
        Err(_) => ptr::null_mut(),
    }
}

/// FFI: 執行選取計算
/// 
/// # Arguments
/// * `page_data` - 頁面數據指針（由 `pdf_load_page_data` 返回）
/// * `x1, y1, x2, y2` - 選取框的座標（PDF 座標系）
/// * `page_num` - 頁碼
/// 
/// # Returns
/// * 成功：返回選取結果指針
/// * 失敗：返回 NULL
/// 
/// # Safety
/// 調用者必須使用 `pdf_free_selection_result` 釋放返回的指針
#[no_mangle]
pub unsafe extern "C" fn pdf_perform_selection(
    page_data: *mut c_void,
    x1: f32,
    y1: f32,
    x2: f32,
    y2: f32,
    page_num: u32,
) -> *mut c_void {
    if page_data.is_null() {
        return ptr::null_mut();
    }

    let page_data = &*(page_data as *const PageData);
    let selection_box = SelectionBox {
        x1,
        y1,
        x2,
        y2,
        page_number: page_num,
    };

    let result = TextSelector::select_text(&page_data.chars, &selection_box);
    Box::into_raw(Box::new(result)) as *mut c_void
}

/// FFI: 獲取選取結果的 JSON 字符串
/// 
/// # Arguments
/// * `result_ptr` - 選取結果指針（由 `pdf_perform_selection` 返回）
/// 
/// # Returns
/// * 成功：返回 JSON 字符串（C 字符串）
/// * 失敗：返回 NULL
/// 
/// # Safety
/// 調用者必須使用 `pdf_free_string` 釋放返回的字符串
/// 
/// # JSON 格式
/// ```json
/// {
///   "text": "選取的文字",
///   "bounding_boxes": [
///     {"x": 100.0, "y": 200.0, "width": 50.0, "height": 12.0}
///   ],
///   "page_number": 1,
///   "chars": [...]
/// }
/// ```
#[no_mangle]
pub unsafe extern "C" fn pdf_get_selection_json(result_ptr: *mut c_void) -> *mut c_char {
    if result_ptr.is_null() {
        return ptr::null_mut();
    }

    let result = &*(result_ptr as *const SelectionResult);
    match serde_json::to_string(result) {
        Ok(json) => CString::new(json).unwrap().into_raw(),
        Err(_) => ptr::null_mut(),
    }
}

/// FFI: 釋放頁面數據
/// 
/// # Safety
/// 只能釋放由 `pdf_load_page_data` 返回的指針
#[no_mangle]
pub unsafe extern "C" fn pdf_free_page_data(ptr: *mut c_void) {
    if !ptr.is_null() {
        let _ = Box::from_raw(ptr as *mut PageData);
    }
}

/// FFI: 釋放選取結果
/// 
/// # Safety
/// 只能釋放由 `pdf_perform_selection` 返回的指針
#[no_mangle]
pub unsafe extern "C" fn pdf_free_selection_result(ptr: *mut c_void) {
    if !ptr.is_null() {
        let _ = Box::from_raw(ptr as *mut SelectionResult);
    }
}

/// FFI: 釋放字符串
/// 
/// # Safety
/// 只能釋放由 `pdf_get_selection_json` 返回的字符串
#[no_mangle]
pub unsafe extern "C" fn pdf_free_string(ptr: *mut c_char) {
    if !ptr.is_null() {
        drop(CString::from_raw(ptr));
    }
}


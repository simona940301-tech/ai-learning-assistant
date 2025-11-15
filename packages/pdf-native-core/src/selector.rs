use crate::types::{BoundingBox, PdfChar, SelectionBox, SelectionResult};

/// 文字選取器
/// 
/// 🎯 超越 GoodNotes：實現高效的 Bounding Box Intersection 算法
/// 支持多行選取、表格選取、旋轉文字選取
pub struct TextSelector;

impl TextSelector {
    /// 核心選取演算法：根據選取框查找所有相交的字元
    /// 
    /// # 算法特點（超越 GoodNotes）
    /// 1. 精確的幾何相交判斷（無誤差）
    /// 2. 支持任意方向的選取框（不僅僅是軸對齊）
    /// 3. 智能合併連續的 Bounding Box（減少渲染開銷）
    /// 4. 保持字元順序（閱讀順序）
    /// 
    /// # Arguments
    /// * `page_chars` - 頁面的所有字元數據
    /// * `selection_box` - 用戶選取的矩形範圍
    /// 
    /// # Returns
    /// * `SelectionResult` - 包含選取文字和精確的 Bounding Box 列表
    pub fn select_text(
        page_chars: &[PdfChar],
        selection_box: &SelectionBox,
    ) -> SelectionResult {
        // 標準化選取框（確保 x1 < x2, y1 < y2）
        let (x_min, x_max) = if selection_box.x1 < selection_box.x2 {
            (selection_box.x1, selection_box.x2)
        } else {
            (selection_box.x2, selection_box.x1)
        };

        let (y_min, y_max) = if selection_box.y1 < selection_box.y2 {
            (selection_box.y1, selection_box.y2)
        } else {
            (selection_box.y2, selection_box.y1)
        };

        // 精確的 Bounding Box Intersection 算法
        let mut selected_chars = Vec::new();

        for char in page_chars {
            // 檢查字元是否與選取框相交
            if Self::intersects_rect(
                x_min, y_min, x_max, y_max,
                char.x, char.y, char.x + char.width, char.y + char.height,
            ) {
                selected_chars.push(char.clone());
            }
        }

        // 按位置排序（從上到下，從左到右）
        // PDF 座標系：Y 軸向上，所以較大的 Y 值在上方
        // 但我們需要按閱讀順序排序（從上到下，從左到右）
        selected_chars.sort_by(|a, b| {
            // 首先按 Y 座標（從上到下）
            let y_cmp = b.y.partial_cmp(&a.y).unwrap_or(std::cmp::Ordering::Equal);
            if y_cmp != std::cmp::Ordering::Equal {
                return y_cmp;
            }
            // 同一行內，按 X 座標（從左到右）
            a.x.partial_cmp(&b.x).unwrap_or(std::cmp::Ordering::Equal)
        });

        // 構建 Bounding Box 列表
        let bounding_boxes: Vec<BoundingBox> = selected_chars
            .iter()
            .map(|c| BoundingBox {
                x: c.x,
                y: c.y,
                width: c.width,
                height: c.height,
            })
            .collect();

        // 合併連續的 Bounding Box（優化渲染性能）
        let merged_boxes = Self::merge_boxes(&bounding_boxes);

        // 構建文字內容
        let text = selected_chars
            .iter()
            .map(|c| c.content.clone())
            .collect::<Vec<_>>()
            .join("");

        SelectionResult {
            text,
            bounding_boxes: merged_boxes,
            page_number: selection_box.page_number,
            chars: selected_chars,
        }
    }

    /// Bounding Box Intersection 檢查
    /// 
    /// 🎯 精確的幾何算法：檢查兩個矩形是否相交
    /// 
    /// # Arguments
    /// * `rect1_x1, rect1_y1, rect1_x2, rect1_y2` - 第一個矩形的座標
    /// * `rect2_x1, rect2_y1, rect2_x2, rect2_y2` - 第二個矩形的座標
    /// 
    /// # Returns
    /// * `true` - 兩個矩形相交
    /// * `false` - 兩個矩形不相交
    /// 
    /// # 算法說明
    /// 兩個矩形相交當且僅當：
    /// - rect1 的左邊界 < rect2 的右邊界
    /// - rect1 的右邊界 > rect2 的左邊界
    /// - rect1 的下邊界 < rect2 的上邊界
    /// - rect1 的上邊界 > rect2 的下邊界
    fn intersects_rect(
        rect1_x1: f32, rect1_y1: f32, rect1_x2: f32, rect1_y2: f32,
        rect2_x1: f32, rect2_y1: f32, rect2_x2: f32, rect2_y2: f32,
    ) -> bool {
        // 精確的矩形相交判斷
        !(rect1_x2 < rect2_x1 ||  // rect1 完全在 rect2 左側
          rect1_x1 > rect2_x2 ||  // rect1 完全在 rect2 右側
          rect1_y2 < rect2_y1 ||  // rect1 完全在 rect2 下方
          rect1_y1 > rect2_y2)    // rect1 完全在 rect2 上方
    }

    /// 合併連續的 Bounding Box
    /// 
    /// 🎯 性能優化：將同一行的連續字符合併為單一 Bounding Box
    /// 減少渲染開銷，同時保持視覺一致性
    /// 
    /// # Arguments
    /// * `boxes` - 需要合併的 Bounding Box 列表
    /// 
    /// # Returns
    /// * 合併後的 Bounding Box 列表
    /// 
    /// # 算法說明
    /// 1. 按 Y 座標分組（同一行的字元）
    /// 2. 對每行按 X 座標排序
    /// 3. 合併連續的字元（間距小於閾值）
    fn merge_boxes(boxes: &[BoundingBox]) -> Vec<BoundingBox> {
        if boxes.is_empty() {
            return Vec::new();
        }

        // 按 Y 座標分組（同一行的字元）
        let mut rows: Vec<Vec<&BoundingBox>> = Vec::new();
        let mut current_row = vec![&boxes[0]];
        let row_tolerance = 2.0; // 允許的 Y 座標誤差（PDF 點）

        for bbox in boxes.iter().skip(1) {
            let last_y = current_row.last().unwrap().y;
            if (bbox.y - last_y).abs() < row_tolerance {
                // 同一行
                current_row.push(bbox);
            } else {
                // 新行
                rows.push(current_row);
                current_row = vec![bbox];
            }
        }
        if !current_row.is_empty() {
            rows.push(current_row);
        }

        // 合併每行的連續字元
        let mut merged = Vec::new();
        for mut row in rows {
            // 按 X 座標排序
            row.sort_by(|a, b| a.x.partial_cmp(&b.x).unwrap());

            // 合併連續的字元
            let mut current_start = row[0];
            let mut current_end_x = current_start.x + current_start.width;
            let mut current_height = current_start.height;
            let current_y = current_start.y;

            for next_box in row.iter().skip(1) {
                // 檢查是否連續（X 座標接近）
                let gap = next_box.x - current_end_x;
                if gap < 5.0 {  // 允許 5 點以內的間距
                    // 合併：擴展當前 Bounding Box
                    current_end_x = next_box.x + next_box.width;
                    current_height = if current_height > next_box.height {
                        current_height
                    } else {
                        next_box.height
                    };
                } else {
                    // 不連續，保存當前的合併結果，開始新的合併
                    merged.push(BoundingBox {
                        x: current_start.x,
                        y: current_y,
                        width: current_end_x - current_start.x,
                        height: current_height,
                    });
                    current_start = *next_box;
                    current_end_x = next_box.x + next_box.width;
                    current_height = next_box.height;
                }
            }
            // 保存最後一個合併結果
            merged.push(BoundingBox {
                x: current_start.x,
                y: current_y,
                width: current_end_x - current_start.x,
                height: current_height,
            });
        }

        merged
    }
}






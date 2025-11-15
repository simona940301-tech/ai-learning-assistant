/**
 * PDF Image Detection Utility
 * 
 * 檢測 PDF 頁面中是否包含圖片，用於智能 OCR 觸發
 * 從學習體驗角度：只對有圖片的頁面進行 OCR，避免不必要的處理
 * 
 * ⚠️ 關鍵安全原則：
 * 1. 所有錯誤都必須被捕獲，不能拋出
 * 2. 失敗時返回 false（保守策略），不觸發 OCR
 * 3. 不記錄錯誤日誌（避免 console 噪音）
 * 4. 確保函數永遠不會導致渲染失敗
 */

/**
 * 使用 PDF.js 檢測頁面是否包含圖片
 * 通過分析 operator list 來判斷是否有圖片操作
 * 
 * ⚠️ 安全保證：這個函數永遠不會拋出錯誤
 * 
 * @param page PDF.js page 物件
 * @returns Promise<boolean> 是否有圖片（失敗時返回 false）
 */
export async function detectImagesInPage(page: any): Promise<boolean> {
  // ⚠️ 關鍵：所有錯誤都必須被捕獲，不能拋出
  try {
    // ⚠️ 安全檢查：確保 page 物件存在且有 getOperatorList 方法
    if (!page || typeof page.getOperatorList !== 'function') {
      return false // 安全返回，不記錄警告
    }

    // 獲取頁面的 operator list（這是一個異步操作）
    // ⚠️ 如果這個操作失敗，會被捕獲並返回 false
    const operatorList = await page.getOperatorList()
    
    if (!operatorList || !operatorList.fnArray || !Array.isArray(operatorList.fnArray)) {
      return false
    }

    // PDF.js 圖片相關的操作碼
    // 這些操作碼表示頁面中有圖片繪製操作
    // 參考：https://github.com/mozilla/pdf.js/blob/master/src/core/core_utils.js
    const imageOps = [
      60,  // OPS.paintImageXObject
      61,  // OPS.paintImageXObjectGroup
      62,  // OPS.paintInlineImageXObject
      63,  // OPS.paintInlineImageXObjectGroup
    ]

    // 檢查 operator list 中是否有圖片操作
    const hasImage = operatorList.fnArray.some((op: number) => 
      imageOps.includes(op)
    )

    return hasImage
  } catch (err) {
    // ⚠️ 關鍵：如果檢測失敗，返回 false（保守策略）
    // 這樣不會觸發不必要的 OCR，也不會阻塞渲染
    // ⚠️ 不記錄錯誤（避免 console 噪音），靜默失敗
    return false
  }
}

/**
 * 檢測頁面中圖片的區域
 * 返回圖片在頁面中的位置和尺寸（歸一化座標 0-1）
 * 
 * ⚠️ 注意：這個功能目前未實現，未來可以優化為只 OCR 圖片區域
 * ⚠️ 安全保證：這個函數永遠不會拋出錯誤
 */
export async function detectImageRegions(
  page: any,
  viewport: any
): Promise<Array<{ x: number; y: number; width: number; height: number }>> {
  try {
    if (!page || typeof page.getOperatorList !== 'function') {
      return []
    }

    const operatorList = await page.getOperatorList()
    
    if (!operatorList || !operatorList.fnArray) {
      return []
    }

    const regions: Array<{ x: number; y: number; width: number; height: number }> = []
    
    // TODO: 解析 operator list 提取圖片區域
    // 這需要更複雜的解析邏輯，目前先返回空陣列
    // 未來可以實現：只對圖片區域進行 OCR，進一步降低成本
    
    return regions
  } catch (err) {
    // 靜默失敗，返回空陣列
    return []
  }
}

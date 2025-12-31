-- ============================================
-- ChatGPT-Style Storage: 移除文件存儲依賴
-- Migration 026 - Simplify architecture
-- ============================================

-- 1. 添加 page_count 到 file_analysis 表
ALTER TABLE file_analysis
ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 0;

-- 2. 添加 file_name 到 file_analysis 表（方便顯示）
ALTER TABLE file_analysis
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- 3. file_id 改為可選（因為不再依賴 files 表）
ALTER TABLE file_analysis
ALTER COLUMN file_id DROP NOT NULL;

-- ============================================
-- 說明
-- ============================================
-- 優勢：
-- 1. ✅ 零配置 - 不需要 Storage bucket
-- 2. ✅ 更快 - 省略文件上傳步驟
-- 3. ✅ 更簡單 - 像 ChatGPT 一樣用完即丟
-- 4. ✅ 降低成本 - 不需要存儲空間

-- 架構變化：
-- 舊：上傳 → Storage → files 表 → file_analysis 表
-- 新：上傳 → 內存處理 → file_analysis 表（直接存分析結果）

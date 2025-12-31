-- ============================================
-- Migration: Add explanation_file_url to seed_questions
-- ============================================
-- 新增詳解檔案 URL 欄位，用於存儲上傳的 TXT/PDF 詳解檔案

-- 新增欄位
ALTER TABLE seed_questions ADD COLUMN IF NOT EXISTS explanation_file_url TEXT;

-- 註釋
COMMENT ON COLUMN seed_questions.explanation_file_url IS '詳解檔案 URL（TXT/PDF）';

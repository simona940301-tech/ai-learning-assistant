-- ============================================================
-- Migration: 017_department_requirements.sql
-- Description: Create department_requirements table for admission standards
-- Created: 2025-01-XX
-- ============================================================

-- Create department_requirements table
CREATE TABLE IF NOT EXISTS department_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 大學和科系資訊
  university_name TEXT NOT NULL,
  department_name TEXT NOT NULL,
  department_code TEXT, -- 校系代碼（可選）
  
  -- 招生資訊
  admission_quota INTEGER, -- 招生名額
  gender_requirement TEXT CHECK (gender_requirement IN ('無', '男', '女')), -- 性別要求
  
  -- 檢定標準（級距文字，如：頂標、前標、均標等）
  requirement_chinese TEXT, -- 國文檢定標準
  requirement_english TEXT, -- 英文檢定標準
  requirement_math_a TEXT, -- 數學A檢定標準
  requirement_math_b TEXT, -- 數學B檢定標準
  requirement_social TEXT, -- 社會檢定標準
  requirement_natural TEXT, -- 自然檢定標準
  requirement_english_listening TEXT, -- 英聽檢定標準（可能是 A/B/C 或級距）
  
  -- 檢定標準分數（轉換後的實際分數）
  score_chinese INTEGER, -- 國文分數
  score_english INTEGER, -- 英文分數
  score_math_a INTEGER, -- 數學A分數
  score_math_b INTEGER, -- 數學B分數
  score_social INTEGER, -- 社會分數
  score_natural INTEGER, -- 自然分數
  score_english_listening TEXT, -- 英聽（保持 A/B/C 或分數）
  
  -- 元資料
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 唯一約束：同一大學同一科系只能有一筆記錄
  UNIQUE(university_name, department_name)
);

-- Create indexes for better query performance
CREATE INDEX idx_department_requirements_university ON department_requirements(university_name);
CREATE INDEX idx_department_requirements_department ON department_requirements(department_name);
CREATE INDEX idx_department_requirements_code ON department_requirements(department_code);

-- Enable Row Level Security
ALTER TABLE department_requirements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can read department requirements (public data)
CREATE POLICY "Anyone can view department requirements"
  ON department_requirements
  FOR SELECT
  USING (true);

-- RLS Policy: Only authenticated users can insert (for admin uploads)
CREATE POLICY "Authenticated users can insert department requirements"
  ON department_requirements
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS Policy: Only authenticated users can update
CREATE POLICY "Authenticated users can update department requirements"
  ON department_requirements
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_department_requirements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update updated_at on changes
CREATE TRIGGER on_department_requirements_updated
  BEFORE UPDATE ON department_requirements
  FOR EACH ROW EXECUTE FUNCTION update_department_requirements_updated_at();

-- Grant permissions
GRANT SELECT ON department_requirements TO authenticated, anon;
GRANT INSERT, UPDATE ON department_requirements TO authenticated;

-- Comment on table
COMMENT ON TABLE department_requirements IS 'University department admission requirements with verification standards';


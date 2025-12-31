-- Quick test to see actual option_analysis structure
-- Run this in Supabase SQL editor to see the data

SELECT 
  question_id,
  LEFT(explanation_text, 100) as explanation_preview,
  option_analysis,
  jsonb_typeof(option_analysis) as analysis_type,
  jsonb_object_keys(option_analysis) as keys
FROM question_explanations
WHERE option_analysis IS NOT NULL 
  AND option_analysis != '{}'::jsonb
LIMIT 5;

-- Add indexes for upload performance optimization
-- Created: 2025-11-26

-- Add index on files.user_id for faster user file queries
CREATE INDEX IF NOT EXISTS idx_files_user_id_status ON files(user_id, ocr_status);

-- Add index on file_analysis.user_id and status for polling queries
CREATE INDEX IF NOT EXISTS idx_file_analysis_user_id ON file_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_file_analysis_status ON file_analysis(status);
CREATE INDEX IF NOT EXISTS idx_file_analysis_user_status ON file_analysis(user_id, status);

-- Add index on file_analysis.created_at for recent queries
CREATE INDEX IF NOT EXISTS idx_file_analysis_created_at ON file_analysis(created_at DESC);

-- Comment on indexes
COMMENT ON INDEX idx_files_user_id_status IS 'Optimize user file listing with status filter';
COMMENT ON INDEX idx_file_analysis_user_status IS 'Optimize polling queries for analysis status';
COMMENT ON INDEX idx_file_analysis_created_at IS 'Optimize recent analysis queries';

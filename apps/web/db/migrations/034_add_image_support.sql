-- Execute migration manually
\c your_database_name

-- Drop existing constraint
ALTER TABLE rag_documents 
  DROP CONSTRAINT IF EXISTS rag_documents_file_type_check;

-- Add new constraint with image support
ALTER TABLE rag_documents 
  ADD CONSTRAINT rag_documents_file_type_check 
  CHECK (file_type IN ('pdf', 'txt', 'image'));

-- Update comment
COMMENT ON COLUMN rag_documents.file_type IS 'File type: pdf, txt, or image (jpg/png/webp/heic)';

-- Verify
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'rag_documents' AND column_name = 'file_type';

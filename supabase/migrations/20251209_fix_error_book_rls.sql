-- Allow users to insert their own error book entries
CREATE POLICY "Users can insert their own error_book entries"
ON error_book FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Ensure users can view their own entries (usually already exists, but good to be safe)
-- CREATE POLICY "Users can view their own error_book entries"
-- ON error_book FOR SELECT
-- TO authenticated
-- USING (auth.uid() = user_id);

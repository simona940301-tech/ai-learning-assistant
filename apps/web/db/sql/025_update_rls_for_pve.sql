-- Allow viewing packs that assume 'system' or 'pve' context or are simply non-public but needed
-- Ideally, we should allow viewing packs if they are in 'user_pack_installations' OR if they serve as system packs.
-- For now, we will broaden the policy for 'packs' and 'pack_questions' to ensure Error Book (which references them) works.

DROP POLICY IF EXISTS "Public can view published packs" ON packs;
CREATE POLICY "Public can view published or system packs" ON packs FOR SELECT 
  USING (
    (status = 'published' AND visibility = 'public') 
    OR (auth.uid() = created_by)
    OR (source = 'system') -- Allow reading system packs (like PVE Training Pack)
    OR (is_official = true)
  );

DROP POLICY IF EXISTS "Public can view questions of published packs" ON pack_questions;
CREATE POLICY "Public can view questions of accessible packs" ON pack_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM packs 
      WHERE packs.id = pack_questions.pack_id 
      AND (
        (packs.status = 'published' AND packs.visibility = 'public') 
        OR (packs.auth.uid() = packs.created_by)
        OR (packs.source = 'system')
        OR (packs.is_official = true)
      )
    )
  );

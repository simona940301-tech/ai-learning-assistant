-- Migration: Add RLS Policies for Unrestricted Tables
-- Date: 2025-01-XX
-- Description: 為 comments, follows, post_likes, user_purchases 添加完整的 RLS 策略

-- ============================================
-- Comments Table RLS Policies
-- ============================================
-- 所有人都能看到所有評論，但只能創建/更新/刪除自己的評論

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 公開讀取：所有人都能看到所有評論
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  USING (true);

-- 僅認證用戶可以創建評論，且只能以自己的身份創建
CREATE POLICY "Users can create own comments"
  ON comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.role() = 'authenticated'
  );

-- 用戶只能更新自己的評論
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

-- 用戶只能刪除自己的評論
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Follows Table RLS Policies
-- ============================================
-- 追蹤關係公開可見，但只能創建/刪除自己的追蹤關係

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- 公開讀取：所有人都能看到追蹤關係
CREATE POLICY "Follows are viewable by everyone"
  ON follows FOR SELECT
  USING (true);

-- 僅認證用戶可以創建追蹤關係，且只能以自己的身份追蹤他人
CREATE POLICY "Users can create own follows"
  ON follows FOR INSERT
  WITH CHECK (
    auth.uid() = follower_id
    AND auth.role() = 'authenticated'
  );

-- 用戶只能刪除自己的追蹤關係（取消追蹤）
CREATE POLICY "Users can delete own follows"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- 注意：follows 表通常不需要 UPDATE，因為追蹤關係是二元關係
-- 如果需要更新，可以添加以下策略：
-- CREATE POLICY "Users can update own follows"
--   ON follows FOR UPDATE
--   USING (auth.uid() = follower_id);

-- ============================================
-- Post Likes Table RLS Policies
-- ============================================
-- 按讚記錄公開可見，但只能創建/刪除自己的按讚

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- 公開讀取：所有人都能看到按讚記錄
CREATE POLICY "Post likes are viewable by everyone"
  ON post_likes FOR SELECT
  USING (true);

-- 僅認證用戶可以創建按讚，且只能以自己的身份按讚
CREATE POLICY "Users can create own post likes"
  ON post_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.role() = 'authenticated'
  );

-- 用戶只能刪除自己的按讚（取消按讚）
CREATE POLICY "Users can delete own post likes"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 注意：post_likes 表通常不需要 UPDATE，因為按讚是二元狀態
-- 如果需要更新，可以添加以下策略：
-- CREATE POLICY "Users can update own post likes"
--   ON post_likes FOR UPDATE
--   USING (auth.uid() = user_id);

-- ============================================
-- User Purchases Table RLS Policies
-- ============================================
-- 購買記錄完全私密，僅本人可查看和創建

ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

-- 僅本人可查看自己的購買記錄
CREATE POLICY "Users can view own purchases"
  ON user_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- 僅認證用戶可以創建購買記錄，且只能以自己的身份購買
CREATE POLICY "Users can create own purchases"
  ON user_purchases FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND auth.role() = 'authenticated'
  );

-- 注意：購買記錄通常不應該被更新或刪除（財務記錄的不可變性）
-- 如果需要，可以添加以下策略：
-- CREATE POLICY "Users can update own purchases"
--   ON user_purchases FOR UPDATE
--   USING (auth.uid() = user_id);
--
-- CREATE POLICY "Users can delete own purchases"
--   ON user_purchases FOR DELETE
--   USING (auth.uid() = user_id);

-- ============================================
-- Verification Queries (可選，用於驗證)
-- ============================================
-- 執行後可以運行以下查詢來驗證 RLS 是否已啟用：
--
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('comments', 'follows', 'post_likes', 'user_purchases');
--
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('comments', 'follows', 'post_likes', 'user_purchases')
-- ORDER BY tablename, policyname;


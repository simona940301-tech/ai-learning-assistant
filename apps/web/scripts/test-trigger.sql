-- Run this in Supabase SQL Editor to test the trigger manually
-- This will show the EXACT error message

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'test_' || substr(test_user_id::text, 1, 8) || '@example.com';
BEGIN
  -- Try to insert a test user into auth.users
  -- This will trigger handle_new_user
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    test_user_id,
    test_email,
    crypt('test_password', gen_salt('bf')),
    NOW(),
    '{"username": "test_user", "avatar_url": ""}'::jsonb,
    NOW(),
    NOW()
  );
  
  RAISE NOTICE 'Test user created successfully: %', test_email;
  
  -- Clean up
  DELETE FROM auth.users WHERE id = test_user_id;
  RAISE NOTICE 'Test user deleted';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR: %', SQLERRM;
  RAISE NOTICE 'DETAIL: %', SQLSTATE;
END $$;

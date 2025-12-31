-- ============================================================================
-- SIMULATE EXACT OAUTH USER CREATION
-- ============================================================================
-- This simulates what Supabase does when a user signs up via Google OAuth

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'oauth_test_' || substr(test_user_id::text, 1, 8) || '@gmail.com';
  v_error_detail TEXT;
  v_error_hint TEXT;
  v_error_context TEXT;
BEGIN
  RAISE NOTICE '=== Starting OAuth simulation ===';
  RAISE NOTICE 'Test user ID: %', test_user_id;
  RAISE NOTICE 'Test email: %', test_email;
  
  -- Simulate Google OAuth user creation
  -- This is what Supabase auth does internally
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    test_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    test_email,
    '', -- OAuth users don't have password
    NOW(), -- Email is pre-confirmed for OAuth
    jsonb_build_object(
      'provider', 'google',
      'providers', ARRAY['google']
    ),
    jsonb_build_object(
      'email', test_email,
      'email_verified', true,
      'name', 'Test OAuth User',
      'picture', 'https://example.com/avatar.jpg',
      'sub', 'google_' || test_user_id::text
    ),
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );
  
  RAISE NOTICE '✅ Auth user created successfully';
  RAISE NOTICE 'Waiting for trigger to execute...';
  
  -- Wait a moment for trigger
  PERFORM pg_sleep(0.5);
  
  -- Check if profile was created
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
    RAISE NOTICE '✅ Profile created successfully!';
    
    -- Show the created profile
    RAISE NOTICE 'Profile details:';
    PERFORM * FROM public.profiles WHERE id = test_user_id;
  ELSE
    RAISE NOTICE '❌ Profile was NOT created - trigger failed silently';
  END IF;
  
  -- Clean up
  DELETE FROM auth.users WHERE id = test_user_id;
  RAISE NOTICE '🧹 Cleaned up test user';
  
  RAISE NOTICE '=== OAuth simulation complete ===';
  
EXCEPTION 
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS 
      v_error_detail = PG_EXCEPTION_DETAIL,
      v_error_hint = PG_EXCEPTION_HINT,
      v_error_context = PG_EXCEPTION_CONTEXT;
    
    RAISE NOTICE '❌ ERROR OCCURRED:';
    RAISE NOTICE 'Message: %', SQLERRM;
    RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    RAISE NOTICE 'Detail: %', v_error_detail;
    RAISE NOTICE 'Hint: %', v_error_hint;
    RAISE NOTICE 'Context: %', v_error_context;
    
    -- Try to clean up
    BEGIN
      DELETE FROM auth.users WHERE id = test_user_id;
    EXCEPTION WHEN OTHERS THEN
      -- Ignore cleanup errors
    END;
END $$;

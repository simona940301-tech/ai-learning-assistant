-- ============================================================================
-- Check and Create Trigger Binding for handle_new_user
-- ============================================================================

-- 1. Check if trigger exists on auth.users
SELECT 
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users'
  AND trigger_name LIKE '%handle_new_user%';

-- 2. If no results above, create the trigger binding
-- (Run this only if step 1 returns no results)

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table,
  action_timing
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users';

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 
'Automatically creates a profile entry when a new user signs up via any auth method (email, OAuth, etc.)';

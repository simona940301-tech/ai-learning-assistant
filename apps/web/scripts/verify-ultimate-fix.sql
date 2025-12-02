-- ============================================================================
-- VERIFY ULTIMATE FIX INSTALLATION
-- ============================================================================

SELECT 
  p.proname as function_name,
  p.prosecdef as is_security_definer,
  p.proconfig as configuration, -- Should show search_path
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'handle_new_user';

-- Check permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'profiles'
  AND grantee = 'service_role';

-- Check what triggers already exist on auth.users
-- This is a read-only query so should work

SELECT 
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table,
  action_timing,
  action_statement,
  action_orientation,
  action_condition
FROM information_schema.triggers 
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users'
ORDER BY trigger_name;

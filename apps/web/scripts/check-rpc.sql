-- Check if calculate_current_energy exists
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'calculate_current_energy';

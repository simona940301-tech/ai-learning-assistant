# How to Run the Diagnostic Script

## Steps:

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy the contents of `apps/web/scripts/simulate-oauth.sql`
4. Paste into SQL Editor
5. Click "Run"
6. Share ALL the output messages with me

## What to look for:

The script will output messages like:
- `=== Starting OAuth simulation ===`
- `✅ Auth user created successfully`
- `✅ Profile created successfully!` (if it works)
- `❌ Profile was NOT created` (if trigger fails)
- `❌ ERROR OCCURRED:` (with full error details)

## Share with me:

Copy ALL the messages from the "Messages" tab in SQL Editor and paste them here.

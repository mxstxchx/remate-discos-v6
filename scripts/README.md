# Database Migration Scripts

This directory contains scripts for making database schema changes and updates.

## Standardizing Audit Logs

The `standardize_audit_logging.sql` script upgrades the audit logging system to use a standardized format that makes it easier to understand and trace the origin of each action.

### How to Apply

1. Login to Supabase Dashboard
2. Go to SQL Editor
3. Create a new query
4. Copy and paste the contents of `standardize_audit_logging.sql`
5. Run the script

### What It Does

1. Updates the `log_table_change` function to use the standardized `SOURCE_ACTION_ENTITY` format
2. Updates other database functions to use the new format
3. Migrates existing audit logs to the new format
4. Ensures all database triggers use the updated functions

### Verification

After running the script, you can verify it worked by checking the audit logs:

```sql
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;
```

All new actions should follow the pattern: `SOURCE_ACTION_ENTITY` (e.g., `ADMIN_MARK_SOLD_RECORD`, `SYSTEM_EXPIRE_RESERVATION`).

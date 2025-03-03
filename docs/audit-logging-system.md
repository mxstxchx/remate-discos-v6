# Audit Logging System

## Overview

The audit logging system in Remate Discos V6 records all significant actions in the application, providing a comprehensive history of changes to records, reservations, and user interactions. This document explains the standardized format for audit logs and how to interpret them.

## Audit Log Format

All audit log entries follow a standardized format for the `action` field:

```
{SOURCE}_{ACTION}_{ENTITY}
```

Where:
- **SOURCE**: Who/what initiated the action (SYSTEM, ADMIN, USER)
- **ACTION**: What was done (CREATE, UPDATE, DELETE, MARK_SOLD, EXPIRE, etc.)
- **ENTITY**: What was affected (RECORD, RESERVATION, QUEUE, SESSION, etc.)

## Common Audit Log Actions

### Admin Actions

| Action | Description |
|--------|-------------|
| `ADMIN_MARK_SOLD_RECORD` | Admin marked a record as sold |
| `ADMIN_EXPIRE_RESERVATION` | Admin manually expired a reservation |
| `ADMIN_TERMINATE_SESSION` | Admin terminated a user session |

### System Actions

| Action | Description |
|--------|-------------|
| `SYSTEM_EXPIRE_RESERVATION` | Reservation expired automatically due to time |
| `SYSTEM_CREATE_RESERVATION` | New reservation was created |
| `SYSTEM_UPDATE_RECORD` | Record details were updated |
| `SYSTEM_DELETE_QUEUE` | Queue entry was removed |

### User Actions

| Action | Description |
|--------|-------------|
| `USER_CREATE_RESERVATION` | User created a new reservation |
| `USER_JOIN_QUEUE` | User joined a queue for a record |
| `USER_CANCEL_RESERVATION` | User cancelled their reservation |

## Details Field

The `details` field in audit logs contains additional context about the action:

```json
{
  "old_data": {...},       // Previous state (for updates/deletes)
  "new_data": {...},       // New state (for creates/updates)
  "notes": "...",          // Admin notes (for admin actions)
  "timestamp": "...",      // When the action occurred
  "next_in_queue": "...",  // Next user in queue (for reservation expiry)
  "expired_user": "..."    // User whose reservation expired
}
```

## How to Interpret Reservation Events

### Time-based Automatic Expiration
1. `SYSTEM_EXPIRE_RESERVATION` - Logged with details including expiry time and next person in queue
2. `SYSTEM_DELETE_RESERVATION` - Follows the expiry action

### Admin-initiated Manual Expiration
1. `ADMIN_EXPIRE_RESERVATION` - Logged with details including admin who performed the action, reservation ID, expired user, and next person in queue
2. `SYSTEM_DELETE_RESERVATION` - Follows the expiry action (this is from the trigger)

### Record Marked as Sold (with existing reservation)
1. `ADMIN_MARK_SOLD_RECORD` - Logged when admin marks record as sold
2. `SYSTEM_DELETE_RESERVATION` - Follows the mark-sold action if there was an active reservation
3. `SYSTEM_DELETE_QUEUE` - Follows if there were users in queue
4. `SYSTEM_UPDATE_RECORD` - Updates the record with sold status

## Implementation Notes

The audit logging system uses three mechanisms to ensure comprehensive coverage:

1. **Database Triggers**: Automatically log all table changes
2. **Database Functions**: Log explicit administrative actions
3. **API Routes**: Provide additional context for user-initiated actions

## Querying Audit Logs

To find specific audit events, you can use these SQL queries:

```sql
-- Get all admin actions
SELECT * FROM audit_logs 
WHERE action LIKE 'ADMIN_%'
ORDER BY created_at DESC;

-- Get all reservation expirations
SELECT * FROM audit_logs 
WHERE action LIKE '%_EXPIRE_RESERVATION'
ORDER BY created_at DESC;

-- Track history of a specific record
SELECT * FROM audit_logs 
WHERE release_id = [RECORD_ID]
ORDER BY created_at DESC;
```

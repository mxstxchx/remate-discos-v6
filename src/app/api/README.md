# API Routes Documentation

## PostgREST Integration (`/api/postgrest/[...path]`)

Dynamic route handler for database operations via Supabase.

### Usage
```typescript
GET /api/postgrest/releases
GET /api/postgrest/releases?select=id,title
GET /api/postgrest/releases?order=created_at.desc
```

### Query Parameters
- `select`: Comma-separated column names
- `order`: Column and direction (e.g., created_at.desc)

### Response Format
```typescript
{
  data: Record[]  // Array of database records
  error?: string  // Optional error message
}
```

## SQL-to-REST Transformer (`/api/sql-to-rest`)

Converts SQL queries to PostgREST-compatible endpoints.

### Usage
```typescript
POST /api/sql-to-rest
{
  "sql": "SELECT * FROM releases WHERE id = 1"
}
```

### Response Format
```typescript
{
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string    // PostgREST-compatible path
}
```

### Supported SQL Operations
- SELECT with WHERE clauses
- ORDER BY statements
- LIMIT and OFFSET
- Simple JOIN operations
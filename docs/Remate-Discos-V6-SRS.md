# Remate Discos V6 - Software Requirements Specification

## Technical Architecture Overview

### Technology Stack
- Frontend: Next.js 14 with App Router
- Database: Supabase with PostgreSQL
- State Management: Zustand
- UI Components: shadcn/ui
- Styling: Tailwind CSS
- Type Safety: TypeScript
- Language Support: i18next
- Real-time Updates: Supabase Realtime


## Database Schema

### Core Tables

```sql
-- User identities with admin detection
CREATE TABLE users (
    alias text primary key,
    is_admin boolean default false,
    created_at timestamptz default now()
);

CREATE OR REPLACE FUNCTION set_admin_status()
RETURNS trigger AS $$
BEGIN
    NEW.is_admin = (NEW.alias = '_soyelputoamo_');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_admin_status
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_admin_status();

-- User sessions
CREATE TABLE sessions (
    id uuid primary key default gen_random_uuid(),
    user_alias text not null references users(alias),
    language text default 'es' check (language in ('es', 'en')),
    created_at timestamptz default now(),
    last_seen_at timestamptz default now(),
    expires_at timestamptz default now() + interval '30 days',
    metadata jsonb default '{}'::jsonb,
    CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Record catalog
CREATE TABLE releases (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    artists JSONB NOT NULL,
    labels JSONB NOT NULL,
    styles TEXT[] NOT NULL,
    year INTEGER,
    country TEXT,
    notes TEXT,
    condition TEXT NOT NULL CHECK (condition IN ('Mint', 'Near Mint', 'Very Good Plus', 'Very Good')),
    price DECIMAL NOT NULL CHECK (price >= 0),
    thumb TEXT,
    primary_image TEXT,
    secondary_image TEXT,
    videos JSONB,
    needs_audio BOOLEAN DEFAULT false,
    tracklist JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Cart items with real-time status
CREATE TABLE cart_items (
    id uuid primary key default gen_random_uuid(),
    user_alias text not null references users(alias),
    release_id integer references releases(id),
    added_at timestamptz default now(),
    status text check (status in ('AVAILABLE', 'RESERVED_BY_OTHERS', 'IN_QUEUE')),
    reserved_by text references users(alias),
    last_validated_at timestamptz default now(),
    CONSTRAINT unique_cart_item UNIQUE (user_alias, release_id)
);

-- Reservations management
CREATE TABLE reservations (
    id uuid primary key default gen_random_uuid(),
    release_id integer references releases(id),
    user_alias text references users(alias),
    status text check (status in ('RESERVED', 'SOLD')),
    reserved_at timestamptz default now(),
    expires_at timestamptz default now() + interval '7 days',
    created_at timestamptz default now(),
    UNIQUE (release_id),
    CONSTRAINT valid_reservation_expiry CHECK (expires_at > reserved_at)
);

-- Queue management
CREATE TABLE reservation_queue (
    id uuid primary key default gen_random_uuid(),
    release_id integer references releases(id),
    user_alias text references users(alias),
    queue_position integer not null,
    joined_at timestamptz default now(),
    UNIQUE (release_id, queue_position),
    CONSTRAINT valid_queue_position CHECK (queue_position > 0)
);

-- System audit logging
CREATE TABLE audit_logs (
    id uuid primary key default gen_random_uuid(),
    release_id integer references releases(id),
    user_alias text references users(alias),
    session_id uuid references sessions(id),
    action text not null,
    details jsonb,
    created_at timestamptz default now()
);
```

### Indexes and Constraints

```sql
-- Releases indexes
CREATE INDEX idx_releases_styles ON releases USING GIN (styles);
CREATE INDEX idx_releases_artists ON releases USING GIN ((artists->>'name'));
CREATE INDEX idx_releases_labels ON releases USING GIN ((labels->>'name'));
CREATE INDEX idx_releases_condition ON releases(condition);
CREATE INDEX idx_releases_price ON releases(price);

-- User indexes
CREATE INDEX idx_users_admin ON users(is_admin) WHERE is_admin = true;

-- Sessions indexes
CREATE INDEX idx_sessions_user_alias ON sessions(user_alias);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Cart indexes
CREATE INDEX idx_cart_items_user_alias ON cart_items(user_alias);
CREATE INDEX idx_cart_items_status ON cart_items(status);
CREATE INDEX idx_cart_items_last_validated ON cart_items(last_validated_at);

-- Reservation indexes
CREATE INDEX idx_reservations_user_alias ON reservations(user_alias);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_expires_at ON reservations(expires_at);

-- Queue indexes
CREATE INDEX idx_queue_release_id ON reservation_queue(release_id);
CREATE INDEX idx_queue_position ON reservation_queue(queue_position);
```

[Rest of SRS.md content remains unchanged]
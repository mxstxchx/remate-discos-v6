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
-- User identities
CREATE TABLE users (
    alias text primary key,
    is_admin boolean default false,
    created_at timestamptz default now()
);

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

### Database Functions and Triggers

```sql
-- Update timestamps for releases
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_releases_timestamp
    BEFORE UPDATE ON releases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Session cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM sessions 
    WHERE expires_at < now();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER session_cleanup
    AFTER INSERT OR UPDATE ON sessions
    EXECUTE FUNCTION cleanup_expired_sessions();

-- Cart validation trigger
CREATE OR REPLACE FUNCTION validate_cart_item()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if item is reserved
    IF EXISTS (
        SELECT 1 FROM reservations 
        WHERE release_id = NEW.release_id 
        AND status = 'RESERVED'
    ) THEN
        NEW.status = 'RESERVED_BY_OTHERS';
    ELSE
        NEW.status = 'AVAILABLE';
    END IF;
    
    NEW.last_validated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cart_item_validation
    BEFORE INSERT OR UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_cart_item();

-- Queue management
CREATE OR REPLACE FUNCTION update_queue_positions()
RETURNS TRIGGER AS $$
BEGIN
    -- Reorder queue positions when an item is removed
    UPDATE reservation_queue
    SET queue_position = queue_position - 1
    WHERE release_id = OLD.release_id
    AND queue_position > OLD.queue_position;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintain_queue_order
    AFTER DELETE ON reservation_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_queue_positions();

-- Reservation expiry handling
CREATE OR REPLACE FUNCTION handle_reservation_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at < now() THEN
        -- Move to next in queue if exists
        WITH next_in_queue AS (
            DELETE FROM reservation_queue
            WHERE release_id = OLD.release_id
            AND queue_position = 1
            RETURNING user_alias
        )
        INSERT INTO reservations (release_id, user_alias, status, expires_at)
        SELECT OLD.release_id, user_alias, 'RESERVED', now() + interval '7 days'
        FROM next_in_queue;
        
        -- Log the expiry
        INSERT INTO audit_logs (release_id, user_alias, action, details)
        VALUES (
            OLD.release_id,
            OLD.user_alias,
            'RESERVATION_EXPIRED',
            jsonb_build_object(
                'expires_at', OLD.expires_at,
                'next_in_queue', (
                    SELECT user_alias FROM reservation_queue 
                    WHERE release_id = OLD.release_id 
                    AND queue_position = 1
                )
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_expired_reservations
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION handle_reservation_expiry();
```

## Frontend Implementation

### State Management

```typescript
// src/store/index.ts
import create from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface StoreState {
    cart: Record<string, CartItem>;
    filters: FilterState;
    view: 'grid' | 'list';
    language: 'en' | 'es';
    setFilter: (type: keyof FilterState, values: string[]) => void;
    addToCart: (item: CartItem) => void;
    removeFromCart: (id: string) => void;
    updateCartItemStatus: (id: string, status: ItemStatus) => void;
    setView: (view: 'grid' | 'list') => void;
    setLanguage: (lang: 'en' | 'es') => void;
}

const useStore = create<StoreState>()(
    devtools(
        persist(
            (set) => ({
                cart: {},
                filters: {
                    artists: [],
                    labels: [],
                    styles: []
                },
                view: 'grid',
                language: 'es',
                setFilter: (type, values) =>
                    set((state) => ({
                        filters: { ...state.filters, [type]: values }
                    })),
                addToCart: (item) =>
                    set((state) => ({
                        cart: { ...state.cart, [item.id]: item }
                    })),
                removeFromCart: (id) =>
                    set((state) => {
                        const { [id]: removed, ...cart } = state.cart;
                        return { cart };
                    }),
                updateCartItemStatus: (id, status) =>
                    set((state) => ({
                        cart: {
                            ...state.cart,
                            [id]: { ...state.cart[id], status }
                        }
                    })),
                setView: (view) => set({ view }),
                setLanguage: (language) => set({ language })
            }),
            {
                name: 'remate-discos-storage',
                partialize: (state) => ({
                    view: state.view,
                    language: state.language
                })
            }
        )
    )
)

export default useStore
```

### Real-time Status Management

```typescript
// src/lib/status.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useState, useEffect } from 'react'

export function useRecordStatus(releaseId: number) {
    const [status, setStatus] = useState<RecordStatus | null>(null)
    const supabase = createClientComponentClient()
    
    useEffect(() => {
        // Initial status fetch
        fetchStatus(releaseId).then(setStatus)
        
        // Subscribe to critical changes
        const statusSub = supabase
            .channel(`status-${releaseId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'reservations',
                filter: `release_id=eq.${releaseId}`
            }, async (payload) => {
                const newStatus = await fetchStatus(releaseId)
                setStatus(newStatus)
            })
            .subscribe()
            
        // Background validation
        const validationInterval = setInterval(async () => {
            const validated = await validateStatus(releaseId)
            setStatus(validated)
        }, 300000) // 5 minutes
        
        return () => {
            statusSub.unsubscribe()
            clearInterval(validationInterval)
        }
    }, [releaseId])
    
    return status
}

export function useQueuePosition(releaseId: number, userAlias: string) {
    const [position, setPosition] = useState<number | null>(null)
    
    useEffect(() => {
        // Initial position fetch
        fetchQueuePosition(releaseId, userAlias).then(setPosition)
        
        // Poll for updates
        const pollInterval = setInterval(async () => {
            const newPosition = await fetchQueuePosition(releaseId, userAlias)
            setPosition(newPosition)
        }, 30000) // 30 seconds
        
        return () => clearInterval(pollInterval)
    }, [releaseId, userAlias])
    
    return position
}
```

### Session Management

```typescript
// src/lib/auth.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useState, useEffect } from 'react'

export function useAuth() {
    const supabase = createClientComponentClient()
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    
    useEffect(() => {
        const getSession = async () => {
            try {
                const { data, error } = await supabase
                    .from('sessions')
                    .select('*')
                    .single()
                
                if (error) throw error
                setSession(data)
            } catch (error) {
                console.error('Error fetching session:', error)
            } finally {
                setLoading(false)
            }
        }
        
        getSession()
        
        const { data: { subscription } } = supabase.auth
            .onAuthStateChange((event, session) => {
                console.log('Auth state changed:', event)
                setSession(session)
            })
            
        return () => subscription.unsubscribe()
    }, [])
    
    const signIn = async (alias: string) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .upsert({ alias })
                .select()
                .single()
                
            if (error) throw error
            
            const sessionData = {
                user_alias: alias,
                language: 'es',
                metadata: {}
            }
            
            const { error: sessionError } = await supabase
                .from('sessions')
                .insert([sessionData])
                
            if (sessionError) throw sessionError
            
            return { success: true }
        } catch (error) {
            console.error('Error signing in:', error)
            return { success: false, error }
        }
    }
    
    return { session, loading, signIn }
}
```

### Cart Management

```typescript
// src/lib/cart.ts
export async function addToCart(releaseId: number, userAlias: string) {
    const supabase = createClientComponentClient()
    
    try {
        // Optimistic update
        useStore.getState().addToCart({
            id: releaseId,
            status: 'AVAILABLE',
            addedAt: new Date().toISOString()
        })
        
        const { data, error } = await supabase
            .from('cart_items')
            .insert([{
                release_id: releaseId,
                user_alias: userAlias
            }])
            .select()
            .single()
            
        if (error) throw error
        return { success: true, data }
    } 
    catch (error) {
        // Revert optimistic update
        useStore.getState().removeFromCart(releaseId)
        console.error('Error adding to cart:', error)
        return { success: false, error }
    }
}

export async function validateCart(userAlias: string) {
    const supabase = createClientComponentClient()
    
    try {
        // Get all cart items for user
        const { data: cartItems, error } = await supabase
            .from('cart_items')
            .select(`
                *,
                releases (*),
                reservations (*)
            `)
            .eq('user_alias', userAlias)
            
        if (error) throw error
        
        // Process each item's current status
        const validatedItems = await Promise.all(
            cartItems.map(async (item) => {
                const status = await checkItemAvailability(item.release_id)
                return {
                    ...item,
                    status,
                    lastValidated: new Date().toISOString()
                }
            })
        )
        
        // Batch update all items
        const { error: updateError } = await supabase
            .from('cart_items')
            .upsert(validatedItems)
            
        if (updateError) throw updateError
        
        return { success: true, items: validatedItems }
    } catch (error) {
        console.error('Error validating cart:', error)
        return { success: false, error }
    }
}

export async function checkout(userAlias: string) {
    const supabase = createClientComponentClient()
    
    try {
        // Start transaction
        const { data: cartItems } = await supabase
            .from('cart_items')
            .select('*')
            .eq('user_alias', userAlias)
            
        const results = await Promise.all(
            cartItems.map(async (item) => {
                try {
                    // Attempt reservation
                    const { data, error } = await supabase
                        .from('reservations')
                        .insert([{
                            release_id: item.release_id,
                            user_alias: userAlias
                        }])
                        .select()
                        .single()
                        
                    if (error) {
                        // If already reserved, attempt to join queue
                        return await joinQueue(item.release_id, userAlias)
                    }
                    
                    return { success: true, type: 'reservation', data }
                } catch (error) {
                    return { success: false, error }
                }
            })
        )
        
        // Clear successful items from cart
        const successfulItems = results
            .filter(r => r.success)
            .map(r => r.data.release_id)
            
        if (successfulItems.length > 0) {
            await supabase
                .from('cart_items')
                .delete()
                .in('release_id', successfulItems)
        }
        
        return { success: true, results }
    } catch (error) {
        console.error('Error during checkout:', error)
        return { success: false, error }
    }
}
```

### Component Implementations

```typescript
// src/components/record-card.tsx
export function RecordCard({ record }: { record: Release }) {
    const status = useRecordStatus(record.id)
    const { userAlias } = useAuth()
    const [loading, setLoading] = useState(false)
    
    const handleAction = async () => {
        setLoading(true)
        try {
            if (!status) return
            
            switch (status.type) {
                case 'AVAILABLE':
                    await addToCart(record.id, userAlias)
                    break
                case 'RESERVED':
                    await joinQueue(record.id, userAlias)
                    break
                // ... other status handlers
            }
        } catch (error) {
            console.error('Action failed:', error)
        } finally {
            setLoading(false)
        }
    }
    
    return (
        <Card className="record-card">
            <CardHeader>
                <CardTitle>{record.title}</CardTitle>
                <CardDescription>{record.artists[0].name}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="aspect-square relative">
                    <Image
                        src={record.primary_image}
                        alt={record.title}
                        fill
                        className="object-cover"
                    />
                    <StatusBadge status={status} />
                </div>
            </CardContent>
            <CardFooter>
                <div className="flex justify-between w-full">
                    <Price amount={record.price} />
                    <ActionButton
                        status={status}
                        loading={loading}
                        onClick={handleAction}
                    />
                </div>
            </CardFooter>
        </Card>
    )
}
```

### Theme Configuration

```typescript
// tailwind.config.ts
export default {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#CFB53B',
                    dark: '#A69329'
                },
                background: '#1A1A1A',
                foreground: '#FFFFFF',
                muted: {
                    DEFAULT: '#2A2A2A',
                    foreground: '#A3A3A3'
                },
                border: '#262626'
            }
        }
    }
}

// src/styles/theme.ts
export const theme = {
    dark: {
        colors: {
            background: '#171717',
            card: '#1A1A1A',
            border: '#262626',
            primary: '#CFB53B',
            primaryDark: '#A69329',
            muted: '#404040',
            text: {
                primary: '#FFFFFF',
                secondary: '#A3A3A3',
                muted: '#737373'
            },
            status: {
                success: '#34C759',
                error: '#FF3B30',
                info: '#007AFF'
            }
        }
    }
}
```

### Error Handling

```typescript
// src/lib/errors.ts
export class ValidationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ValidationError'
    }
}

export class ReservationError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ReservationError'
    }
}

export function handleError(error: unknown): string {
    if (error instanceof ValidationError) {
        return error.message
    }
    if (error instanceof ReservationError) {
        return error.message
    }
    if (error instanceof Error) {
        return 'An unexpected error occurred. Please try again.'
    }
    return 'Something went wrong. Please try again.'
}
```

### Deployment Configuration

```typescript
// next.config.ts
export default {
    env: {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
    },
    images: {
        domains: ['i.discogs.com'],
        formats: ['image/avif', 'image/webp']
    },
    experimental: {
        serverActions: true
    }
}
```



# Remate Discos V6 - Technical Architecture Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Database Structure](#database-structure)
5. [State Management](#state-management)
6. [Authentication System](#authentication-system)
7. [Status Management](#status-management)
8. [Cart and Reservation System](#cart-and-reservation-system)
9. [Admin Dashboard](#admin-dashboard)
10. [Performance Optimizations](#performance-optimizations)

## Project Overview

Remate Discos V6 is a specialized e-commerce platform designed for selling a curated vinyl record collection. Unlike traditional e-commerce systems, it focuses on an exclusive shopping experience with fair reservation and queue management. The application is built for a local community of collectors, featuring a reservation-based purchase system rather than traditional checkout.

Key features include:
- Record browsing with advanced filtering
- Status-aware action system (available, reserved, in queue, sold)
- Reservation management with automatic expiry
- Queue system for reserved records
- Admin dashboard for inventory management
- Real-time status updates across all connected devices

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **UI Components**: shadcn/ui with custom Tailwind theme
- **State Management**: Zustand with persist middleware
- **Styling**: Tailwind CSS with dark theme optimized for vinyl collectors
- **Type Safety**: TypeScript
- **Internationalization**: i18next with ES/EN support

### Backend
- **Database**: Supabase with PostgreSQL
- **Authentication**: Custom alias-based session system
- **Real-time**: Supabase Realtime subscriptions
- **Media Storage**: External URLs with Next.js Image optimization
- **API**: Next.js Route Handlers with Supabase client

### Build/Deployment
- **Environment**: Local development with production deployment
- **Image Optimization**: Next.js Image with external domains
- **Experimental Features**: Server Actions for form submissions

## Architecture Overview

The application follows a hybrid architecture combining client and server components:

### Client-Server Model
- **Server Components**: Handle data fetching and initial rendering
- **Client Components**: Handle interactivity and state updates
- **API Routes**: Provide data access and mutation endpoints

### Data Flow
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Next.js App   │◄────┤  API Endpoints  │◄────┤    Database     │
│  (React + SSR)  │     │  (Route APIs)   │     │   (Supabase)    │
│                 │     │                 │     │                 │
└────────┬────────┘     └─────────────────┘     └─────────┬───────┘
         │                                                │
         │                                                │
         │                                                │
         ▼                                                ▼
┌─────────────────┐                             ┌─────────────────┐
│                 │                             │                 │
│  Global State   │◄─────────────────────────►─┤ Real-time Events │
│    (Zustand)    │                             │   (Supabase)    │
│                 │                             │                 │
└─────────────────┘                             └─────────────────┘
```

### Component Hierarchy
- `RootLayout`: Global providers and theme
- `PageLayout`: Navigation and content structure
- `BrowsePage`: Main record catalog view
- `RecordDetailPage`: Individual record view
- `AdminLayout`: Admin-specific layout and navigation
- Various Components: RecordCard, ActionButton, etc.

## Database Structure

### Core Tables

#### User Identity
```sql
CREATE TABLE users (
    alias text primary key,
    is_admin boolean default false,
    created_at timestamptz default now()
);

CREATE TABLE sessions (
    id uuid primary key default gen_random_uuid(),
    user_alias text not null references users(alias),
    language text default 'es' check (language in ('es', 'en')),
    created_at timestamptz default now(),
    last_seen_at timestamptz default now(),
    expires_at timestamptz default now() + interval '30 days',
    metadata jsonb default '{}'::jsonb
);
```

#### Record Catalog
```sql
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
    updated_at TIMESTAMPTZ DEFAULT now(),
    sold_at TIMESTAMPTZ DEFAULT NULL,
    sold_by TEXT DEFAULT NULL,
    admin_notes TEXT DEFAULT NULL,
    visibility BOOLEAN DEFAULT TRUE
);
```

#### Transaction System
```sql
CREATE TABLE cart_items (
    id uuid primary key default gen_random_uuid(),
    user_alias text not null references users(alias),
    release_id integer references releases(id),
    added_at timestamptz default now(),
    status text check (status in ('AVAILABLE', 'RESERVED_BY_OTHERS', 'IN_QUEUE')),
    reserved_by text references users(alias),
    last_validated_at timestamptz default now()
);

CREATE TABLE reservations (
    id uuid primary key default gen_random_uuid(),
    release_id integer references releases(id),
    user_alias text references users(alias),
    status text check (status in ('RESERVED', 'SOLD')),
    reserved_at timestamptz default now(),
    expires_at timestamptz default now() + interval '7 days',
    created_at timestamptz default now()
);

CREATE TABLE reservation_queue (
    id uuid primary key default gen_random_uuid(),
    release_id integer references releases(id),
    user_alias text references users(alias),
    queue_position integer not null,
    joined_at timestamptz default now()
);
```

#### Audit System
```sql
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

### Key Database Functions

#### Status Management
```sql
-- Get record statuses efficiently
CREATE OR REPLACE FUNCTION get_record_statuses(p_user_alias text DEFAULT NULL)
RETURNS TABLE (
    release_id integer,
    status text,
    reservation_status text,
    reservation_user text,
    queue_position integer,
    in_cart boolean
) AS $$
BEGIN
    RETURN QUERY
    WITH sold_records AS (
        SELECT id, 'SOLD'::text AS status
        FROM releases
        WHERE sold_at IS NOT NULL
    ),
    reserved_records AS (
        SELECT r.release_id, 'RESERVED'::text AS status, r.user_alias
        FROM reservations r
        WHERE r.status = 'RESERVED'
    ),
    queue_positions AS (
        SELECT q.release_id, q.queue_position, q.user_alias
        FROM reservation_queue q
        WHERE p_user_alias IS NULL OR q.user_alias = p_user_alias
    ),
    cart_items AS (
        SELECT c.release_id, c.user_alias
        FROM cart_items c
        WHERE p_user_alias IS NULL OR c.user_alias = p_user_alias
    )
    SELECT
        r.id,
        COALESCE(
            s.status,
            CASE
                WHEN res.release_id IS NOT NULL AND (p_user_alias IS NULL OR res.user_alias = p_user_alias) THEN 'RESERVED'
                WHEN res.release_id IS NOT NULL THEN 'RESERVED_BY_OTHERS'
                ELSE 'AVAILABLE'
            END
        ),
        res.status,
        res.user_alias,
        q.queue_position,
        CASE WHEN c.release_id IS NOT NULL THEN TRUE ELSE FALSE END
    FROM
        releases r
        LEFT JOIN sold_records s ON r.id = s.id
        LEFT JOIN reserved_records res ON r.id = res.release_id
        LEFT JOIN queue_positions q ON r.id = q.release_id
        LEFT JOIN cart_items c ON r.id = c.release_id
    WHERE
        r.visibility = TRUE OR p_user_alias IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
```

#### Admin Functions
```sql
-- Mark record as sold
CREATE OR REPLACE FUNCTION mark_record_as_sold(
    p_release_id integer,
    p_admin_alias text,
    p_notes text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
  -- First, log the action before making changes
  INSERT INTO audit_logs (
      release_id,
      user_alias,
      action,
      details
  ) VALUES (
      p_release_id,
      p_admin_alias,
      'MARKED_AS_SOLD',
      jsonb_build_object(
          'notes', p_notes,
          'timestamp', now()
      )
  );

  -- Use dynamic SQL to delete safely
  EXECUTE 'DELETE FROM reservations WHERE release_id = $1' USING p_release_id;
  EXECUTE 'DELETE FROM reservation_queue WHERE release_id = $1' USING p_release_id;
  
  -- Update release with visibility field
  UPDATE releases
  SET 
    sold_at = now(),
    sold_by = p_admin_alias,
    admin_notes = COALESCE(p_notes, admin_notes),
    visibility = FALSE
  WHERE id = p_release_id;
END;
$function$;

-- Admin expire reservation
CREATE OR REPLACE FUNCTION admin_expire_reservation(
    p_reservation_id uuid,
    p_admin_alias text
)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    r_release_id INTEGER;
    r_user_alias TEXT;
    next_user TEXT;
    next_queue_id UUID;
BEGIN
    -- Get reservation data
    SELECT release_id, user_alias INTO r_release_id, r_user_alias
    FROM reservations
    WHERE id = p_reservation_id
    AND status = 'RESERVED';
    
    -- Exit if not found
    IF r_release_id IS NULL THEN
        RAISE EXCEPTION 'Reservation not found or not in RESERVED status';
    END IF;
    
    -- Find next in queue
    SELECT id, user_alias INTO next_queue_id, next_user
    FROM reservation_queue
    WHERE release_id = r_release_id
    AND queue_position = 1
    LIMIT 1;
    
    -- Log the operation
    INSERT INTO audit_logs (release_id, user_alias, action, details)
    VALUES (
        r_release_id,
        p_admin_alias,
        'EXPIRE_RESERVATION_ADMIN',
        jsonb_build_object(
            'reservation_id', p_reservation_id,
            'expired_user', r_user_alias,
            'next_in_queue', next_user
        )
    );
    
    -- Delete current reservation with dynamic SQL
    EXECUTE 'DELETE FROM reservations WHERE id = $1' USING p_reservation_id;
    
    -- Promote next in queue if exists
    IF next_user IS NOT NULL THEN
        EXECUTE 'DELETE FROM reservation_queue WHERE id = $1' USING next_queue_id;
        
        EXECUTE 'UPDATE reservation_queue
                 SET queue_position = queue_position - 1
                 WHERE release_id = $1 AND queue_position > 1' 
        USING r_release_id;
        
        INSERT INTO reservations (release_id, user_alias, status, expires_at)
        VALUES (r_release_id, next_user, 'RESERVED', now() + interval '7 days');
    END IF;
END;
$function$;
```

#### Triggers
```sql
-- Trigger to handle reservation expiry
CREATE TRIGGER handle_reservation_expiry
BEFORE UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION process_expired_reservations();

-- Trigger to maintain queue order
CREATE TRIGGER maintain_queue_positions
AFTER DELETE ON reservation_queue
FOR EACH ROW
EXECUTE FUNCTION update_queue_positions();

-- Audit log trigger for changes
CREATE TRIGGER log_reservation_changes
AFTER INSERT OR DELETE ON reservations
FOR EACH ROW EXECUTE FUNCTION log_table_change();
```

## State Management

The application uses Zustand for state management with the following structure:

### Store Organization

```typescript
// Global store
interface Store {
  // Authentication state
  session: Session | null;
  language: 'es' | 'en';
  
  // View preferences
  viewPreference: 'grid' | 'list';
  
  // Record data
  releases: Release[];
  loading: boolean;
  error: string | null;
  totalPages: number;
  currentPage: number;
  scrollPosition: number;
  
  // Cart state
  cartItems: CartItem[];
  
  // Status tracking
  recordStatuses: Record<number, RecordStatus>;
  statusLastFetched: string | null;
  
  // Admin state
  admin: AdminState;
  
  // Actions
  setSession: (session: Session | null) => void;
  setLanguage: (language: 'es' | 'en') => void;
  // ... more actions
  
  // Status actions
  updateRecordStatuses: (statuses: Record<number, RecordStatus>) => void;
  updateSingleStatus: (recordId: number, status: RecordStatus) => void;
  clearAllStatuses: () => void;
}
```

### Status Management in Store

The store uses smart update strategies for status management:

```typescript
// Complete vs partial updates
updateRecordStatuses: (statuses) => {
  const currentStatuses = get().recordStatuses;
  
  // Different strategy based on update size
  if (Object.keys(statuses).length > 10) {
    // For large updates, replace everything
    set({
      recordStatuses: statuses,
      statusLastFetched: new Date().toISOString()
    });
  } else {
    // For small updates, merge with existing
    set({
      recordStatuses: { ...currentStatuses, ...statuses },
      statusLastFetched: new Date().toISOString()
    });
  }
}
```

### Persistence

The store uses Zustand's persist middleware to maintain state across page reloads:

```typescript
persist(
  (set, get) => ({
    // store implementation
  }),
  {
    name: 'remate-discos-storage',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({
      language: state.language,
      viewPreference: state.viewPreference,
      session: state.session,
      cartItems: state.cartItems
    })
  }
)
```

## Authentication System

The application uses a custom alias-based authentication system without passwords:

### Session Management

- **User Identification**: Based on unique aliases rather than email/password
- **Session Storage**: Managed in `sessions` table with expiry dates
- **Admin Detection**: Special alias (`_soyelputoamo_`) triggers admin privileges
- **Multi-session Support**: Multiple active sessions per user alias allowed

### Authentication Flow

1. User enters alias in auth modal
2. System upserts user record and creates session
3. Session includes metadata (admin status, language preference)
4. Global status is refreshed to get user-specific data
5. Cart items are loaded for the user
6. Admin users are redirected to admin dashboard

```typescript
// Sign in process
const signIn = async (alias: string, language: 'es' | 'en') => {
  // Upsert user
  await supabase.from('users').upsert({ alias });
  
  // Fetch complete user data
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('alias', alias)
    .single();
  
  // Create session with metadata
  const { data: session } = await supabase
    .from('sessions')
    .insert([{
      user_alias: alias,
      language,
      metadata: {
        is_admin: userData.is_admin,
        language
      }
    }])
    .select()
    .single();
  
  // Set session in store
  setSession(session);
  
  // Load cart items & refresh statuses
  await loadUserData(alias);
  
  // Redirect admin users
  if (userData?.is_admin) {
    router.push('/admin');
  }
};
```

## Status Management System

The status management system is a cornerstone of the application, providing real-time tracking of record availability across all connected clients.

### Status Data Model

The status information is modeled through several TypeScript interfaces:

```typescript
// Base status interface
interface RecordStatus {
  cartStatus: CartItemStatus; // 'AVAILABLE' | 'RESERVED' | 'RESERVED_BY_OTHERS' | 'IN_QUEUE' | 'IN_CART' | 'SOLD'
  reservation: {
    status: ReservationStatus | null; // 'RESERVED' | 'SOLD'
    user_alias: string | null;
  } | null;
  queuePosition?: number;
  inCart: boolean;
  lastValidated: string;
  visibility?: boolean;
  soldAt?: string;
  soldBy?: string;
}

// Status as returned from database function
interface DatabaseRecordStatus {
  release_id: number;
  status: string;
  reservation_status: string | null;
  reservation_user: string | null;
  queue_position: number | null;
  in_cart: boolean;
}

// Status with UI state derived properties
interface RecordUIState {
  isReservedByMe: boolean;
  canAddToCart: boolean;
  canJoinQueue: boolean;
  showQueuePosition: boolean;
  isVisibleToUser: boolean;
}
```

When the system processes status updates, it transforms database-level status into the frontend `RecordStatus` model, which is then used by UI components to determine appropriate actions and displays.

### Global Status Management

The global status management is implemented through a centralized hook (`useGlobalStatus`) that provides a single point of entry for status operations:

```typescript
export function useGlobalStatus() {
  // Module-level state tracking to prevent duplicate loading
  const [initialLoaded, setInitialLoaded] = useState(globalInitMap.initialLoadComplete);
  const [userLoaded, setUserLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hookId = useRef(`hook_${Math.random().toString(36).substr(2, 9)}`);
  
  // Supabase client and store access
  const supabase = createClientComponentClient();
  const session = useSession();
  const updateRecordStatuses = useStore(state => state.updateRecordStatuses);
  
  // Initial load - all records visible to the public
  useEffect(() => {
    const loadInitialStatuses = async () => {
      if (initialLoaded || globalInitMap.initialLoadStarted) return;
      
      // Set flags to prevent duplicate loading
      globalInitMap.initialLoadStarted = true;
      globalInitMap.isLoading = true;
      
      try {
        const response = await fetch('/api/status');
        const { statusMap, count } = await response.json();
        
        console.log(`[GLOBAL_STATUS] Loaded ${count} initial statuses`);
        updateRecordStatuses(statusMap);
        
        setInitialLoaded(true);
        globalInitMap.initialLoadComplete = true;
        setLastUpdated(new Date());
      } catch (error) {
        console.error('[GLOBAL_STATUS] Failed to load initial statuses:', error);
        globalInitMap.initialLoadStarted = false;
      } finally {
        globalInitMap.isLoading = false;
        setIsLoading(false);
      }
    };
    
    loadInitialStatuses();
  }, [initialLoaded, updateRecordStatuses]);
  
  // User-specific load - records with user context (cart, reservations, queue)
  useEffect(() => {
    const loadUserStatuses = async () => {
      if (!session?.user_alias || userLoaded || globalInitMap.loadRequested[session.user_alias]) return;
      
      globalInitMap.loadRequested[session.user_alias] = true;
      setIsLoading(true);
      
      try {
        const response = await fetch(`/api/status?user_alias=${encodeURIComponent(session.user_alias)}`);
        const { statusMap, count } = await response.json();
        
        console.log(`[GLOBAL_STATUS] Loaded ${count} user-specific statuses`);
        updateRecordStatuses(statusMap);
        
        setUserLoaded(true);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('[GLOBAL_STATUS] Failed to load user statuses:', error);
        delete globalInitMap.loadRequested[session.user_alias];
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserStatuses();
  }, [session?.user_alias, userLoaded, updateRecordStatuses]);
  
  // Real-time subscription to audit logs
  useEffect(() => {
    if (!initialLoaded) return;
    
    const subscription = supabase
      .channel('status-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        (payload) => {
          const releaseId = payload.new?.release_id;
          if (releaseId) {
            // Extract action details from audit log
            const action = payload.new?.action;
            console.log(`[GLOBAL_STATUS] Status change detected: ${action} for record ${releaseId}`);
            
            // Selectively refresh the affected record status
            fetch(`/api/status/single?release_id=${releaseId}${
              session?.user_alias ? `&user_alias=${encodeURIComponent(session.user_alias)}` : ''
            }`)
              .then(res => res.json())
              .then(({ status }) => {
                if (status) {
                  updateRecordStatuses({ [releaseId]: status });
                  setLastUpdated(new Date());
                }
              })
              .catch(err => console.error('[GLOBAL_STATUS] Error updating status:', err));
          }
        })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [initialLoaded, session?.user_alias, updateRecordStatuses, supabase]);

  // Manual refresh functions
  const refreshAllStatuses = async () => {
    // Full refresh implementation
  };

  const refreshSingleStatus = async (releaseId: number) => {
    // Single record refresh implementation
  };
  
  return {
    isLoading,
    lastUpdated,
    initialLoaded,
    userLoaded,
    refreshAllStatuses,
    refreshSingleStatus
  };
}
```

This hook is initialized at the application level in `src/app/providers.tsx` to ensure a single instance:

```typescript
export function Providers({ children }: { children: ReactNode }) {
  // Initialize global status management
  useGlobalStatus();
  
  return (
    <ThemeProvider attribute="class" defaultTheme="dark">
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
```

### Status API Endpoints

Two key API endpoints support the status system:

#### 1. Bulk Status API (`/api/status/route.ts`)

This endpoint retrieves all record statuses in a single call, with optional user context:

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userAlias = searchParams.get('user_alias');
  
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  try {
    // First get sold records directly for accuracy
    const { data: soldRecords } = await supabase
      .from('releases')
      .select('id, sold_at, sold_by')
      .not('sold_at', 'is', null);
      
    // Create map of sold records
    const soldMap = {};
    soldRecords?.forEach(record => {
      soldMap[record.id] = {
        cartStatus: 'SOLD',
        reservation: null,
        soldAt: record.sold_at,
        soldBy: record.sold_by,
        lastValidated: new Date().toISOString()
      };
    });
    
    // Get other statuses using dedicated function
    const { data, error } = await supabase.rpc(
      'get_record_statuses',
      { p_user_alias: userAlias }
    );
    
    if (error) throw error;
    
    // Merge and transform status data
    const statusMap = { 
      ...soldMap, 
      ...data.reduce((acc, item) => {
        // Don't override sold status
        if (!soldMap[item.release_id]) {
          acc[item.release_id] = {
            cartStatus: item.status,
            reservation: item.reservation_status ? {
              status: item.reservation_status,
              user_alias: item.reservation_user
            } : null,
            queuePosition: item.queue_position,
            inCart: item.in_cart,
            lastValidated: new Date().toISOString()
          };
        }
        return acc;
      }, {})
    };
    
    return NextResponse.json({ 
      statusMap, 
      error: null,
      count: Object.keys(statusMap).length
    });
  } catch (error) {
    console.error('[API:STATUS] Error fetching statuses:', error);
    return NextResponse.json(
      { statusMap: null, error: 'Failed to fetch statuses' },
      { status: 500 }
    );
  }
}
```

#### 2. Single Status API (`/api/status/single/route.ts`)

This endpoint retrieves the status for a specific record, used for real-time updates:

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const releaseId = searchParams.get('release_id');
  const userAlias = searchParams.get('user_alias');
  
  if (!releaseId) {
    return NextResponse.json(
      { status: null, error: 'Release ID is required' },
      { status: 400 }
    );
  }
  
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  try {
    // First, explicitly check if the record is sold
    const { data: releaseData } = await supabase
      .from('releases')
      .select('sold_at, sold_by, visibility')
      .eq('id', parseInt(releaseId))
      .maybeSingle();
      
    // If sold, return that status immediately
    if (releaseData?.sold_at) {
      return NextResponse.json({
        status: {
          cartStatus: 'SOLD',
          reservation: null,
          queuePosition: null,
          inCart: false,
          lastValidated: new Date().toISOString(),
          soldAt: releaseData.sold_at,
          soldBy: releaseData.sold_by,
          visibility: releaseData.visibility
        },
        error: null
      });
    }
    
    // Get status details from function
    const { data } = await supabase.rpc(
      'get_record_statuses',
      { p_user_alias: userAlias }
    ).eq('release_id', parseInt(releaseId));
    
    // No data? Return default available status
    if (!data || data.length === 0) {
      return NextResponse.json({
        status: {
          cartStatus: 'AVAILABLE',
          reservation: null,
          queuePosition: null,
          inCart: false,
          lastValidated: new Date().toISOString(),
          visibility: releaseData?.visibility
        },
        error: null
      });
    }
    
    // Return full status object
    const status = {
      cartStatus: data[0].status,
      reservation: data[0].reservation_status ? {
        status: data[0].reservation_status,
        user_alias: data[0].reservation_user
      } : null,
      queuePosition: data[0].queue_position,
      inCart: data[0].in_cart,
      lastValidated: new Date().toISOString(),
      visibility: releaseData?.visibility
    };
    
    return NextResponse.json({ status, error: null });
  } catch (error) {
    console.error('[API:SINGLE] Error fetching status:', error);
    return NextResponse.json(
      { status: null, error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
```

### Status-Aware UI Components

Several components consume and interact with the status system:

#### ActionButton Component

The ActionButton is a critical UI element that adapts its appearance and behavior based on the current record status:

```typescript
export const ActionButton = memo(function ActionButton({
  recordId,
  status,
  onAddToCart,
  onJoinQueue,
  onLeaveQueue,
  recordTitle,
  className = ''
}: ActionButtonProps) {
  const session = useSession();
  const [showExitModal, setShowExitModal] = useState(false);
  const [isHoveringQueue, setIsHoveringQueue] = useState(false);

  // Status determination logic with queue position prioritization
  const currentStatus = useMemo(() => {
    if (!status) return 'AVAILABLE';
    
    // Priority 1: Check for queue position
    if (status.queuePosition !== undefined && status.queuePosition !== null) {
      return 'IN_QUEUE';
    }
    
    // Priority 2: Use cartStatus
    return status.cartStatus || 'AVAILABLE';
  }, [status]);
  
  const isMyReservation = status?.reservation?.user_alias === session?.user_alias;

  // Button appearance configuration
  const getButtonConfig = () => {
    switch (currentStatus) {
      case 'SOLD':
        return { variant: 'secondary', led: 'off', ledColor: 'none' };
      case 'IN_CART':
        return { variant: 'knurled', led: 'off', ledColor: 'none' };
      case 'IN_QUEUE':
        return { 
          variant: 'led', 
          led: undefined, 
          ledColor: isHoveringQueue ? 'error' : 'warning'
        };
      // Other cases
    }
  };

  // Button content based on status
  const getButtonContent = () => {
    switch (currentStatus) {
      case 'SOLD':
        return (
          <>
            <Ban className="mr-2 h-4 w-4" />
            <span className="font-heading">Sold</span>
          </>
        );
      case 'IN_QUEUE':
        return isHoveringQueue ? (
          <>
            <LogOut className="mr-2 h-4 w-4" />
            <span className="font-heading">Leave Queue</span>
          </>
        ) : (
          <>
            <Clock className="mr-2 h-4 w-4" />
            <span className="font-heading">Position {status?.queuePosition}</span>
          </>
        );
      // Other cases
    }
  };

  // Click handler that invokes appropriate functions based on status
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (currentStatus === 'AVAILABLE') {
      onAddToCart?.(e);
    } else if (currentStatus === 'RESERVED_BY_OTHERS' ||
               (currentStatus === 'RESERVED' && !isMyReservation)) {
      onJoinQueue?.(e);
    } else if (currentStatus === 'IN_QUEUE' && isHoveringQueue) {
      setShowExitModal(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={currentStatus === 'RESERVED' && isMyReservation}
        variant={buttonConfig.variant}
        ledColor={buttonConfig.ledColor}
        className={className}
        onMouseEnter={() => currentStatus === 'IN_QUEUE' && setIsHoveringQueue(true)}
        onMouseLeave={() => setIsHoveringQueue(false)}
      >
        {getButtonContent()}
      </Button>

      <QueueExitModal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={async () => {
          await onLeaveQueue?.(new MouseEvent('click') as any);
          setShowExitModal(false);
        }}
        recordTitle={recordTitle}
      />
    </>
  );
});
```

#### RecordStatus Component

The RecordStatus component displays a visual indicator of record availability:

```typescript
export const RecordStatus = memo(function RecordStatus({
  recordId,
  status
}: RecordStatusProps) {
  // Status styling based on current state
  const statusStyles = {
    AVAILABLE: { bg: 'bg-green-600', text: 'Available', icon: Check },
    RESERVED: { bg: 'bg-blue-600', text: 'Reserved', icon: Lock },
    RESERVED_BY_OTHERS: { bg: 'bg-blue-600', text: 'Reserved', icon: Lock },
    IN_QUEUE: { bg: 'bg-amber-600', text: 'In Queue', icon: Clock },
    IN_CART: { bg: 'bg-primary', text: 'In Cart', icon: ShoppingCart },
    SOLD: { bg: 'bg-gray-600', text: 'Sold', icon: Ban }
  };

  if (!status) return null;
  
  const currentStyle = statusStyles[status.cartStatus] || statusStyles.AVAILABLE;
  const Icon = currentStyle.icon;

  return (
    <div className="absolute top-2 right-2 z-10">
      <div className={`rounded-full ${currentStyle.bg} p-1.5 transition-all duration-300 shadow-glow-sm`}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
    </div>
  );
});
```

#### RecordGrid Component

The RecordGrid filters records based on their status and visibility:

```typescript
export function RecordGrid({ records = [], loading = false, viewPreference = 'grid' }: RecordGridProps) {
  const recordStatuses = useStore(state => state.recordStatuses);
  
  // Filter out sold records and those marked not visible
  const visibleRecords = useMemo(() => {
    return records.filter(record => {
      // Check for visibility in record itself
      const isHidden = record.visibility === false || record.sold_at !== null;
      
      // Check status for SOLD flag
      const status = recordStatuses[record.id];
      const isSold = status?.cartStatus === 'SOLD';
      
      return !isHidden && !isSold;
    });
  }, [records, recordStatuses]);

  // Rendering logic
  if (loading) {
    return <SkeletonGrid count={12} viewPreference={viewPreference} />;
  }

  if (!visibleRecords?.length) {
    return <EmptyState message="No records found" />;
  }

  return (
    <div className={viewPreferenceClass(viewPreference)}>
      {visibleRecords.map((record) => (
        <RecordCard
          key={record.id}
          record={record}
          status={recordStatuses[record.id]}
          viewPreference={viewPreference}
        />
      ))}
    </div>
  );
}
```

### Real-time Status Updates

The application uses a sophisticated real-time update system:

1. **Database Triggers**: Changes to reservations, cart items, etc. trigger updates to the audit_logs table

2. **Audit Log Subscription**: A single Supabase real-time subscription watches the audit_logs table

3. **Targeted Updates**: When an audit log entry is created, only the affected record's status is refreshed

4. **Status Propagation**: Updated status is merged into the global store, causing UI components to re-render

This approach significantly reduces network traffic compared to subscribing to all individual tables or polling for updates.

## Cart System

The cart system allows users to collect records they intend to reserve before proceeding to checkout.

### Cart Data Model

The cart is represented by the following data structures:

```typescript
// Cart item in database
interface CartItem {
  id: string;
  user_alias: string;
  release_id: number;
  status: CartItemStatus; // 'AVAILABLE' | 'RESERVED_BY_OTHERS' | 'IN_QUEUE'
  last_validated_at: string;
  releases?: Release; // Joined record data
}

// Store state for cart
interface CartState {
  cartItems: CartItem[];
  setCartItems: (items: CartItem[]) => void;
}

// Cart hook return type
interface CartHookReturn {
  items: CartItem[];
  isLoading: boolean;
  error: string | null;
  addToCart: (recordId: number) => Promise<void>;
  removeFromCart: (recordId: number) => Promise<void>;
  validateCart: () => Promise<CartItem[]>;
  clearCart: () => Promise<void>;
}
```

### Cart Operations

The cart operations are implemented in the `useCart` hook:

```typescript
export function useCart() {
  // Module-level cache to prevent redundant loading
  let cartCache = {
    userAlias: null as string | null,
    lastLoaded: null as number | null
  };
  
  // State and hooks
  const supabase = createClientComponentClient();
  const session = useSession();
  const cartItems = useStore(state => state.cartItems);
  const setCartItems = useStore(state => state.setCartItems);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Load cart items on session change
  useEffect(() => {
    if (!session?.user_alias) return;
    
    const cacheIsValid = 
      cartCache.userAlias === session.user_alias && 
      cartCache.lastLoaded && 
      (Date.now() - cartCache.lastLoaded) < 120000; // 2 minute cache
    
    if (cacheIsValid) {
      console.log('[CART] Using cached cart data');
      return;
    }
    
    const loadCartItems = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('[CART] Loading cart items');
        
        const { data, error } = await supabase
          .from('cart_items')
          .select(`
            *,
            releases (
              id,
              title,
              price,
              artists,
              labels,
              thumb,
              primary_image
            )
          `)
          .eq('user_alias', session.user_alias);
          
        if (error) throw error;
        
        console.log(`[CART] Loaded ${data?.length || 0} cart items`);
        if (isMounted.current) {
          setCartItems(data || []);
          cartCache.userAlias = session.user_alias;
          cartCache.lastLoaded = Date.now();
        }
      } catch (err) {
        console.error('[CART] Error loading cart:', err);
        if (isMounted.current) {
          setError('Failed to load cart items');
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };
    
    loadCartItems();
    
    // Set up background validation
    const interval = setInterval(async () => {
      await validateCart();
    }, 300000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [session?.user_alias]);

  // Add item to cart
  const addToCart = useCallback(async (recordId: number) => {
    if (!session?.user_alias) {
      setError('You must be logged in to add items to cart');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`[CART] Adding record ${recordId} to cart`);
      
      // Check if already in cart
      const existing = cartItems.find(item => item.release_id === recordId);
      if (existing) {
        console.log(`[CART] Record ${recordId} already in cart`);
        return;
      }
      
      // Add to cart
      const { data, error } = await supabase
        .from('cart_items')
        .insert([{
          release_id: recordId,
          user_alias: session.user_alias,
          status: 'AVAILABLE' // Will be validated by trigger
        }])
        .select(`
          *,
          releases (
            id,
            title,
            price,
            artists,
            labels,
            thumb,
            primary_image
          )
        `)
        .single();
        
      if (error) throw error;
      
      console.log(`[CART] Added record ${recordId} to cart`);
      setCartItems([...cartItems, data]);
      cartCache.lastLoaded = Date.now();
    } catch (err) {
      console.error(`[CART] Error adding record ${recordId} to cart:`, err);
      setError('Failed to add item to cart');
    } finally {
      setIsLoading(false);
    }
  }, [cartItems, session, setCartItems, supabase]);

  // Remove item from cart
  const removeFromCart = useCallback(async (recordId: number) => {
    if (!session?.user_alias) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`[CART] Removing record ${recordId} from cart`);
      
      // Get cart item ID
      const item = cartItems.find(item => item.release_id === recordId);
      if (!item) return;
      
      // Remove from cart
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', item.id)
        .eq('user_alias', session.user_alias);
        
      if (error) throw error;
      
      console.log(`[CART] Removed record ${recordId} from cart`);
      setCartItems(cartItems.filter(item => item.release_id !== recordId));
      cartCache.lastLoaded = Date.now();
    } catch (err) {
      console.error(`[CART] Error removing record ${recordId} from cart:`, err);
      setError('Failed to remove item from cart');
    } finally {
      setIsLoading(false);
    }
  }, [cartItems, session, setCartItems, supabase]);

  // Validate cart items
  const validateCart = useCallback(async () => {
    if (!session?.user_alias || cartItems.length === 0) return cartItems;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[CART] Validating cart items');
      
      // Get current cart data
      const { data: cartData, error: cartError } = await supabase
        .from('cart_items')
        .select(`
          *,
          releases (
            id,
            title,
            price,
            artists,
            labels,
            thumb,
            primary_image
          )
        `)
        .eq('user_alias', session.user_alias);
        
      if (cartError) throw cartError;
      
      // Get record IDs for status lookup
      const recordIds = cartData.map(item => item.release_id);
      
      // Get current statuses
      const statusResponse = await fetch(`/api/status?user_alias=${encodeURIComponent(session.user_alias)}`);
      const { statusMap } = await statusResponse.json();
      
      // Update cart items with current status
      const updatedItems = cartData.map(item => {
        const status = statusMap[item.release_id];
        return {
          ...item,
          status: status?.cartStatus || 'AVAILABLE'
        };
      });
      
      console.log(`[CART] Validated ${updatedItems.length} cart items`);
      setCartItems(updatedItems);
      cartCache.lastLoaded = Date.now();
      
      return updatedItems;
    } catch (err) {
      console.error('[CART] Error validating cart:', err);
      setError('Failed to validate cart');
      return cartItems;
    } finally {
      setIsLoading(false);
    }
  }, [cartItems, session, setCartItems, supabase]);

  // Clear entire cart
  const clearCart = useCallback(async () => {
    if (!session?.user_alias) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[CART] Clearing cart');
      
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_alias', session.user_alias);
        
      if (error) throw error;
      
      console.log('[CART] Cart cleared');
      setCartItems([]);
      cartCache.lastLoaded = Date.now();
    } catch (err) {
      console.error('[CART] Error clearing cart:', err);
      setError('Failed to clear cart');
    } finally {
      setIsLoading(false);
    }
  }, [session, setCartItems, supabase]);

  return {
    items: cartItems,
    isLoading,
    error,
    addToCart,
    removeFromCart,
    validateCart,
    clearCart
  };
}
```

### Cart Validation System

The cart validation happens at multiple levels:

1. **Database-level Validation**:
   - A trigger (`cart_item_validation`) validates cart items when added to the database
   - The trigger checks reservation status and updates the item's status

```sql
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
```

2. **Background Validation**:
   - The `useCart` hook runs validation every 5 minutes
   - Validation updates cart item statuses based on current availability

3. **Manual Validation**:
   - Cart validation is triggered when the cart is opened
   - Validation also runs before checkout to ensure data freshness

### Cart UI Components

The cart UI is implemented primarily through the `CartSheet` component:

```typescript
export function CartSheet() {
  const { items, isLoading, error, removeFromCart, validateCart } = useCart();
  const { handleCheckout, isProcessing } = useCheckout();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  // Validate cart when opened
  useEffect(() => {
    if (isOpen) {
      validateCart();
    }
  }, [isOpen, validateCart]);

  // Calculate total price
  const total = items.reduce((sum, item) => sum + (item.releases?.price || 0), 0);

  // Status badge styling
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'default';
      case 'RESERVED_BY_OTHERS': return 'secondary';
      case 'IN_QUEUE': return 'outline';
      default: return 'default';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {items.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {items.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('cart.title')}</SheetTitle>
          <SheetDescription>
            {items.length > 0 
              ? t('cart.itemCount', { count: items.length })
              : t('cart.empty')
            }
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="py-6 flex justify-center">
            <span className="loading loading-spinner"></span>
          </div>
        ) : error ? (
          <div className="py-6 text-destructive">{error}</div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            {t('cart.noItems')}
          </div>
        ) : (
          <>
            <div className="space-y-4 mt-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
              {items.map(item => (
                <div key={item.id} className="flex items-start gap-4 p-4 bg-card rounded-lg">
                  <div 
                    className="w-16 h-16 bg-muted rounded flex-shrink-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${item.releases?.primary_image || item.releases?.thumb})` }}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {item.releases?.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(item.releases?.price || 0)}
                    </p>
                    <div className="mt-2">
                      <Badge variant={getStatusVariant(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCart(item.release_id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="mt-6 space-y-4">
              <div className="flex justify-between font-semibold">
                <span>{t('cart.total')}</span>
                <span>{formatPrice(total)}</span>
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleCheckout}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <span className="loading loading-spinner loading-xs mr-2"></span>
                ) : null}
                {t('cart.checkout')}
              </Button>
              
              <p className="text-xs text-muted-foreground">
                {t('cart.checkoutInfo')}
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
```

## Reservation System

The reservation system is the core transaction mechanism of the application, allowing users to reserve records before pickup.

### Reservation Flow

The reservation process follows these steps:

1. User adds records to cart
2. User initiates checkout
3. System attempts to reserve all available items
4. Successfully reserved items are added to the user's reservations
5. Items that cannot be reserved (already reserved by others) are offered for queue placement
6. User is provided with a WhatsApp communication channel for pickup coordination

### Reservation Expiry Mechanism

Reservations automatically expire after 7 days, implemented through the following database triggers and functions:

```sql
-- Reservation expiry handling
CREATE OR REPLACE FUNCTION process_expired_reservations()
RETURNS TRIGGER AS $$
DECLARE
    r_release_id INTEGER;
    next_user TEXT;
BEGIN
    -- Explicitly cast release_id to INTEGER to avoid type mismatches
    r_release_id := OLD.release_id::INTEGER;
    
    -- Only process if conditions are met
    IF NEW.expires_at < now() AND OLD.status = 'RESERVED' THEN
        -- Find the next person in queue
        SELECT user_alias INTO next_user
        FROM reservation_queue
        WHERE release_id = r_release_id
        AND queue_position = 1
        LIMIT 1;
        
        -- Only if someone is in queue, promote them
        IF next_user IS NOT NULL THEN
            -- Delete them from the queue
            DELETE FROM reservation_queue
            WHERE release_id = r_release_id
            AND queue_position = 1;
            
            -- Update remaining queue positions
            UPDATE reservation_queue
            SET queue_position = queue_position - 1
            WHERE release_id = r_release_id
            AND queue_position > 1;
            
            -- Create a new reservation
            INSERT INTO reservations (release_id, user_alias, status, expires_at)
            VALUES (r_release_id, next_user, 'RESERVED', now() + interval '7 days');
        END IF;
        
        -- Log the operation
        INSERT INTO audit_logs (release_id, user_alias, action, details)
        VALUES (
            r_release_id,
            OLD.user_alias,
            'RESERVATION_EXPIRED',
            jsonb_build_object(
                'reservation_id', OLD.id,
                'next_in_queue', next_user
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_reservation_expiry
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION process_expired_reservations();
```

This system automatically:
1. Detects expired reservations
2. Checks if there are users in the queue
3. Promotes the next user in queue if available
4. Creates a new reservation with a fresh 7-day expiry
5. Updates queue positions for remaining users
6. Logs the operation in audit_logs

### Reservation Status Tracking

Reservation status is tracked through several mechanisms:

1. **Database Tables**:
   - `reservations` tracks active reservations with status and expiry
   - `audit_logs` captures reservation operations for auditing and real-time updates

2. **Status API**:
   - Global status endpoints return reservation information
   - Reservation information includes the reserving user and status

3. **UI Components**:
   - ActionButton shows appropriate actions based on reservation status
   - RecordStatus displays visual indicators of reservation state

### Reservation UI

The UI for reservations is primarily managed through the status-aware components:

1. **ActionButton**:
   - Shows "Reserved" status for items reserved by the current user
   - Shows "Join Queue" for items reserved by others

2. **RecordStatus**:
   - Displays a blue indicator for reserved items
   - Uses a lock icon to indicate the reserved state

3. **RecordDetail**:
   - Shows detailed reservation information
   - Displays expiry date for the user's own reservations

## Queue Management

The queue system provides fairness when multiple users want the same record by establishing a waiting list.

### Queue Data Structure

The queue is implemented through the `reservation_queue` table:

```sql
CREATE TABLE reservation_queue (
    id uuid primary key default gen_random_uuid(),
    release_id integer references releases(id),
    user_alias text references users(alias),
    queue_position integer not null,
    joined_at timestamptz default now(),
    UNIQUE (release_id, queue_position),
    CONSTRAINT valid_queue_position CHECK (queue_position > 0)
);
```

Key features:
- Each record (release_id) has its own independent queue
- Queue positions are maintained as sequential integers starting from 1
- A unique constraint ensures no position collisions
- Timestamp tracking when users join the queue

### Queue Operations

The queue operations are implemented in the `useQueue` hook:

```typescript
export function useQueue() {
  const supabase = createClientComponentClient();
  const session = useSession();
  const updateRecordStatuses = useStore(state => state.updateRecordStatuses);
  const refreshSingleStatus = useGlobalStatus().refreshSingleStatus;
  
  // Set up real-time subscriptions
  useEffect(() => {
    if (!session?.user_alias) return;
    
    const channel = supabase
      .channel('reservation-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservation_queue',
          filter: `user_alias=eq.${session.user_alias}`
        },
        async (payload) => {
          console.log('[QUEUE] Queue position changed:', payload);
          const releaseId = payload.new?.release_id || payload.old?.release_id;
          if (releaseId) {
            await refreshSingleStatus(releaseId);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user_alias, refreshSingleStatus, supabase]);

  // Leave queue operation
  const leaveQueue = useCallback(async (recordId: number) => {
    if (!session?.user_alias) return;
    
    try {
      console.log(`[QUEUE] Leaving queue for record ${recordId}`);
      
      // Find current queue position
      const { data: queueData, error: queueError } = await supabase
        .from('reservation_queue')
        .select('id, queue_position')
        .eq('release_id', recordId)
        .eq('user_alias', session.user_alias)
        .maybeSingle();
        
      if (queueError) throw queueError;
      
      if (!queueData) {
        console.log(`[QUEUE] Not in queue for record ${recordId}`);
        return;
      }
      
      // Delete queue entry - trigger will handle reordering
      const { error: deleteError } = await supabase
        .from('reservation_queue')
        .delete()
        .eq('id', queueData.id);
        
      if (deleteError) throw deleteError;
      
      console.log(`[QUEUE] Left queue for record ${recordId}`);
      
      // Update status
      await refreshSingleStatus(recordId);
    } catch (error) {
      console.error(`[QUEUE] Error leaving queue for record ${recordId}:`, error);
      throw new Error('Failed to leave queue');
    }
  }, [session, refreshSingleStatus, supabase]);

  // Join queue operation
  const joinQueue = useCallback(async (recordId: number) => {
    if (!session?.user_alias) return;
    
    try {
      console.log(`[QUEUE] Joining queue for record ${recordId}`);
      
      // Check if already in queue
      const { data: existingEntry, error: checkError } = await supabase
        .from('reservation_queue')
        .select('id')
        .eq('release_id', recordId)
        .eq('user_alias', session.user_alias)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existingEntry) {
        console.log(`[QUEUE] Already in queue for record ${recordId}`);
        return;
      }
      
      // Find current queue size
      const { data: currentQueue, error: queueError } = await supabase
        .from('reservation_queue')
        .select('queue_position')
        .eq('release_id', recordId)
        .order('queue_position', { ascending: false })
        .limit(1);
        
      if (queueError) throw queueError;
      
      // Calculate next position (highest + 1 or 1 if empty)
      const nextPosition = currentQueue?.[0] ? (currentQueue[0].queue_position + 1) : 1;
      
      // Join queue
      const { error: joinError } = await supabase
        .from('reservation_queue')
        .insert([{
          release_id: recordId,
          user_alias: session.user_alias,
          queue_position: nextPosition
        }]);
        
      if (joinError) throw joinError;
      
      console.log(`[QUEUE] Joined queue for record ${recordId} at position ${nextPosition}`);
      
      // Update status
      await refreshSingleStatus(recordId);
    } catch (error) {
      console.error(`[QUEUE] Error joining queue for record ${recordId}:`, error);
      throw new Error('Failed to join queue');
    }
  }, [session, refreshSingleStatus, supabase]);

  return {
    joinQueue,
    leaveQueue
  };
}
```

### Queue Position Display

Queue positions are displayed in the ActionButton component:

```typescript
// Inside ActionButton's getButtonContent function
case 'IN_QUEUE':
  return isHoveringQueue ? (
    <>
      <LogOut className="mr-2 h-4 w-4" />
      <span className="font-heading">Leave Queue</span>
    </>
  ) : (
    <>
      <Clock className="mr-2 h-4 w-4" />
      <span className="font-heading">Position {status?.queuePosition}</span>
    </>
  );
```

The position is dynamically updated in real-time as users leave the queue or reservations expire.

### Queue Status Changes

Queue position changes are handled automatically by database triggers:

```sql
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

CREATE TRIGGER maintain_queue_positions
    AFTER DELETE ON reservation_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_queue_positions();
```

This ensures that:
1. When a user leaves the queue, positions are reordered
2. There are no gaps in the queue (positions 1, 2, 3, etc.)
3. When a reservation expires, the first person in queue is promoted automatically

## Checkout Process

The checkout process ties together the cart, reservation, and queue systems to complete the purchase flow.

### Checkout Flow

The checkout process is implemented in the `useCheckout` hook:

```typescript
export function useCheckout() {
  const supabase = createClientComponentClient();
  const session = useSession();
  const { items, clearCart, validateCart } = useCart();
  const { joinQueue } = useQueue();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  
  // Main checkout handler
  const handleCheckout = useCallback(async () => {
    if (!session?.user_alias || items.length === 0) return null;
    
    setIsProcessing(true);
    setResult(null);
    
    try {
      console.log('[CHECKOUT] Starting checkout process');
      
      // Validate cart before proceeding
      const validatedItems = await validateCart();
      if (validatedItems.length === 0) {
        console.log('[CHECKOUT] No valid items to checkout');
        return null;
      }
      
      // Check what's already reserved
      const { data: reservations } = await supabase
        .from('reservations')
        .select('release_id')
        .eq('status', 'RESERVED');
        
      // Check what's already in queue
      const { data: queuePositions } = await supabase
        .from('reservation_queue')
        .select('release_id, queue_position')
        .eq('user_alias', session.user_alias);
        
      // Determine item states
      const itemStates = validatedItems.map(item => {
        const isReserved = reservations?.some(r => r.release_id === item.release_id);
        const inQueue = queuePositions?.some(q => q.release_id === item.release_id);
        
        return {
          item,
          isReserved,
          inQueue,
          canReserve: !isReserved && !inQueue
        };
      });
      
      // Process items that can be reserved
      const reservationResults = await Promise.all(
        itemStates
          .filter(({ canReserve }) => canReserve)
          .map(async ({ item }) => {
            try {
              // Create reservation with 7-day expiry
              const now = new Date();
              const expiryDate = new Date(now);
              expiryDate.setDate(now.getDate() + 7);
              
              const { data, error } = await supabase
                .from('reservations')
                .insert([{
                  release_id: item.release_id,
                  user_alias: session.user_alias,
                  status: 'RESERVED',
                  expires_at: expiryDate.toISOString()
                }])
                .select()
                .single();
                
              if (error) throw error;
              
              return {
                success: true,
                type: 'reservation',
                item,
                data
              };
            } catch (error) {
              console.error(`[CHECKOUT] Reservation failed for ${item.release_id}:`, error);
              return {
                success: false,
                type: 'reservation',
                item,
                error
              };
            }
          })
      );
      
      // Process items that need queue
      const queueResults = await Promise.all(
        itemStates
          .filter(({ isReserved, inQueue }) => isReserved && !inQueue)
          .map(async ({ item }) => {
            try {
              await joinQueue(item.release_id);
              
              return {
                success: true,
                type: 'queue',
                item
              };
            } catch (error) {
              console.error(`[CHECKOUT] Queue join failed for ${item.release_id}:`, error);
              return {
                success: false,
                type: 'queue',
                item,
                error
              };
            }
          })
      );
      
      // Combine results
      const allResults = [...reservationResults, ...queueResults];
      
      // Clear processed items from cart
      const itemsToRemove = new Set(
        allResults
          .filter(result => result.success)
          .map(result => result.item.release_id)
      );
      
      if (itemsToRemove.size > 0) {
        const { error } = await supabase
          .from('cart_items')
          .delete()
          .in('release_id', Array.from(itemsToRemove));
          
        if (error) throw error;
      }
      
      // Prepare result summary
      const successfulReservations = allResults
        .filter(result => result.success && result.type === 'reservation')
        .map(result => result.item);
        
      const successfulQueueJoins = allResults
        .filter(result => result.success && result.type === 'queue')
        .map(result => result.item);
        
      const failures = allResults
        .filter(result => !result.success)
        .map(result => result.item);
        
      const checkoutResult = {
        reservations: successfulReservations,
        queueJoins: successfulQueueJoins,
        failures,
        allItems: validatedItems,
        timestamp: new Date().toISOString()
      };
      
      console.log('[CHECKOUT] Checkout completed:', checkoutResult);
      setResult(checkoutResult);
      
      return checkoutResult;
    } catch (error) {
      console.error('[CHECKOUT] Checkout error:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [items, session, validateCart, joinQueue, supabase]);

  return {
    handleCheckout,
    isProcessing,
    result
  };
}
```

### Order Coordination

After successful reservations, the application uses WhatsApp as a communication channel:

```typescript
function formatWhatsAppMessage(items: CartItem[], userAlias: string): string {
  const formattedItems = items
    .map(item => {
      const artists = item.releases?.artists
        .map(artist => typeof artist === 'string' ? artist : artist.name)
        .join(', ');
        
      const labels = item.releases?.labels?.[0];
      const catno = labels?.catno || 'N/A';
      
      return `- ${item.releases?.title} by ${artists} [${catno}] (${formatPrice(item.releases?.price || 0)})`;
    })
    .join('\n');

  const total = items.reduce((sum, item) => sum + (item.releases?.price || 0), 0);

  return `Hi! I would like to pick up:
${formattedItems}
Total: ${formatPrice(total)}
Alias: ${userAlias}`;
}

function openWhatsAppCoordination(items: CartItem[], userAlias: string) {
  const message = formatWhatsAppMessage(items, userAlias);
  const encodedMessage = encodeURIComponent(message);
  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  
  // Open WhatsApp with pre-formatted message
  window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
}
```

This generates a structured message containing:
1. All reserved items with details
2. Total price
3. User alias for identification
4. Pre-formatted for easy sharing with the store owner

### Transaction Audit

All checkout operations are logged in the `audit_logs` table:

1. **Reservation Creation**:
   - Log entry with action 'INSERT_reservations'
   - Details include reservation ID, expiry date, user

2. **Queue Join**:
   - Log entry with action 'INSERT_reservation_queue'
   - Details include queue position, record ID

3. **Cart Clearing**:
   - Log entry with action 'DELETE_cart_items'
   - Details include items removed

This comprehensive logging enables:
- Full audit trail of all transactions
- Real-time updates through the subscription system
- Admin dashboard activity monitoring

## Performance Considerations

### Network Optimization

The application includes several network optimizations:

1. **Batch Loading**:
   - Status information is loaded in bulk rather than per record
   - The API supports filtering to minimize payload size
   - Metadata is cached to prevent redundant fetching

2. **Real-time Subscription Efficiency**:
   - Single subscription to audit_logs instead of per-table
   - Only affected records are updated, not the entire state
   - PostgreSQL filtering limits events to relevant users

3. **Back Navigation Caching**:
   - Record data is cached between page transitions
   - Navigation detection prevents redundant API calls
   - Scroll position is preserved on back navigation

### State Management Efficiency

The state management is optimized through several techniques:

1. **Selective Updates**:
   - Status updates check update size to determine strategy
   - Large batches replace the state, small updates merge
   - Component-specific selectors prevent unnecessary rerenders

2. **Module-level Caching**:
   - Hooks use module-level variables to track state
   - Prevents duplicate API calls across component instances
   - Time-based invalidation prevents stale data

3. **Partial Updates**:
   - Status updates only modify affected records
   - Cart updates only target changed items
   - Store slices separate concerns for targeted updates

### Component Rendering Optimization

The UI components are optimized for efficient rendering:

1. **Memoized Components**:
   - `RecordCard`, `ActionButton`, and `RecordStatus` are memoized
   - Only re-renders when props actually change
   - Prevents cascading updates from parent components

2. **Efficient State Access**:
   - Components use targeted selectors (e.g., `useStore(state => state.recordStatuses[record.id])`)
   - Status data is passed as props to avoid store access in children
   - Custom hooks abstract complex state interactions

3. **Conditional Rendering**:
   - Visibility checks filter out records that shouldn't be shown
   - Skeleton loaders provide visual feedback during loading
   - Empty states prevent layout shifts

### Database Interaction Patterns

The database interactions are optimized for performance:

1. **Bulk Operations**:
   - Status data is retrieved in one query with joins
   - Cart operations batch updates where possible
   - Database RPC functions perform complex operations server-side

2. **Index Utilization**:
   - Indexes on all frequently queried fields
   - Composite indexes for common filter combinations
   - Specialized indexes for status-related queries

3. **Transaction Safety**:
   - Database triggers ensure data integrity
   - Constraints prevent invalid state transitions
   - Error handling captures and logs failures

These comprehensive performance optimizations ensure that the application remains responsive even with thousands of records and multiple concurrent users, providing a smooth experience suitable for the specialized vinyl records marketplace.
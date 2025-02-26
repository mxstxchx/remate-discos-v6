# Analysis and Fixes for API optimization

You're right that we need a more thorough analysis of the codebase. Let me dive deeper into the remaining hooks, admin components, layout components, and especially the filter state management during page navigation.

## Batch 1 of files analysis

### Analysed Files
- src/hooks/useRecordStatus.ts
- src/hooks/useCart.ts
- RecordCard.tsx
- ActionButton.tsx
- src/hooks/useRecordStatuses.ts
- src/components/layout/CartSheet.tsx
- src/components/records/RecordStatus.tsx
- src/hooks/useQueue.ts
- src/store/index.ts
- src/hooks/useCheckout.ts
- src/lib/auth/provider.tsx
- components/records/RecordGrid.tsx
- src/app/page.tsx
- src/hooks/useRecords.tsx
- src/hooks/useFilters.ts
- src/types/database.ts
### Analysis result details
- Individual Record Status Fetching: In useRecordStatus.ts, each record makes three separate API calls:
    - One to check if it's sold
    - One to get reservation status
    - One to get queue position
- Multiple Supabase Subscriptions: Each record creates its own real-time subscription, watching three tables (releases, reservations, reservation_queue).
- Cart Validation Overhead: The useCart.ts hook performs full validation every 5 minutes regardless of need.
- ActionButton Redundant Operations: Each ActionButton component creates its own instance of useRecordStatus, triggering more API calls.
- Duplicate Functionality: useRecordStatus.ts and useRecordStatuses.ts have overlapping functionality but operate separately.
- Inefficient Queue Operations: Every time a user joins a queue, the app makes multiple separate API calls:
    - One to check the queue size
    - One to get the current queue positions
    - One to insert the new queue position
- Real-time Channels Duplication: The app creates multiple Supabase realtime channels that often watch the same tables, leading to duplicate notifications and processing.
- Authentication Process Duplication: In provider.tsx, the authentication process does multiple queries that could be combined:
    - Separate calls for user data, cart items, reservations, and queue positions
- Inefficient Store Updates: The updateRecordStatuses function in the store updates the entire status map whenever any status changes.
- Checkout Process Inefficiency: The checkout process in useCheckout.ts makes multiple separate API calls:
    - One to get current reservations
    - One to get current queue positions
    - One to update each queue position individually
    - One to clean up cart items

### Analysis summary:
- Individual Record Status Fetching:
    - Each RecordCard makes its own API calls through useRecordStatus hook
    - For every record displayed, it makes 3 separate calls (check sold, get reservation, get queue)
    - Multiple real-time subscriptions created (one per record)
- Redundant Background Validation:
    - Cart validation checks all items every 5 minutes
    - Multiple separate API calls for cart validation
    - No targeting of only necessary updates
- Authentication Flow Overhead:
    - Multiple sequential API calls during sign-in
    - Separate calls for user data, cart items, reservations, and queue positions
- Filter Query Inefficiencies:
    - Complex filter combinations causing redundant queries
    - Each filter option change causes a complete reload of records
- Checkout Process Redundancy:
    - Multiple separate API calls during checkout
    - Individual queue position updates instead of batch processing
- Multiple Real-time Subscriptions:
    - Each component creates its own subscription to the same tables
    - No centralized subscription management

### Recommendations summary:
- Centralize Status Management:
    - Create a global status service that loads all statuses at once
    - Separate pre-auth and post-auth loading phases
    - Use a single real-time subscription for updates
- Optimize Cart Operations:
    - Validate only items in the user's cart
    - Use a single query with joins instead of multiple separate queries
    - Update only when necessary based on audit logs
- Improve Authentication Flow:
    - Parallel API calls instead of sequential
    - Load user-specific data only after auth is complete
- Use Audit Logs for Real-time Updates:
    - Add triggers to keep the audit_logs table updated
    - Subscribe to audit_logs changes instead of multiple table subscriptions
    - Update only affected records based on audit log entries
- Batch Operations:
    - Implement batch processing for queue joining and checkout
    - Reduce API calls by combining related operations

## Batch 2 of files analysis
### Analysed files
- src/components/admin/ReservationsTable.tsx
- src/components/admin/QueueTable.tsx
- src/hooks/useAdmin.ts
- src/app/[id]/page.tsx
- src/components/layout/TopLayout.tsx
- src/hooks/useSession.ts
- src/app/admin/page.tsx
- src/components/records/RecordDetail.tsx
- src/components/filters/ActiveFilters.tsx
- src/app/providers.tsx
- src/app/layout.tsx
- src/app/api/postgrest/[...path]/route.ts
- src/hooks/useMetadata.ts
- src/lib/constants.ts
- src/middleware.ts
- src/app/middleware.ts
### Analysis results details
- Admin Components Inefficiencies:
    - ReservationsTable.tsx and QueueTable.tsx both make separate API calls whenever any change happens in the database tables they monitor
    - They set up individual real-time subscriptions that trigger full data refreshes
    - In admin API calls, reservations are joined with queue information through multiple separate queries inside a Promise.all, causing N+1 query problems
- State Management Between Pages:
    - In [id]/page.tsx, I noticed that the app is using setScrollPosition to save the scroll position when leaving the page. This suggests that the app is maintaining state between pages, but it's not clear how the filter state is being preserved.
    - The navigation pattern shows that the app uses router.back() to return to the previous page with state preserved.
- Admin Hook Inefficiencies:
    - useAdmin.ts has separate fetch functions for reservations, sessions, activity logs, and stats, each making independent API calls
    - It sets up multiple real-time subscriptions that trigger complete refreshes
    - The fetchReservations function has an expensive N+1 query pattern where it loads queue sizes individually for each reservation
- TopLayout and Page Structure:
    - TopLayout is fixed at the top and contains the cart sheet
    - There's no direct integration with filter state in the layout components
- Admin Dashboard Inefficiencies:
    - Admin page makes a separate API call to get stats, and then sets up an interval to refresh them every minute
    - Each admin component (ReservationsTable, QueueTable, etc.) makes its own API calls
    - Multiple redundant subscriptions are set up for related data
- Record Detail Page and Filter Persistence:
    - RecordDetail.tsx makes an API call to fetch a single record
    - The parent [id]/page.tsx shows they're saving scroll position in global store before unmounting
    - This suggests filter state is likely also maintained through Zustand store persistence
- Filter State Persistence:
    - In ActiveFilters.tsx, I can see the app is using Zustand's useFilters hook
    - The filter state is persisted in localStorage through Zustand's persist middleware (as seen in the useFilters.ts file we examined earlier)
    - This means that when navigating between pages, the filter state is automatically preserved without needing additional API calls
- Filter/Page Navigation Inefficiencies:
    - While the filter state itself is preserved efficiently through Zustand, the useRecords hook (which we examined earlier) is triggered to re-fetch all records whenever the page is re-rendered after navigation
    - Each time the user navigates from a detail page back to the browse page, the useRecords hook triggers a fresh API call, even though the filter state hasn't changed
- Global State Initialization:
    - In providers.tsx, I see that the app initializes useRecordStatuses() at the app level, which creates a single real-time subscription for status updates
    - However, this doesn't prevent individual components from making their own status fetches and subscriptions
- PostgREST API Route:
    - The API route is well-structured to handle filters and pagination, but it's invoked redundantly
    - There's no caching mechanism to prevent fetching the same data multiple times

### Analysis summary
- Redundant Status Fetching:
    - Individual RecordCard components use useRecordStatus hook, creating separate API calls for each card
    - Despite having useRecordStatuses in the app providers, components still make their own status queries
    - Every record displayed triggers 3 separate queries (sold status, reservation status, queue position)
- Multiple Real-time Subscriptions:
    - Each record creates its own subscription to the same database tables
    - Admin components each create their own subscriptions without coordination
    - No centralized subscription management leads to redundant traffic
- Filter State Navigation Inefficiency:
    - While filter state is efficiently preserved in Zustand store, each navigation back to the browse page triggers a full refetch of records
    - No caching mechanism prevents redundant API calls with the same filters
- Metadata Fetching Overhead:
    - useMetadata fetches all records just to extract artists, labels, and styles
    - This is a heavy operation that could be optimized with a dedicated API endpoint
- Admin Dashboard Inefficiencies:
    - Admin dashboard makes multiple separate API calls to different endpoints
    - Each admin component (ReservationsTable, QueueTable) maintains its own data fetching logic
    - N+1 query pattern in reservation management (one query for each reservation's queue size)
- Authentication and Cart Validation Overhead:
    - Multiple separate API calls during authentication (user data, cart items, reservations, queue positions)
    - Cart validation runs every 5 minutes for all items regardless of need
    - Each checkout operation makes multiple separate API calls instead of batch operations


## Database Structure Analysis & Optimization Plan

### Current Setup Overview

You already have a solid foundation with:

1. **Effective Triggers & Functions:**
   - `cart_item_validation` - Validates cart items when added/updated
   - `maintain_queue_positions` - Updates queue positions on deletion
   - `handle_reservation_expiry` - Processes expired reservations
   - `mark_record_as_sold` - Updates visibility and creates audit logs

2. **Existing Audit Logs Table:**
   - The `audit_logs` table has the right structure with `release_id`, `user_alias`, `action`, `details`
   - Currently used primarily for sold records and expired reservations

3. **Good Index Coverage:**
   - Indexes on key fields like `user_alias`, `status`, `release_id`, etc.
   - Visibility index on releases

#### What's Missing to Implement Your Ideal Workflow

To implement your proposed optimization workflow, we need to enhance a few areas:

1. **Extended Audit Logging:**
   - Currently, audit logs are only created for certain operations
   - Need comprehensive logging for all status changes

2. **Centralized Status Loading:**
   - No optimized functions for bulk loading statuses

3. **Real-time Single Subscription:**
   - Need to leverage audit logs for targeted updates

### Implementation Plan

#### 1. Enhanced Audit Logging Triggers

First, let's add triggers to comprehensively track all relevant changes:

```sql
-- Create a generic audit log function for any table changes
CREATE OR REPLACE FUNCTION log_table_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        release_id,
        user_alias,
        action,
        details,
        created_at
    ) VALUES (
        CASE 
            WHEN TG_TABLE_NAME = 'releases' THEN 
                CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END
            WHEN TG_TABLE_NAME IN ('reservations', 'reservation_queue', 'cart_items') THEN 
                CASE WHEN TG_OP = 'DELETE' THEN OLD.release_id ELSE NEW.release_id END
            ELSE NULL
        END,
        CASE 
            WHEN TG_TABLE_NAME = 'sessions' THEN 
                CASE WHEN TG_OP = 'DELETE' THEN OLD.user_alias ELSE NEW.user_alias END
            WHEN TG_TABLE_NAME IN ('reservations', 'reservation_queue', 'cart_items') THEN 
                CASE WHEN TG_OP = 'DELETE' THEN OLD.user_alias ELSE NEW.user_alias END
            ELSE NULL
        END,
        TG_OP || '_' || TG_TABLE_NAME,
        jsonb_build_object(
            'old_data', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
            'new_data', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
            'table', TG_TABLE_NAME,
            'timestamp', now()
        ),
        now()
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply to cart_items
CREATE TRIGGER log_cart_items_changes
AFTER INSERT OR UPDATE OR DELETE ON cart_items
FOR EACH ROW EXECUTE FUNCTION log_table_change();

-- Apply to reservation_queue
CREATE TRIGGER log_queue_changes
AFTER INSERT OR UPDATE OR DELETE ON reservation_queue
FOR EACH ROW EXECUTE FUNCTION log_table_change();

-- Apply to reservations (in addition to the existing trigger)
CREATE TRIGGER log_reservation_changes
AFTER INSERT OR DELETE ON reservations
FOR EACH ROW EXECUTE FUNCTION log_table_change();

-- Apply to releases for visibility changes
CREATE TRIGGER log_release_changes
AFTER UPDATE ON releases
FOR EACH ROW 
WHEN (OLD.visibility IS DISTINCT FROM NEW.visibility OR OLD.sold_at IS DISTINCT FROM NEW.sold_at)
EXECUTE FUNCTION log_table_change();
```

#### 2. Optimized Bulk Status Loading Function

```sql
-- Function to get all statuses in one call
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

#### 3. API Endpoint for Initial Data Loading

Create a new API endpoint that leverages the bulk loading function:

```typescript
// src/app/api/status/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userAlias = searchParams.get('user_alias');
  
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  try {
    // Call the optimized function to get all statuses in one query
    const { data, error } = await supabase.rpc(
      'get_record_statuses',
      { p_user_alias: userAlias }
    );
    
    if (error) throw error;
    
    // Transform into a more efficient map format
    const statusMap = data.reduce((acc, item) => {
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
      return acc;
    }, {});
    
    return NextResponse.json({ statusMap, error: null });
  } catch (error) {
    console.error('Error fetching statuses:', error);
    return NextResponse.json(
      { statusMap: null, error: 'Failed to fetch statuses' },
      { status: 500 }
    );
  }
}
```

#### 4. Centralized Status Management Hook

```typescript
// src/hooks/useGlobalStatus.ts
export function useGlobalStatus() {
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const supabase = createClientComponentClient();
  const session = useSession();
  const updateRecordStatuses = useStore(state => state.updateRecordStatuses);
  
  // Initial load - visible records and their statuses
  useEffect(() => {
    const loadInitialStatuses = async () => {
      try {
        const response = await fetch('/api/status');
        const { statusMap, error } = await response.json();
        
        if (error) throw new Error(error);
        
        updateRecordStatuses(statusMap);
        setInitialLoaded(true);
      } catch (error) {
        console.error('Failed to load initial statuses:', error);
      }
    };
    
    if (!initialLoaded) {
      loadInitialStatuses();
    }
  }, [initialLoaded, updateRecordStatuses]);
  
  // User-specific statuses
  useEffect(() => {
    const loadUserStatuses = async () => {
      if (!session?.user_alias) return;
      
      try {
        const response = await fetch(`/api/status?user_alias=${session.user_alias}`);
        const { statusMap, error } = await response.json();
        
        if (error) throw new Error(error);
        
        updateRecordStatuses(statusMap);
        setUserLoaded(true);
      } catch (error) {
        console.error('Failed to load user statuses:', error);
      }
    };
    
    if (session?.user_alias && !userLoaded) {
      loadUserStatuses();
    }
  }, [session?.user_alias, userLoaded, updateRecordStatuses]);
  
  // Single subscription to audit logs
  useEffect(() => {
    if (!initialLoaded) return;
    
    const subscription = supabase
      .channel('status-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        (payload) => {
          const releaseId = payload.new?.release_id;
          if (releaseId) {
            // Fetch just this specific record's status
            fetch(`/api/status/single?release_id=${releaseId}${session?.user_alias ? `&user_alias=${session.user_alias}` : ''}`)
              .then(res => res.json())
              .then(({ status }) => {
                if (status) {
                  updateRecordStatuses({ [releaseId]: status });
                }
              })
              .catch(err => console.error('Error updating status:', err));
          }
        })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [initialLoaded, session?.user_alias, updateRecordStatuses]);
}
```

#### 5. Additional Single Record Status Endpoint

```typescript
// src/app/api/status/single/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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
    // Call the function with filters for a single record
    const { data, error } = await supabase.rpc(
      'get_record_statuses',
      { p_user_alias: userAlias }
    ).eq('release_id', releaseId);
    
    if (error) throw error;
    
    const status = data[0] ? {
      cartStatus: data[0].status,
      reservation: data[0].reservation_status ? {
        status: data[0].reservation_status,
        user_alias: data[0].reservation_user
      } : null,
      queuePosition: data[0].queue_position,
      inCart: data[0].in_cart,
      lastValidated: new Date().toISOString()
    } : null;
    
    return NextResponse.json({ status, error: null });
  } catch (error) {
    console.error('Error fetching status:', error);
    return NextResponse.json(
      { status: null, error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
```
## First Implementation Execution

### Steps
- create the status API endpoints
    - src/app/api/status/route.ts
    - src/app/api/status/single/route.ts
- create the global status hook
    - src/hooks/useGlobalStatus.ts
- update the app providers to initialize our global status management
    - src/app/providers.tsx
- modify the ActionButton component to use our global status
    - src/components/records/ActionButton.tsx
- update the RecordStatus component to use the global status
    - src/components/records/RecordStatus.tsx
- update the store to properly manage the global status
    - src/store/index.ts
- update the RecordCard component to use our global status
    - src/components/records/RecordCard.tsx
- update the auth provider to integrate with our optimized status loading approach
    - src/lib/auth/provider.tsx
- update the useCart hook to use our global status system
    - src/hooks/useCart.ts

### Implementation Summary
- Created Centralized Status Management:
    - Added the useGlobalStatus.ts hook to manage all status data centrally
    - Set up bulk loading for all statuses in a single API call
    - Implemented user-specific status loading after authentication
    - Created a single real-time subscription to manage updates efficiently
- Created Optimized API Endpoints:
    - /api/status - Bulk loads all statuses in a single call
    - /api/status/single - Efficiently updates a single record status
- Updated Components to Use Global Status:
    - Modified ActionButton.tsx to use the global store status
    - Updated RecordStatus.tsx to use the global store
    - Updated RecordCard.tsx to use global status from store
- Improved Cart and Auth Flow:
    - Enhanced AuthProvider to use the new global status
    - Optimized useCart.ts to leverage the global status management
    - Improved background validation to only update what's needed
- Enhanced Store for Efficient Status Updates:
    - Added smart handling for large vs. small updates
    - Added a clear method for resetting status when needed
    - Improved logging for better debugging

### Implementation Results
On initial load I see indeed less requests to Supabase but I see about 230 calls to localhost:3000/api/status all accompanied by these log sequence:
[STORE] Complete status replacement with 113 items index.ts:151:18
[GLOBAL_STATUS] Loaded 113 initial statuses useGlobalStatus.ts:27:16
I also notice that a release which is marked as sold in releases table , is viisble in the RecordGrid when it shouldn't be

I also notice that, releases for which the logged in user is in the queue, display as "Join the queue" instead of the correct queue position/leave queue options in actionButton

Going back from detailPage to browse page still triggers around 240 requests to releases and around 20 to cart_items.

Think deeply about this issues and potential causes

### Results Analysis
#### Additional files review
- src/app/page.tsx
- src/components/records/RecordGrid.tsx
- src/app/providers.tsx
- src/hooks/useGlobalStatus.ts
- src/hooks/useRecords.tsx
- src/hooks/useFilters.ts
- components/records/ActionButton.tsx
- src/app/api/status/route.ts
- src/app/[id]/page.tsx
- src/components/records/RecordDetail.tsx
- src/store/index.ts
#### Analysis Results
Root Causes of Implementation Issues
1. Multiple API Calls to /api/status (230 calls)
Cause Identified: The useGlobalStatus hook is being executed for every rendered component. The issue is in RecordCard.tsx where each card is individually accessing the store's status via useStore(state => state.recordStatuses[record.id]). This creates many observers on the Zustand store, and when updateRecordStatuses is called, it triggers re-renders across all components.
Additionally, the useGlobalStatus hook itself could be mounted multiple times because it's used at the provider level, but there might be multiple instances of it due to page transitions.
2. Sold Records Still Visible
Cause Identified: Looking at the API endpoint /api/status/route.ts, there's no filtering by the visibility field when fetching record statuses. Additionally, the RecordGrid component isn't filtering out sold records from the rendered list.
3. Queue Position Not Showing Correctly
Cause Identified: After examining ActionButton.tsx, I found that it's correctly looking at status?.queuePosition, but the issue is in how the cartStatus is determined. For records where the user is in the queue, the button is only checking status?.cartStatus which might not be set to 'IN_QUEUE' correctly.
4. Navigation Back Triggers Multiple Requests
Cause Identified: In useRecords.tsx, the hook does not check for existing data before fetching. It triggers a complete reload of records on every remount, including when navigating back from a detail page. The useFilters.ts store is also not properly caching or reusing results.
## Second Implementation Plan
Specific Implementation Fixes
Let me propose specific changes to address each issue:
1. Fix the Multiple API Calls Issue
First, let's modify useGlobalStatus.ts to prevent duplicate loading:
```typescript
// In useGlobalStatus.ts
// Add loading state tracking
const [isInitialLoadRequested, setIsInitialLoadRequested] = useState(false);
const [isUserLoadRequested, setIsUserLoadRequested] = useState(false);

// Initial load - visible records and their statuses
useEffect(() => {
  const loadInitialStatuses = async () => {
    if (initialLoaded || isInitialLoadRequested) return;
    
    setIsInitialLoadRequested(true);
    setIsLoading(true);
    try {
      console.log('[GLOBAL_STATUS] Loading initial statuses');
      // Rest of function...
    } finally {
      setIsLoading(false);
    }
  };
  
  loadInitialStatuses();
}, [initialLoaded, isInitialLoadRequested]);

// User-specific statuses
useEffect(() => {
  const loadUserStatuses = async () => {
    if (!session?.user_alias || userLoaded || isUserLoadRequested) return;
    
    setIsUserLoadRequested(true);
    setIsLoading(true);
    try {
      console.log(`[GLOBAL_STATUS] Loading user statuses for ${session.user_alias}`);
      // Rest of function...
    } finally {
      setIsLoading(false);
    }
  };
  
  loadUserStatuses();
}, [session?.user_alias, userLoaded, isUserLoadRequested]);
```
2. Fix the Sold Records Visibility Issue
First, modify the SQL function get_record_statuses to respect visibility:
```sql
-- Update the SQL function in the database
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
    -- Add visibility condition to the WHERE clause
    WHERE r.visibility = TRUE -- Only show visible records
    -- Rest of the function...
END;
$$ LANGUAGE plpgsql;
```
Then add filtering in the RecordGrid component:
```typescript
// In RecordGrid.tsx
export function RecordGrid({ records = [], loading = false, viewPreference = 'grid' }: RecordGridProps) {
  const statuses = useStore(state => state.recordStatuses);
  
  // Filter out sold records
  const visibleRecords = records.filter(record => {
    const status = statuses[record.id];
    return !status || status.cartStatus !== 'SOLD';
  });
  
  // Rest of component...
  
  return (
    <div className={/* ... */}>
      {visibleRecords.map((record) => (
        <RecordCard
          key={record.id}
          record={record}
          viewPreference={viewPreference}
        />
      ))}
    </div>
  );
}
```
3. Fix the Queue Position Display
Update the ActionButton component to prioritize queue position in status determination:
```typescript
// In ActionButton.tsx
// Modify the status checking logic to prioritize queue position
const determineStatus = () => {
  if (!status) return 'AVAILABLE';
  
  // Check for queue position first
  if (status.queuePosition !== undefined && status.queuePosition !== null) {
    return 'IN_QUEUE';
  }
  
  // Fall back to cartStatus
  return status.cartStatus || 'AVAILABLE';
};

const currentStatus = determineStatus();
```
4. Fix Navigation and Prevent Redundant Fetches
Modify the useRecords hook to avoid refetching on back navigation:
```typescript
// In useRecords.tsx
export function useRecords(initialPage: number = 1) {
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [hasInitialFetch, setHasInitialFetch] = useState(false);
  const releases = useStore(state => state.releases);
  const scrollPosition = useStore(state => state.scrollPosition);
  const setReleases = useStore(state => state.setReleases);
  
  const {
    fetchRecords,
    isLoading,
    error
  } = useFilters();

  // Get current filter state to track changes
  const filters = useFilters();
  
  useEffect(() => {
    // Detect if this is a back navigation
    const isBackNavigation = scrollPosition > 0;
    
    // Skip fetch if we already have data and it's a back navigation
    if (isBackNavigation && releases.length > 0 && hasInitialFetch) {
      console.log('[RECORDS] Using cached records from back navigation');
      
      // Restore scroll position
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 0);
      
      return;
    }
    
    const loadRecords = async () => {
      try {
        console.log('[RECORDS] Fetching records...');
        const { data, count } = await fetchRecords(page);
        console.log('[RECORDS] Fetch complete:', {
          recordCount: data.length,
          totalCount: count
        });
        setReleases(data);
        setTotalPages(Math.ceil(count / FILTER_DEFAULTS.perPage));
        setHasInitialFetch(true);
      } catch (error) {
        console.error('[RECORDS] Failed to load records:', error);
      }
    };

    loadRecords();
  }, [
    page,
    fetchRecords,
    filters.artists,
    filters.labels,
    filters.styles,
    filters.conditions,
    filters.priceRange,
    scrollPosition,
    releases.length,
    hasInitialFetch
  ]);

  return {
    releases,
    isLoading,
    error,
    page,
    totalPages,
    setPage
  };
}
```

### Second Implementation Results (Steps 1, 2 and 3)
I have confirmed that there are far less API requests (14 in total counting pre and post authentication). Queue position is fetched correctly and sent to ActionButton. However, Sold records visibility is still an issue. The record still shows up and ActionButton displays "add to cart"

### Second Implementation Issues Analysis and applied fixes
- modify the RecordGrid to also check for visibility directly on the records (if available) added more logging to debug what statuses are actually available, add a delay or more explicit synchronization between loading statuses and displaying records 
- update the RecordGrid component to better handle this case (The problem appears to be that the status information for sold records isn't being properly loaded or reflected in the store.) 
- update the API route to ensure it's correctly identifying sold records
- Update the /api/status/single/route.ts file to correctly check and prioritize the sold status:

### Summary of Fixes & Remaining Issues
- Completed Fixes:
    - Multiple API calls: Prevented duplicate calls using module-level tracking in useGlobalStatus.ts
    - Queue position display: Fixed by prioritizing queue position over cart status in ActionButton.tsx
    - Sold records filtering: Added UI-level filtering in RecordGrid.tsx

- Remaining Issue:
- Both API endpoints aren't properly checking sold status from the releases table.
- Fix for Main Status Endpoint:
```typescript
// In /api/status/route.ts
export async function GET(request: Request) {
  // Existing code...
  
  try {
    // First get sold records directly
    const { data: soldRecords } = await supabase
      .from('releases')
      .select('id, sold_at, sold_by')
      .not('sold_at', 'is', null);
    
    // Create map of sold records for faster lookups
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
    
    // Get other statuses via RPC function
    const { data, error } = await supabase.rpc(
      'get_record_statuses',
      { p_user_alias: userAlias }
    );
    
    if (error) throw error;
    
    // Merge statuses, prioritizing sold records
    const statusMap = { ...soldMap, ...data.reduce((acc, item) => {
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
    }, {})};
    
    return NextResponse.json({ statusMap, error: null, count: Object.keys(statusMap).length });
  }
  // Rest of existing code...
}
```

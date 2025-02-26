# Fixing Redundant Fetches on Navigation

## Relevant files analysed:
- src/hooks/useGlobalStatus.ts
- src/hooks/useRecords.tsx
- src/app/[id]/page.tsx
- src/app/page.tsx
- src/components/records/RecordGrid.tsx
- src/components/records/RecordCard.tsx
- src/store/index.ts
- src/hooks/useFilters.ts
- src/app/providers.tsx

## Accurate Root Causes

1. **Multiple Initialization of Hooks**: 
   - When navigating back to the main page, the entire `BrowsePage` component remounts, which re-initializes all hooks.
   - The `useRecords` hook in `src/hooks/useRecords.tsx` immediately triggers `fetchRecords` without checking for existing data.
   - This causes ~230 separate fetches to the database.

2. **Ineffective Module-Level Tracking**:
   - The `useGlobalStatus` hook correctly tries to use module-level variables to prevent duplicate requests, but:
   - It doesn't properly handle the case where the page is navigated to after the initial load.
   - The useEffect dependency array still checks `initialLoaded` state which resets on component remount.

3. **Excessive Filter State Dependencies**:
   - In `useRecords.tsx`, the effect depends on all filter properties (`filters.artists`, `filters.labels`, etc.).
   - When the component remounts, these dependencies trigger a re-fetch even if their values haven't changed.

4. **Store Selection over-fragmentation**:
   - Each `RecordCard` component has its own selector to the store with `useStore(state => state.recordStatuses[record.id])`.
   - This causes hundreds of individual subscriptions to the store, leading to cascading re-renders when any status updates.

## Comprehensive Fix Plan

Here's my updated plan to fix these issues:

### 1. Fix the useRecords Hook

```typescript
// In /Users/rafaelvasquez/Downloads/remate-discos-v6/src/hooks/useRecords.tsx

// Add module-level tracking for fetch state
let recordsLastFetched = null;
let lastFetchParams = null;

export function useRecords(initialPage: number = 1) {
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  
  // Use store for releases instead of local state
  const releases = useStore(state => state.releases);
  const setReleases = useStore(state => state.setReleases);
  const scrollPosition = useStore(state => state.scrollPosition);
  
  const {
    fetchRecords,
    isLoading,
    error
  } = useFilters();

  // Get current filter state but serialize it to avoid dependency changes
  const filters = useFilters();
  const serializedFilters = JSON.stringify({
    artists: filters.artists,
    labels: filters.labels,
    styles: filters.styles,
    conditions: filters.conditions,
    priceRange: filters.priceRange
  });
  
  useEffect(() => {
    // Check if this is a back navigation with existing data
    const isBackNavigation = scrollPosition > 0;
    const hasData = releases.length > 0;
    
    // Skip fetch if we already have data from the same filters
    if (isBackNavigation && hasData && lastFetchParams === serializedFilters) {
      console.log('[RECORDS_FIX] Using cached records from back navigation');
      
      // Restore scroll position
      setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 0);
      
      return;
    }
    
    const loadRecords = async () => {
      try {
        console.log('[RECORDS_FIX] Fetching records...');
        const { data, count } = await fetchRecords(page);
        console.log('[RECORDS_FIX] Fetch complete:', {
          recordCount: data.length,
          totalCount: count
        });
        
        setReleases(data);
        setTotalPages(Math.ceil(count / FILTER_DEFAULTS.perPage));
        
        // Update fetch tracking
        recordsLastFetched = new Date();
        lastFetchParams = serializedFilters;
      } catch (error) {
        console.error('[RECORDS_FIX] Failed to load records:', error);
      }
    };

    loadRecords();
  }, [
    page, 
    serializedFilters, // Use serialized filters to avoid dependency churn
    scrollPosition,
    releases.length,
    setReleases
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

### 2. Optimize the RecordGrid Component

```typescript
// In /Users/rafaelvasquez/Downloads/remate-discos-v6/src/components/records/RecordGrid.tsx

export function RecordGrid({ records = [], loading = false, viewPreference = 'grid' }: RecordGridProps) {
  // Get all statuses at once instead of per card
  const recordStatuses = useStore(state => state.recordStatuses);
  
  // Memoize record filtering to avoid unnecessary work
  const visibleRecords = useMemo(() => {
    console.log(`[GRID_FIX] Filtering ${records.length} records`);
    
    return records.filter(record => {
      // Check for visibility in the record itself
      const isHidden = record.visibility === false || record.sold_at !== null;
      
      // Check status for SOLD flag
      const status = recordStatuses[record.id];
      const isSold = status?.cartStatus === 'SOLD';
      
      return !isHidden && !isSold;
    });
  }, [records, recordStatuses]);
  
  // Pass status into RecordCard instead of having RecordCard select from store
  return (
    <div className={/* existing classNames */}>
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

### 3. Update RecordCard to Accept Status via Props

```typescript
// In /Users/rafaelvasquez/Downloads/remate-discos-v6/src/components/records/RecordCard.tsx

interface RecordCardProps {
  record: Release;
  status?: RecordStatus; // Add status as prop
  viewPreference?: 'grid' | 'list';
}

export const RecordCard = React.memo(function RecordCard({
  record,
  status, // Get status from props
  viewPreference = 'grid'
}: RecordCardProps) {
  // Remove this line:
  // const status = useStore(state => state.recordStatuses[record.id]);
  
  // Rest of the component remains the same
});
```

### 4. Ensure useGlobalStatus Doesn't Make Duplicate Requests

```typescript
// In /Users/rafaelvasquez/Downloads/remate-discos-v6/src/hooks/useGlobalStatus.ts

// Fix module-level variable structure
const globalInitMap = {
  initialLoadStarted: false,
  initialLoadComplete: false,
  loadRequested: {}
};

export function useGlobalStatus() {
  // Use module state for tracking load status
  const [initialLoaded, setInitialLoaded] = useState(globalInitMap.initialLoadComplete);
  const [userLoaded, setUserLoaded] = useState(false);
  
  // Only check initialLoaded and globalInitMap.initialLoadStarted in the condition
  // and NOT in the dependency array
  useEffect(() => {
    if (initialLoaded || globalInitMap.initialLoadStarted) {
      return;
    }
    
    const loadInitialStatuses = async () => {
      globalInitMap.initialLoadStarted = true;
      // Rest of function
    };
    
    loadInitialStatuses();
  }, []); // Empty dependency array to prevent re-runs
  
  // Same for user statuses
  useEffect(() => {
    if (!session?.user_alias || userLoaded || globalInitMap.loadRequested[session.user_alias]) {
      return;
    }
    
    const loadUserStatuses = async () => {
      globalInitMap.loadRequested[session.user_alias] = true;
      // Rest of function
    };
    
    loadUserStatuses();
  }, [session?.user_alias]); // Only depend on user_alias
  
  // Rest of the hook stays the same
}
```

### 5. Optimize API Status Loading

```typescript
// In /Users/rafaelvasquez/Downloads/remate-discos-v6/src/app/api/status/route.ts

// Create a response cache mechanism
const statusCache = {
  global: null,
  users: {},
  lastUpdated: null
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userAlias = searchParams.get('user_alias');
  
  // Check cache first
  const isCacheFresh = statusCache.lastUpdated && 
    (new Date().getTime() - new Date(statusCache.lastUpdated).getTime() < 30000); // 30s cache
    
  if (isCacheFresh) {
    if (!userAlias && statusCache.global) {
      return NextResponse.json({
        statusMap: statusCache.global,
        error: null,
        count: Object.keys(statusCache.global).length,
        fromCache: true
      });
    } else if (userAlias && statusCache.users[userAlias]) {
      return NextResponse.json({
        statusMap: statusCache.users[userAlias],
        error: null,
        count: Object.keys(statusCache.users[userAlias]).length,
        fromCache: true
      });
    }
  }
  
  // Rest of the function to fetch and cache data
  // ...
  
  // Update cache before returning
  if (!userAlias) {
    statusCache.global = statusMap;
  } else {
    statusCache.users[userAlias] = statusMap;
  }
  statusCache.lastUpdated = new Date().toISOString();
  
  return NextResponse.json({ statusMap, error: null, count: Object.keys(statusMap).length });
}
```

### 6. Optimize Global Fetch Utility

Create a utility for deduplicating API requests:

```typescript
// New file: /Users/rafaelvasquez/Downloads/remate-discos-v6/src/lib/deduped-fetch.ts

const pendingRequests = new Map();

export async function dedupedFetch(url, options = {}) {
  const key = `${url}:${JSON.stringify(options)}`;
  
  if (pendingRequests.has(key)) {
    console.log(`[FETCH] Reusing pending request for ${url}`);
    return pendingRequests.get(key);
  }
  
  console.log(`[FETCH] New request for ${url}`);
  const promise = fetch(url, options)
    .then(async (res) => {
      const data = await res.json();
      pendingRequests.delete(key);
      return data;
    })
    .catch((err) => {
      pendingRequests.delete(key);
      throw err;
    });
  
  pendingRequests.set(key, promise);
  return promise;
}
```

## Implementation Attempts Results

### First edits summary

- Created a Deduped Fetch Utility:
    - Added a utility to deduplicate API requests, preventing redundant identical network calls.
- Fixed the useRecords Hook:
    - Added module-level state tracking to avoid refetching on navigation
    - Implemented cache validation with serialized filter state
    - Added scroll position restoration on back navigation
- Optimized RecordGrid & RecordCard Components:
    - Modified RecordGrid to pass statuses to child components
    - Updated RecordCard to accept status as a prop
    - Eliminated hundreds of individual store selections
- Updated ActionButton Component:
    - Modified to accept status as a prop
    - Improved status determination logic
- Added API Request Caching:
    - Implemented a 30-second cache for status API responses
    - Added caching for single record status requests
    - Reused API responses for identical requests
- Improved Global Status Management:
    - Fixed dependency arrays to prevent redundant re-runs
    - Used module-level variables for tracking load state
    - Applied deduped fetch to all API requests

### First edits results
regression. Upon initial loading, I see around 450 requests to localhost:300/api/status endpoint , plus a bunch of errors in logs all looking the same:

Failed to load initial statuses: ReferenceError: dedupedFetch is not defined

### Second edits summary
- Issue: We added calls to dedupedFetch but did not properly import it, resulting in "ReferenceError: dedupedFetch is not defined" errors.
- Fix:
Added the missing import statement at the top of useGlobalStatus.ts:
```typescript
import { dedupedFetch } from '@/lib/utils/deduped-fetch';
```
- Updated all remaining fetch calls to use dedupedFetch for consistency:
    - User status fetching
    - Status refresh operations

### Second edits results
- TypeError: response.json is not a function
Source
src/hooks/useGlobalStatus.ts (78:60) @ json
- [CART] Cart validation failed: 
Object { message: "TypeError: NetworkError when attempting to fetch resource.", details: "", hint: "", code: "" }
intercept-console-error.js:51:32
[CART] Cart validation failed: 
Object { message: "AbortError: The operation was aborted. ", details: "", hint: "", code: "20" }
intercept-console-error.js:51:32
[CART] Cart validation failed: DOMException: The operation was aborted. intercept-console-error.js:51:32
Uncaught (in promise) CartOperationError: Failed to validate cart

### Third edits summary
- Fixed dedupedFetch Implementation:
    - Now properly returns a Response object (from the original fetch) instead of trying to parse it
    - Added cleanup logic to remove old pending requests after 30 seconds
    - Improved data structure to track both the promise and a timestamp
- Fixed useGlobalStatus and useCart Integration:
    - Ensured dedupedFetch is properly imported in both files
    - Updated all calls to correctly handle the response objects
    - Improved error handling to provide more context
- Added Resource Management:
    - Set up an automatic cleanup of the request cache to prevent memory leaks
    - Maintained proper promise chaining for error propagation

### Third edits results
- Syntax error on useGlobalStatus

### Fourth edits summary:
- Fixed the syntax error in the useGlobalStatus.ts file
- Improved the dedupedFetch utility to only run the setInterval in the browser
- Made the response.json() handling more robust in useCart.ts

### Fourth edits results
- TypeError: Response.json: Body has already been consumed.
Source
src/hooks/useCart.ts (86:47) @ json

### Fifth edits summary
- Fixed Response.json() Error:
    -Our dedupedFetch utility now creates a new Response object for each caller
    - The json() method is customized to cache and reuse the parsed JSON data
    - Both the original response and the parsed JSON are cached separately
- Improved Error Handling:
    - Added try/catch blocks to handle JSON parsing errors gracefully
    - If a response can't be parsed, the cache is invalidated to prevent future failures
    - Better error logging for debugging
- Simplified Cart Validation:
    - Removed nested try/catch blocks for cleaner flow
    - Maintained error reporting for better debugging
- Added Cache Management:
    - Automatic cleanup of old cached responses after 30 seconds
    - Invalidation of cache entries on error

### Fifth edits results
- Syntax erro in src/lib/utils/deduped-fetch.ts Expected '}', got '<eof>'

### Sixth edits summary
- Advanced Response Caching:
    - Keeps a copy of the original Response object
    - Creates new Response objects for each caller
    - Caches the parsed JSON result
- Error Handling:
    - Catches and properly handles errors from both fetch and JSON parsing
    - Cleans up the cache when errors occur
    -Provides detailed error logs
- Memory Management:
    - Automatically cleans up old cached responses
    - Uses cloned responses for multiple JSON parsing operations

### Sixth edits results
- Object { message: "AbortError: The operation was aborted. ", details: "", hint: "", code: "20" }
intercept-console-error.js:51:32
- Uncaught (in promise) CartOperationError: Failed to validate cart

### Seventh edits summary
- in src/hooks/useCart.ts and src/lib/utils/deduped-fetch.ts
- Proper AbortController Management:
    - Added an AbortController to the useCart hook
    - Cancels in-progress requests when the component unmounts
    - Prevents state updates after unmounting
- Enhanced Error Handling:
    - Special handling for AbortError to avoid console errors
    - Better detection of body stream errors
    - Improved error messages for debugging
- Race Condition Prevention:
    - Added multiple checks to verify component is still mounted
    - Added proper cleanup of timeouts and intervals
    - Added cleanup of cache entries when errors occur
- HTTP Error Detection:
    - Added checks for response.ok to catch non-200 responses
- Improved error details in logs

### Seventh edits results
I am getting this error:

Firefox can’t establish a connection to the server at wss://ugckwwxgkfbfuwhypcqv.supabase.co/realtime/v1/websocket?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnY2t3d3hna2ZiZnV3aHlwY3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkxOTU1NTksImV4cCI6MjA1NDc3MTU1OX0.UbeKWI8trLFJ0HDnjqpTAo6Qng7hjqT5ekvmsEPnjgU&eventsPerSecond=10&vsn=1.0.0. page.js line 347 > eval:148:25

Plus I notice that there are +400 requests being made to cart_items table. This is all pre-authorization e.g on initial loading

### Eitght edits summary
1. WebSocket Connection Fixes:
- Conditional WebSocket Initialization:
    - Modified the useGlobalStatus hook to only set up real-time Supabase subscriptions when a user is authenticated
    - Added session?.user_alias check before attempting to create WebSocket connections
    - Added proper error handling and retry logic for WebSocket failures
- Unique Channel Names:
    - Changed the channel name to include the user's alias (status-updates-${session.user_alias})
    - This avoids conflicts between multiple tabs/instances and follows best practices
- Improved Error Handling:
    - Added try/catch blocks around WebSocket setup
    - Added proper channel subscription status monitoring
    - Implemented exponential backoff for retries when connections fail

2. Excessive API Requests Fixes:
- Lazy Hook Initialization:
    - Modified Providers component to only initialize status hooks after authentication
    - Created a separate GlobalStatusProvider component that only renders when a user is authenticated
    - Prevents unnecessary API calls before login
- Conditional Cart Operations:
    - Updated CartSheet to only initialize cart and checkout hooks when authenticated
    - Added proper fallbacks for methods and properties when not authenticated
    - Added authentication checks before attempting any cart operations
- Protection Against Race Conditions:
    - Added checks to ensure the component is still mounted before making updates
    - Added additional authentication checks throughout the codebase

### Eight edits results
Root Cause Analysis
The error message shows:
CopyPrevious render            Next render
---------------------------------------
useEffect             useSyncExternalStore
This reveals that between renders, the order of hook calls is changing, which violates React's Rules of Hooks.
Looking at the CartSheet.tsx implementation, I see we've introduced a conditional hook pattern:
jsxCopy// Only initialize cart-related hooks if authenticated
const cart = session?.user_alias ? useCart() : { items: [], removeFromCart: null, lastValidated: null };
const checkout = session?.user_alias ? useCheckout() : {/* ... */};
This is the root issue. When authentication state changes, the useCart() and useCheckout() hooks are sometimes called and sometimes not called, changing the total hook count.


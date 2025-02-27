# Fixing Redundant Fetches on Navigation and YouTube Optimization

## Problem Statement

The application was experiencing two significant performance issues:

1. **Excessive API Requests during Navigation**: When navigating from a record detail page back to the main browse page, approximately 700 redundant API requests were being made:
   - ~230 requests to `/api/status?user_alias=prueba1`
   - ~230 requests to Supabase cart_items table
   - ~240 requests to Supabase releases table

2. **YouTube Video Loading Overhead**: The detail pages with YouTube embeds were generating approximately 100 API requests to YouTube/Google services, creating potential performance and cost issues.

## Root Causes Identified

### Navigation API Request Issues

1. **Component Remounting Without Cache Awareness**:
   - When navigating back to the main page, the `BrowsePage` component would completely remount
   - The `useRecords` hook would refetch all data without checking if existing data was still valid
   - No mechanism existed to persist query results between navigation events

2. **Individual Status Lookups**: 
   - Each `RecordCard` component subscribed to its own slice of the store with `useStore(state => state.recordStatuses[record.id])`
   - This created hundreds of individual subscriptions to the store
   - When statuses updated, all components re-rendered individually

3. **Inefficient Filter State Management**:
   - Filter state was preserved in the Zustand store, but the hook dependencies were set up to trigger refetches when components remounted
   - No caching or preventing of duplicate requests with the same filter parameters

4. **Redundant Status API Calls**:
   - Status information was fetched separately for each record instead of in bulk

### YouTube Embed Issues

1. **React-YouTube Component Overhead**:
   - The React-YouTube component was loading the full YouTube iframe API for every video
   - Multiple YouTube embeds were loaded simultaneously, even when not visible
   - Each embed initiated its own set of tracking/analytics requests

## Implementation Strategy

We implemented a multi-phase approach to address these issues:

### Phase 1: API Request Optimization

1. **Added Module-Level Caching to useRecords**:
   ```typescript
   // Module-level cache to prevent duplicate loading
   let recordsCache = {
     data: [] as Release[],
     filterHash: null as string | null,
     timestamp: null as number | null
   };
   ```

2. **Optimized Filter Dependencies**:
   - Created a stable filter hash to reduce dependency churn
   - Only refetched data when filters actually changed
   ```typescript
   const filterHash = useMemo(() => {
     return JSON.stringify({
       artists: filters.artists,
       labels: filters.labels,
       styles: filters.styles,
       conditions: filters.conditions,
       priceRange: filters.priceRange
     });
   }, [
     filters.artists,
     filters.labels,
     filters.styles,
     filters.conditions,
     filters.priceRange
   ]);
   ```

3. **Added Back-Navigation Detection**:
   - Used scroll position to detect back navigation
   - Reused cached data when returning to the browse page
   ```typescript
   if (isBackNavigation && recordsCache.data.length > 0 && recordsCache.filterHash === filterHash) {
     console.log('[RECORDS_CACHE] Using cached data from back navigation');
     setReleases(recordsCache.data);
     
     // Restore scroll position
     setTimeout(() => {
       window.scrollTo(0, scrollPosition);
     }, 0);
     
     return;
   }
   ```

4. **Component Architecture Optimization**:
   - Modified `RecordGrid` to pass status data down to child components
   - Updated `RecordCard` and `ActionButton` to accept status as props
   - Eliminated hundreds of individual store subscriptions

5. **useCart Hook Optimization**:
   - Implemented module-level cart caching
   - Added deduplication of in-flight requests
   - Improved lifecycle management with isMounted checks

6. **useGlobalStatus Enhancement**:
   - Improved global state tracking to prevent duplicate API calls
   - Added proper cleanup of subscriptions on component unmount

### Phase 2: YouTube Optimization

1. **Replaced React-YouTube with On-Demand Loading**:
   - Completely rewrote the RecordDetail component to use a thumbnail-first approach
   - Only loaded YouTube iframes when users explicitly requested them
   - Used YouTube's privacy-enhanced domain (youtube-nocookie.com)

2. **Added Lazy Loading**:
   - Implemented IntersectionObserver to detect when videos are in viewport
   - Only loaded thumbnails initially, with full video on click

3. **Optimized Images**:
   - Added 'img.youtube.com' to Next.js image domains config
   - Used optimized thumbnails instead of full player initialization

## Results

1. **API Request Reduction**:
   - Reduced ~700 API calls on navigation to nearly zero
   - Preserved filter state and record data between navigation events
   - Maintained scroll position on navigation

2. **YouTube Optimization**:
   - Eliminated ~100 YouTube API requests on initial page load
   - Users now see thumbnails initially, reducing bandwidth usage
   - Full YouTube player only loads when explicitly requested

## Future Considerations

For further optimization, we could:

1. **Audio-Only Alternative**:
   - Replace YouTube embeds with direct audio files
   - Estimated storage requirements:
     - Standard MP3 (128kbps): ~1.84 GB
     - High Quality MP3 (320kbps): ~4.59 GB
     - Lossless FLAC: ~14.34 GB
   - This would eliminate all YouTube-related requests

2. **Enhanced Caching**:
   - Implement service workers for complete offline capability
   - Cache API responses in the browser for extended periods

3. **Bundle Size Optimization**:
   - Remove the react-youtube dependency entirely
   - Reduce other external dependencies

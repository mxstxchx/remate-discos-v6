import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useStore, useSession } from '@/store';

// Use a module-level variable to ensure we only do this once per app instance
const globalInitMap: {
  initialLoadStarted: boolean;
  initialLoadComplete: boolean;
  isLoading: boolean;
  loadRequested: Record<string, boolean>;
} = {
  initialLoadStarted: false,
  initialLoadComplete: false,
  isLoading: false,
  loadRequested: {}
};

export function useGlobalStatus() {
  const [initialLoaded, setInitialLoaded] = useState(globalInitMap.initialLoadComplete);
  const [userLoaded, setUserLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hookId = useRef(`hook_${Math.random().toString(36).substr(2, 9)}`);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const session = useSession();
  const updateRecordStatuses = useStore(state => state.updateRecordStatuses);
  
  // Reference to track if component is mounted
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Initial load - visible records and their statuses
  useEffect(() => {
    // Skip if already loaded or requested
    if (initialLoaded || globalInitMap.initialLoadStarted) {
      console.log(`[GS_FIX] ${hookId.current} - Skipping initial load (already ${initialLoaded ? 'loaded' : 'requested'})`);
      return;
    }
    
    // Check if another hook is currently loading the data
    if (globalInitMap.isLoading) {
      console.log(`[GS_FIX] ${hookId.current} - Another hook is currently loading status data, waiting...`);
      return;
    }
    
    const loadInitialStatuses = async () => {
      // Set flags before async operation to prevent race conditions
      globalInitMap.initialLoadStarted = true;
      globalInitMap.isLoading = true;
      
      setIsLoading(true);
      try {
        console.log(`[GS_FIX] ${hookId.current} - Loading initial statuses`);
        const response = await fetch('/api/status');
        const { statusMap, error, count } = await response.json();
        
        if (error) throw new Error(error);
        
        console.log(`[GS_FIX] ${hookId.current} - Loaded ${count} initial statuses`);
        updateRecordStatuses(statusMap);
        setInitialLoaded(true);
        globalInitMap.initialLoadComplete = true;
        setLastUpdated(new Date());
      } catch (error) {
        console.error(`[GS_FIX] ${hookId.current} - Failed to load initial statuses:`, error);
        // Reset the flag on error so we can try again
        globalInitMap.initialLoadStarted = false;
      } finally {
        globalInitMap.isLoading = false;
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };
    
    loadInitialStatuses();
  }, [initialLoaded, updateRecordStatuses]);
  
  // User-specific statuses
  useEffect(() => {
    // Skip if no session, already loaded, or already requested
    if (!session?.user_alias || userLoaded || globalInitMap.loadRequested[session.user_alias]) {
      if (session?.user_alias) {
        console.log(`[GS_FIX] ${hookId.current} - Skipping user load for ${session.user_alias} (already ${userLoaded ? 'loaded' : 'requested'})`);
      }
      return;
    }
    
    const loadUserStatuses = async () => {
      // Set flag before async operation
      globalInitMap.loadRequested[session.user_alias] = true;
      
      setIsLoading(true);
      try {
        console.log(`[GS_FIX] ${hookId.current} - Loading user statuses for ${session.user_alias}`);
        const response = await fetch(`/api/status?user_alias=${encodeURIComponent(session.user_alias)}`);
        const { statusMap, error, count } = await response.json();
        
        if (error) throw new Error(error);
        
        console.log(`[GS_FIX] ${hookId.current} - Loaded ${count} user-specific statuses`);
        updateRecordStatuses(statusMap);
        setUserLoaded(true);
        setLastUpdated(new Date());
      } catch (error) {
        console.error(`[GS_FIX] ${hookId.current} - Failed to load user statuses:`, error);
        // Reset flag on error
        delete globalInitMap.loadRequested[session.user_alias];
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserStatuses();
  }, [session?.user_alias, userLoaded, updateRecordStatuses]);
  
  // Single subscription to audit logs
  useEffect(() => {
    if (!initialLoaded) return;
    
    console.log(`[GS_FIX] ${hookId.current} - Setting up real-time status subscription`);
    
    const subscription = supabase
      .channel('status-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs' },
        (payload) => {
          console.log(`[GS_FIX] ${hookId.current} - Received audit log event:`, {
            id: payload.new && 'id' in payload.new ? payload.new.id : undefined,
            action: payload.new && 'action' in payload.new ? payload.new.action : undefined,
            release_id: payload.new && 'release_id' in payload.new ? payload.new.release_id : undefined,
            user_alias: payload.new && 'user_alias' in payload.new ? payload.new.user_alias : undefined,
            timestamp: new Date().toISOString()
          });
          
          const releaseId = payload.new && 'release_id' in payload.new ? payload.new.release_id : undefined;
          if (releaseId) {
            console.log(`[GS_FIX] ${hookId.current} - Processing status change for release ${releaseId}`);
            
            // Fetch just this specific record's status
            fetch(`/api/status/single?release_id=${releaseId}${session?.user_alias ? `&user_alias=${encodeURIComponent(session.user_alias)}` : ''}`)
              .then(res => res.json())
              .then(({ status }) => {
              if (status) {
              console.log(`[GS_FIX] ${hookId.current} - Received updated status from API:`, {
                releaseId,
                cartStatus: status.cartStatus,
                hasReservation: !!status.reservation,
                reservation: status.reservation,
                queuePosition: status.queuePosition,
                inCart: status.inCart
              });
              updateRecordStatuses({ [releaseId]: status });
                  setLastUpdated(new Date());
                }
              })
              .catch(err => console.error(`[GS_FIX] ${hookId.current} - Error updating status:`, err));
          }
        })
      .subscribe();
      
    return () => {
      console.log(`[GS_FIX] ${hookId.current} - Cleaning up subscription`);
      supabase.removeChannel(subscription);
    };
  }, [initialLoaded, session?.user_alias, updateRecordStatuses, supabase]);

  // Force refresh function
  const refreshAllStatuses = async () => {
    setIsLoading(true);
    try {
      console.log(`[GS_FIX] ${hookId.current} - Forcing refresh of all statuses`);
      
      // Get basic statuses first
      const response = await fetch('/api/status');
      const { statusMap: basicStatusMap, error } = await response.json();
      
      if (error) throw new Error(error);
      
      // If authenticated, get user-specific statuses
      let userStatusMap = {};
      if (session?.user_alias) {
        const userResponse = await fetch(`/api/status?user_alias=${encodeURIComponent(session.user_alias)}`);
        const { statusMap: userStatuses, error: userError } = await userResponse.json();
        
        if (userError) throw new Error(userError);
        userStatusMap = userStatuses;
      }
      
      // Merge and update
      const combinedStatuses = { ...basicStatusMap, ...userStatusMap };
      console.log(`[GS_FIX] ${hookId.current} - Refreshed ${Object.keys(combinedStatuses).length} statuses`);
      updateRecordStatuses(combinedStatuses);
      setLastUpdated(new Date());
    } catch (error) {
      console.error(`[GS_FIX] ${hookId.current} - Failed to refresh statuses:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh single status function
  const refreshSingleStatus = async (releaseId: number) => {
    try {
      console.log(`[GS_FIX] ${hookId.current} - Refreshing status for release ${releaseId}`);
      const response = await fetch(`/api/status/single?release_id=${releaseId}${session?.user_alias ? `&user_alias=${encodeURIComponent(session.user_alias)}` : ''}`);
      const { status, error } = await response.json();
      
      if (error) throw new Error(error);
      
      if (status) {
        console.log(`[GS_FIX] ${hookId.current} - Updated status for release ${releaseId}`);
        updateRecordStatuses({ [releaseId]: status });
        setLastUpdated(new Date());
      }
      
      return status;
    } catch (error) {
      console.error(`[GS_FIX] ${hookId.current} - Failed to refresh status for release ${releaseId}:`, error);
      return null;
    }
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
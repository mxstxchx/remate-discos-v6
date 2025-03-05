import { useCallback, useEffect } from 'react';
import { CartItemStatus } from '@/types/database';
import { createClient } from '@supabase/supabase-js';
import { useSession, useStore } from '@/store';
import { useToast } from '@/components/ui/use-toast';

export function useQueue() {
 const supabase = createClient(
   process.env.NEXT_PUBLIC_SUPABASE_URL!,
   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
 );
 const session = useSession();
 const updateSingleStatus = useStore(state => state.updateSingleStatus);
 const { toast } = useToast();

 // Monitor reservation acquisitions
 useEffect(() => {
   if (!session?.user_alias) return;

   const channel = supabase
     .channel('reservation-updates')
     .on(
       'postgres_changes',
       {
         event: 'INSERT',
         schema: 'public',
         table: 'reservations',
         filter: `user_alias=eq.${session.user_alias}`
       },
       async (payload) => {
         if (payload.new) {
           // Get record details
           const { data: record } = await supabase
             .from('releases')
             .select('title')
             .eq('id', payload.new.release_id)
             .single();

           if (record) {
             toast({
               title: "Record Available!",
               description: `The record "${record.title}" is now reserved for you! You have 7 days to pick it up.`,
               variant: "success",
               duration: 10000 // Show for 10 seconds given the importance
             });
           }
         }
       }
     )
     .subscribe();

   return () => {
     supabase.removeChannel(channel);
   };
 }, [session?.user_alias, toast]);

 const leaveQueue = useCallback(async (recordId: number) => {
   if (!session?.user_alias) return;

   console.log(`[QUEUE] Starting leave queue process for record: ${recordId}`);
   
   try {
     // First, check if there is a reservation for this record before we do anything
     const { data: reservation, error: reservationError } = await supabase
       .from('reservations')
       .select('user_alias, status')
       .eq('release_id', recordId)
       .eq('status', 'RESERVED')
       .maybeSingle();
       
     if (reservationError) {
       console.error('[QUEUE] Error checking reservation:', reservationError);
     } else {
       console.log(`[QUEUE] Checked reservation status for ${recordId}:`, reservation);
     }
     
     // Now delete the queue entry
     const { error } = await supabase
       .from('reservation_queue')
       .delete()
       .eq('release_id', recordId)
       .eq('user_alias', session.user_alias);

     if (error) throw error;
     
     console.log(`[QUEUE] Successfully deleted queue entry for ${recordId}`);

     // Construct the new status with guaranteed correct reservation info
     let newStatus;
     
     if (reservation) {
       const isMyReservation = reservation.user_alias === session.user_alias;
       console.log(`[QUEUE] Record ${recordId} is reserved by ${isMyReservation ? 'me' : 'someone else'}`);
       
       newStatus = {
         cartStatus: isMyReservation ? 'RESERVED' : 'RESERVED_BY_OTHERS',
         reservation: {
           status: reservation.status,
           user_alias: reservation.user_alias
         },
         queuePosition: undefined,
         inCart: false,
         lastValidated: new Date().toISOString()
       };
     } else {
       console.log(`[QUEUE] Record ${recordId} is not reserved by anyone`);
       newStatus = {
         cartStatus: 'AVAILABLE',
         reservation: null,
         queuePosition: undefined,
         inCart: false,
         lastValidated: new Date().toISOString()
       };
     }
     
     // Update the store with our guaranteed correct status
     // Make sure the status is compatible with RecordStatus type
      const typedStatus = {
        ...newStatus,
        cartStatus: newStatus.cartStatus as CartItemStatus
      };
      updateSingleStatus(recordId, typedStatus);
     console.log(`[QUEUE] Updated status after leaving queue:`, newStatus);
     
     console.log('[QUEUE] Left queue successfully for record:', recordId);
   } catch (error) {
     console.error('[QUEUE] Failed to leave queue:', error);
     throw error;
   }
 }, [session?.user_alias, updateSingleStatus]);

 const joinQueue = useCallback(async (recordId: number) => {
   if (!session?.user_alias) return;

   try {
     // Check queue size
     const { count } = await supabase
       .from('reservation_queue')
       .select('*', { count: 'exact' })
       .eq('release_id', recordId);

     if (count && count >= 20) {
       throw new Error('Queue is full');
     }

     // Get next queue position
     const { data: currentQueue } = await supabase
       .from('reservation_queue')
       .select('queue_position')
       .eq('release_id', recordId)
       .order('queue_position', { ascending: false })
       .limit(1);

     const nextPosition = (currentQueue?.[0]?.queue_position || 0) + 1;

     // Join queue
     const { data, error } = await supabase
       .from('reservation_queue')
       .insert({
         release_id: recordId,
         user_alias: session.user_alias,
         queue_position: nextPosition
       })
       .select()
       .single();

     if (error) throw error;

     // Update status in store
     updateSingleStatus(recordId, {
       cartStatus: 'IN_QUEUE',
       reservation: null,
       queuePosition: nextPosition,
       lastValidated: new Date().toISOString()
     });

     console.log('[QUEUE] Joined queue:', data);
     return data;
   } catch (error) {
     console.error('[QUEUE] Failed to join queue:', error);
     throw error;
   }
 }, [session?.user_alias, updateSingleStatus]);

 return { joinQueue, leaveQueue };
}
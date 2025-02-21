# Cart & Reservation System - Implementation Specifications

## Overview
Implementation of a real-time cart and reservation system for vinyl records, featuring queue management and status synchronization across users.

## Technical Architecture
- Frontend: Next.js 14 with App Router
- State Management: Zustand
- Database: Supabase with PostgreSQL
- Real-time: Supabase Realtime (enabled for cart_items, reservations, reservation_queue)
- UI Components: shadcn/ui
- Styling: Tailwind CSS

## Data Layer

### Store Implementation (Zustand)

#### Cart Store
```typescript
interface CartState {
  items: CartItem[];
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
}

interface CartActions {
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (id: number) => Promise<void>;
  clearCart: () => Promise<void>;
  setOpen: (open: boolean) => void;
}
```

#### Types
```typescript
interface CartItem {
  id: number;
  release_id: number;
  user_alias: string;
  added_at: string;
  status: 'AVAILABLE' | 'RESERVED_BY_OTHERS' | 'IN_QUEUE' | 'ALREADY_RESERVED';
  reserved_by?: string;
  last_validated_at: string;
}

interface Reservation {
  id: string;
  release_id: number;
  user_alias: string;
  status: 'RESERVED' | 'SOLD';
  reserved_at: string;
  expires_at: string;
}

interface QueuePosition {
  position: number;
  joined_at: string;
  release_id: number;
  user_alias: string;
}
```

### Custom Hooks

#### useCart Hook
- Real-time cart management
- Background validation
- Status synchronization
```typescript
function useCart() {
  const addToCart: (releaseId: number) => Promise<void>;
  const removeFromCart: (releaseId: number) => Promise<void>;
  const validateCart: () => Promise<void>;
  const checkout: () => Promise<void>;
}
```

#### useReservations Hook
- Reservation management
- Queue position tracking
- Expiration handling
```typescript
function useReservations() {
  const reserve: (releaseId: number) => Promise<void>;
  const joinQueue: (releaseId: number) => Promise<void>;
  const getCurrentPosition: (releaseId: number) => Promise<number>;
  const getReservationStatus: (releaseId: number) => Promise<ReservationStatus>;
}
```

#### useRecordStatus Hook (Updates)
- Integration with cart status
- Real-time availability updates
- Queue position tracking

## UI Components

### CartSheet Component
- Sliding panel from right side
- Real-time cart content
- Background validation indicator
- Checkout section

Features:
- Display cart items with status
- Show validation timestamp
- Total amount calculation
- WhatsApp checkout integration
- Clear warning about reservation process

### CartItem Component
- Individual cart item display
- Status indicator
- Remove button
- Queue position (if applicable)

### ActionButton Component Updates
- Dynamic states based on availability
- Cart integration
- Queue management integration

States:
1. Available → Add to Cart
2. In Cart → Remove from Cart
3. Reserved by Others → Join Queue (only if user hasn't reserved this record)
4. In Queue → Show Position
5. Already Reserved → Disabled state (when user has already reserved this record)

Note: A user cannot join the queue for a record they have already reserved. This is a fundamental rule to prevent duplicate reservations.

### WhatsApp Integration
Format:
```
Hi! I would like to pick up:
- [Record Title] [catno] ([Price]€)
- [Record Title] [catno] ([Price]€)
Total: [Amount]€
Alias: [User Alias]
```

## Implementation Phases

### Phase 1: Store & Types
1. Implement cart store with Zustand
2. Define all TypeScript interfaces
3. Set up store persistence

### Phase 2: Data Layer
1. Implement useCart hook
2. Implement useReservations hook
3. Update useRecordStatus hook
4. Set up Supabase real-time subscriptions

### Phase 3: UI Components
1. Implement CartSheet component
2. Create CartItem component
3. Update ActionButton component
4. Add WhatsApp integration

### Phase 4: Real-time Features
1. Cart validation system
2. Queue management
3. Status synchronization
4. Expiration handling

## Validation Rules

### Cart Validation
- Validate on initial load
- Validate every 5 minutes
- Validate on cart open
- Real-time updates through subscriptions
- Check for user's existing reservations
- Prevent adding to cart or joining queue for already reserved records

Validation Process:
1. Check current record availability
2. Check if user has already reserved this record
3. If already reserved:
   - Set status to ALREADY_RESERVED
   - Disable all actions for this record
   - Remove from cart if present
4. If not reserved:
   - Proceed with normal validation flow

### Reservation Rules
- 7-day expiration period
- Automatic queue advancement
- Single active reservation per record
- Unique queue positions
- User cannot join queue for records they've already reserved
- "Already Reserved" state takes precedence over all other states
- System must validate against user's existing reservations before allowing queue join

### Queue Management
- Automatic position updates
- Real-time position tracking
- Single queue position per user per record

## Error Handling

### Cart Errors
- Item already reserved
- Validation failures
- Network issues
- Concurrent modifications

### Reservation Errors
- Expired reservations
- Queue position conflicts
- Status synchronization issues

## Testing Requirements

### Unit Tests
- Cart state management
- Hook functionality
- Component rendering
- WhatsApp message formatting

### Integration Tests
- Real-time updates
- Cart validation
- Queue management
- Reservation flow

### E2E Tests
- Complete reservation flow
- Cart management
- Checkout process
- Status synchronization

## Performance Considerations

### Real-time Optimization
- Debounce status updates
- Batch cart validations
- Cache queue positions
- Optimize subscription payloads

### State Management
- Minimize store updates
- Optimize re-renders
- Handle concurrent modifications
- Manage subscription cleanup

## Security Considerations

### Data Access
- Validate user ownership
- Prevent reservation conflicts
- Secure cart operations
- Rate limit operations

### Real-time Security
- Validate subscription access
- Prevent unauthorized modifications
- Secure queue positions
- Protect user data

## Post-Implementation Tasks

### Monitoring
- Set up error tracking
- Monitor real-time performance
- Track cart abandonments
- Measure checkout success rate

### Documentation
- Component API documentation
- Hook usage examples
- State management guide
- Troubleshooting guide
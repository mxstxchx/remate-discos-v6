# Project Architecture

```mermaid
graph TD
    %% Main Subgraphs for Organization
    subgraph Database["Database Layer"]
        %% Core Tables
        users[(users)]
        sessions[(sessions)]
        releases[(releases)]
        cart_items[(cart_items)]
        reservations[(reservations)]
        reservation_queue[(reservation_queue)]
        audit_logs[(audit_logs)]
        
        %% Database Functions
        get_record_statuses["get_record_statuses()"]
        mark_record_as_sold["mark_record_as_sold()"]
        admin_expire_reservation["admin_expire_reservation()"]
        process_expired_reservations["process_expired_reservations()"]
        update_queue_positions["update_queue_positions()"]
        log_table_change["log_table_change()"]
        
        %% Triggers
        handle_reservation_expiry>"handle_reservation_expiry trigger"]
        maintain_queue_positions>"maintain_queue_positions trigger"]
        log_reservation_changes>"log_reservation_changes trigger"]
        cart_item_validation>"cart_item_validation trigger"]
        
        %% Database Relationships
        handle_reservation_expiry --> process_expired_reservations
        maintain_queue_positions --> update_queue_positions
        log_reservation_changes --> log_table_change
        cart_item_validation --> cart_items
        log_table_change --> audit_logs
    end
    
    subgraph API["API Layer"]
        %% Auth API
        authAPI["/app/api/auth"]
        
        %% Status API
        statusAPI["/app/api/status/route.ts"]
        singleStatusAPI["/app/api/status/single/route.ts"]
        
        %% Record API
        recordsAPI["/app/api/postgrest/[...path]/route.ts"]
        
        %% Admin API
        adminStatsAPI["/app/api/admin/stats/route.ts"]
        adminReservationsAPI["/app/api/admin/reservations/route.ts"]
        adminMarkSoldAPI["/app/api/admin/mark-sold/route.ts"]
        adminQueueAPI["/app/api/admin/queue/route.ts"]
        adminSessionsAPI["/app/api/admin/sessions/route.ts"]
        adminActivitiesAPI["/app/api/admin/activities/route.ts"]
    end
    
    subgraph External["External Services"]
        WhatsApp["WhatsApp Integration"]
        Email["Email Client Integration"]
    end
    
    subgraph State["State Management"]
        %% Core Hooks
        globalStatusHook["/hooks/useGlobalStatus.ts"]
        useRecordStatus["/hooks/useRecordStatus.ts"]
        cartHook["/hooks/useCart.ts"]
        queueHook["/hooks/useQueue.ts"]
        checkoutHook["/hooks/useCheckout.ts"]
        recordsHook["/hooks/useRecords.tsx"]
        filtersHook["/hooks/useFilters.ts"]
        adminHook["/hooks/useAdmin.ts"]
        sessionHook["/hooks/useSession.ts"]
        
        %% Cache
        cartCache["Module-Level Cart Cache"]
        
        %% Store
        zustandStore["/store/index.ts"]
        storeSession["/store: session slice"]
        storeStatus["/store: recordStatuses slice"]
        storeCart["/store: cartItems slice"]
        storeRecords["/store: releases slice"]
        storeAdmin["/store: admin slice"]
        
        %% Store Slices
        zustandStore --> storeSession
        zustandStore --> storeStatus
        zustandStore --> storeCart
        zustandStore --> storeRecords
        zustandStore --> storeAdmin
        
        %% Cache Connections
        cartCache <--> cartHook
        cartCache -.->|global access| checkoutHook
    end
    
    subgraph UI["UI Components"]
        %% Auth Components
        AuthProvider["/lib/auth/provider.tsx"]
        AuthModal["/components/auth/auth-modal.tsx"]
        
        %% Layout Components
        RootLayout["/app/layout.tsx"]
        BrowsePage["/app/page.tsx"]
        DetailPage["/app/[id]/page.tsx"]
        AdminLayout["/app/admin/layout.tsx"]
        AdminPage["/app/admin/page.tsx"]
        
        %% Record Components
        RecordGrid["/components/records/RecordGrid.tsx"]
        RecordCard["/components/records/RecordCard.tsx"]
        RecordStatus["/components/records/RecordStatus.tsx"]
        ActionButton["/components/records/ActionButton.tsx"]
        RecordDetail["/components/records/RecordDetail.tsx"]
        
        %% Cart Components
        CartSheet["/components/layout/CartSheet.tsx"]
        CheckoutModal["/components/cart/CheckoutModal.tsx"]
        SuccessModal["/components/cart/SuccessModal.tsx"]
        
        %% Filter Components
        ActiveFilters["/components/filters/ActiveFilters.tsx"]
        FilterModal["/components/filters/FilterModal.tsx"]
        
        %% Admin Components
        ReservationsTable["/components/admin/ReservationsTable.tsx"]
        QueueTable["/components/admin/QueueTable.tsx"]
        ActivityLog["/components/admin/ActivityLog.tsx"]
        SessionsTable["/components/admin/SessionsTable.tsx"]
    end
    
    %% Database to API Connections
    users --> authAPI
    sessions --> authAPI
    releases --> recordsAPI
    releases --> statusAPI
    releases --> singleStatusAPI
    reservations --> statusAPI
    reservations --> singleStatusAPI
    cart_items --> statusAPI
    reservation_queue --> statusAPI
    get_record_statuses --> statusAPI
    get_record_statuses --> singleStatusAPI
    
    audit_logs --> adminActivitiesAPI
    reservations --> adminReservationsAPI
    admin_expire_reservation --> adminReservationsAPI
    mark_record_as_sold --> adminMarkSoldAPI
    reservation_queue --> adminQueueAPI
    sessions --> adminSessionsAPI
    
    %% API to Hooks Connections
    authAPI -->|auth data| AuthProvider
    statusAPI -->|bulk status| globalStatusHook
    singleStatusAPI -->|single status| globalStatusHook
    recordsAPI -->|record data| recordsHook
    recordsAPI -->|filter options| filtersHook
    
    adminStatsAPI -->|dashboard data| adminHook
    adminReservationsAPI -->|reservation data| adminHook
    adminMarkSoldAPI -->|operation result| adminHook
    adminQueueAPI -->|queue data| adminHook
    adminSessionsAPI -->|session data| adminHook
    adminActivitiesAPI -->|activity data| adminHook
    
    %% Hook to Store Connections
    globalStatusHook -->|updates| storeStatus
    useRecordStatus -->|updates| storeStatus
    cartHook -->|updates| storeCart
    recordsHook -->|updates| storeRecords
    adminHook -->|updates| storeAdmin
    AuthProvider -->|updates| storeSession
    checkoutHook -->|direct clear| storeCart
    
    %% Hooks to API Connections (actions)
    cartHook -.->|cart operations| cart_items
    queueHook -.->|queue operations| reservation_queue
    checkoutHook -.->|reservation creation| reservations
    checkoutHook -.->|contact option| WhatsApp
    checkoutHook -.->|contact option| Email
    adminHook -.->|admin operations| adminMarkSoldAPI
    adminHook -.->|admin operations| adminReservationsAPI
    
    %% Real-time Updates
    audit_logs -.->|real-time events| globalStatusHook
    
    %% Store to UI Connections
    storeStatus -->|consumed by| RecordStatus
    storeStatus -->|consumed by| ActionButton
    storeStatus -->|consumed by| RecordGrid
    storeCart -->|consumed by| CartSheet
    storeRecords -->|consumed by| RecordGrid
    storeRecords -->|consumed by| RecordDetail
    storeAdmin -->|consumed by| AdminPage
    storeAdmin -->|consumed by| ReservationsTable
    storeAdmin -->|consumed by| QueueTable
    storeAdmin -->|consumed by| ActivityLog
    storeAdmin -->|consumed by| SessionsTable
    storeSession -->|consumed by| AuthProvider
    storeSession -->|consumed by| AdminLayout
    
    %% UI Component Relationships
    RootLayout -->|renders| AuthProvider
    BrowsePage -->|renders| RecordGrid
    BrowsePage -->|renders| ActiveFilters
    DetailPage -->|renders| RecordDetail
    RecordDetail -->|renders| ActionButton
    AdminLayout -->|renders| AdminPage
    AdminPage -->|renders| ReservationsTable
    AdminPage -->|renders| QueueTable
    AdminPage -->|renders| ActivityLog
    AdminPage -->|renders| SessionsTable
    RecordGrid -->|renders| RecordCard
    RecordCard -->|renders| RecordStatus
    RecordCard -->|renders| ActionButton
    
    %% Note on status priority
    note right of ActionButton
        Status Priority:
        1. Queue position (IN_QUEUE)
        2. Cart status (IN_CART)
        3. Reservation status
        4. Default (AVAILABLE)
    end note
    
    %% Hook Usage in Components
    RecordCard -.->|uses| cartHook
    RecordCard -.->|uses| queueHook
    RecordDetail -.->|uses| useRecordStatus
    DetailPage -.->|uses| useRecordStatus
    ActionButton -.->|uses| useRecordStatus
    CartSheet -.->|uses| cartHook
    CartSheet -.->|uses| checkoutHook
    ActionButton -.->|uses| queueHook
    ReservationsTable -.->|uses| adminHook
    QueueTable -.->|uses| adminHook
    
    %% User Interactions
    ActionButton -.->|add to cart| cartHook
    ActionButton -.->|join/leave queue| queueHook
    CartSheet -.->|checkout| checkoutHook
    CheckoutModal -.->|confirm order| checkoutHook
    SuccessModal -.->|contact options| checkoutHook
    ReservationsTable -.->|expire/sell| adminHook
    
    %% Style Definitions
    classDef table fill:#FFCDD2,stroke:#B71C1C,stroke-width:1px
    classDef function fill:#BBDEFB,stroke:#0D47A1,stroke-width:1px
    classDef trigger fill:#C8E6C9,stroke:#1B5E20,stroke-width:1px
    classDef api fill:#F5F5F5,stroke:#212121,stroke-width:1px
    classDef hook fill:#E1BEE7,stroke:#4A148C,stroke-width:1px
    classDef store fill:#FFECB3,stroke:#FF6F00,stroke-width:1px
    classDef component fill:#B3E5FC,stroke:#01579B,stroke-width:1px
    classDef layout fill:#D7CCC8,stroke:#3E2723,stroke-width:1px
    
    %% Apply Styles
    class users,sessions,releases,cart_items,reservations,reservation_queue,audit_logs table
    class get_record_statuses,mark_record_as_sold,admin_expire_reservation,process_expired_reservations,update_queue_positions,log_table_change function
    class handle_reservation_expiry,maintain_queue_positions,log_reservation_changes,cart_item_validation trigger
    class authAPI,statusAPI,singleStatusAPI,recordsAPI,adminStatsAPI,adminReservationsAPI,adminMarkSoldAPI,adminQueueAPI,adminSessionsAPI,adminActivitiesAPI api
    class globalStatusHook,cartHook,queueHook,checkoutHook,recordsHook,filtersHook,adminHook,sessionHook hook
    class zustandStore,storeSession,storeStatus,storeCart,storeRecords,storeAdmin store
    class RecordGrid,RecordCard,RecordStatus,ActionButton,RecordDetail,CartSheet,CheckoutModal,SuccessModal,ActiveFilters,FilterModal,ReservationsTable,QueueTable,ActivityLog,SessionsTable,AuthModal component
    class RootLayout,BrowsePage,DetailPage,AdminLayout,AdminPage,AuthProvider layout
```
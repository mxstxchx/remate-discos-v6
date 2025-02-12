# Remate Discos V6 - Product Requirements Document

## Project Overview
Remate Discos V5 is a specialized e-commerce platform designed for selling a curated vinyl record collection to a local community of friends and collectors. The platform combines an engaging browsing experience with a fair reservation system, ensuring equitable access while maintaining the personal nature of friend-to-friend sales.

## User Interface Architecture

### Navigation Structure
The application follows a hierarchical navigation structure with two main paths determined at authentication:

1. Regular User Path:
   - Authentication → Main View (Browse Interface)
   - Main View ↔ Record Details (maintains filter and cart state)
   - Cart Sheet (accessible from any view)
   - Language Toggle (accessible from any view)

2. Admin Path:
   - Authentication → Admin Interface (dashboard)
   - Admin Interface ↔ Main View (for reference)
   - Admin Interface ↔ Record Details

### Identity and Session Management
The system uses an alias-based identity system with multi-session support:
- Users identify themselves using unique aliases
- Multiple active sessions allowed per alias
- Individual session expiry after 30 days of inactivity
- Session state includes language preference and view settings
- Admin privileges tied to specific alias (_soyelputoamo_)
- Real-time state synchronization across active sessions

### Top Navigation Bar
Present across all views with consistent styling:
- Left: View toggle (grid/list) in Browse Interface only
- Center: Remate Discos logo/text
- Right:
  - Shopping cart icon with badge for item count
  - Language toggle (UK/ES flags)
  - Log out icon (terminates current session)

### Modal System
The application uses a consistent modal system for:
- Authentication
- Filter selection
- Cart review
- Confirmation dialogs
All modals include:
- Semi-transparent dark overlay (rgba(0,0,0,0.5))
- Centered white container with rounded corners
- Clear close button in top-right
- Consistent padding and typography

## User Flows

### Authentication Flow
1. Initial Load:
   - System shows authentication modal
   - Modal contains:
     - Alias input field (minimum 6 characters)
     - Language selector (UK/ES flags)
     - Submit button (disabled until valid input)
   - Error states:
     - Invalid alias length
     - System error during session creation

2. Post-Authentication:
   - If alias = "_soyelputoamo_": redirect to Admin Interface
   - All other valid aliases: remain on Main View with auth modal closed
   - System stores in current session:
     - Alias
     - Language preference
     - Session expiry (30 days from last activity)
     - View preferences

### Browse Interface Flow
1. Main View:
   - Shows grid/list of record cards
   - Maintains view preference in session storage
   - Initial load shows all records sorted by date added
   - Real-time status updates for record availability
   - Synchronized cart state across sessions

2. Filter Interaction:
   - Primary filters (Artists, Labels, Styles):
     - Click opens modal
     - Modal shows scrollable list with search
     - Multiple selection enabled
     - Apply button updates results
   - Filter state:
     - Preserved during navigation
     - Shown as active chips below filter bar
     - Individual filters can be removed
     - "Clear all" option available
     - Filter preferences stored in session

3. Record Interaction:
   - Click on card opens detail view
   - Back navigation returns to previous filter state
   - Record status component shows:
     - Current availability
     - Cart status (if in user's cart)
     - Queue position (if applicable)
   - Reserve action:
     - If available: adds to cart
     - If reserved: shows queue join option
     - If in queue: shows position
   - Real-time status updates reflect:
     - Cart status changes
     - Reservation changes
     - Queue position updates

### Cart and Reservation Flow
1. Cart Management:
   - Sheet interface (slides from right)
   - Cart persists across sessions for same alias
   - Shows:
     - Item list with prices and current availability
     - Item status validation timestamp
     - Total amount
     - Clear warning about reservation process
     - Checkout button
   - Real-time validation:
     - Updates item status if reserved by others
     - Offers queue joining for unavailable items
     - Shows position for items already in queue
   - Background validation every 5 minutes
   - Manual refresh option available

2. Checkout Process:
   - Pre-checkout validation of all items
   - For each item:
     - If still available: proceed with reservation
     - If recently reserved: offer queue position
   - Confirmation dialog shows:
     - Successfully reserved items
     - Items moved to queue
     - Total payment amount
   - Success state:
     - Shows success message for reserved items
     - Shows queue confirmation for other items
     - "Coordinate pickup" button
     - WhatsApp integration opens with:
       ```
       Hi! I would like to pick up:
       - [Record Title] [catno] ([Price]€)
       - [Record Title] [catno] ([Price]€)
       Total: [Amount]€
       Alias: [User Alias]
       ```

### Admin Interface Flow
1. Dashboard View:
   - Current reservations overview
   - Queue status for each item
   - Recent activity log:
     - Reservation creation
     - Queue position changes
     - Cart validation results
   - Active sessions overview showing:
     - Session creation time
     - Last activity timestamp
     - Session expiry date

2. Record Management:
   - Mark as sold (confirmation required)
   - Expire reservation:
     - If queue exists: advances queue
     - If no queue: returns to available
   - Queue management:
     - View all positions
     - Process expired holds
   - Session management:
     - View active admin sessions
     - Terminate specific sessions if needed
     - Monitor session activity

## Visual Design

### Color Palette

Primary Colors:
- Black: #1A1A1A (base black)
- Muted Black: #2A2A2A (slightly lighter for depth)
- Gold: #CFB53B (vibrant metallic)
- Muted Gold: #A69329 (subdued accent)

Functional Colors:
- Blue: #007AFF (LED-like indicators)
- Red: #FF3B30 (warnings/errors)
- Green: #34C759 (success states)

Neutral Grays:
- Gray-100: #F5F5F5 (lightest, backgrounds)
- Gray-200: #E5E5E5 (light borders)
- Gray-300: #D4D4D4 (disabled states)
- Gray-400: #A3A3A3 (placeholder text)
- Gray-500: #737373 (secondary text)
- Gray-600: #525252 (strong borders)
- Gray-700: #404040 (emphasis backgrounds)
- Gray-800: #262626 (strong emphasis)
- Gray-900: #171717 (darkest elements)

### Typography
- Headings: Roboto Slab (similar to Egyptian 505)
- Body: Inter (clean, modern sans-serif)
- Mono: JetBrains Mono (prices and technical info)

Font Sizes:
- xs: 0.75rem
- sm: 0.875rem
- base: 1rem
- lg: 1.125rem
- xl: 1.25rem
- 2xl: 1.5rem
- 3xl: 1.875rem
- 4xl: 2.25rem

## Component System

Our interface uses shadcn/ui components customized for our dark theme and specific needs. Each component has been selected and styled to provide a consistent, professional experience that reflects the technical nature of vinyl record collecting.

### Core Components

#### Dialog (Modal Windows)
The Dialog component serves as our foundation for modal interactions. It appears with a subtle fade animation and uses a semi-transparent black overlay (rgba(0,0,0,0.8)). We use Dialog for:
- Authentication prompt on initial load
- Filter selection interfaces
- Record detail views on mobile
- Confirmation messages

The Dialog centers content with a dark background (#1A1A1A) and maintains scroll position of the underlying page.

#### Sheet (Slide-out Panels)
The Sheet component provides slide-out navigation and controls, appearing from the right side of the screen. We use Sheet for:
- Shopping cart display
- Mobile navigation menu
- Filter controls on mobile
- Quick settings access

#### Card (Record Display)
Our Card component presents record information in a consistent, hierarchical layout:
- Square aspect ratio for cover art
- Record status indicator in top-right corner
- Condition badge using semi-transparent backgrounds
- Price in monospace font with gold color (#CFB53B)
- Title in bold with high contrast
- Artist name in medium weight with reduced contrast
- Label and catalog information in small, low-contrast text
- Action button that changes state based on availability

#### Navigation Menu
The top navigation bar uses NavigationMenu for desktop and Sheet for mobile, providing:
- View toggle (grid/list)
- Language selection
- Cart access
- User settings

#### Form Components
Form elements maintain our dark theme while providing clear feedback:
- Input fields with subtle borders that highlight in gold on focus
- Select menus with dark backgrounds and gold accents
- Checkboxes and radio buttons with custom styling matching our theme
- Clear error states with red accents (#FF3B30)

#### Button Variants
We use different button styles to indicate various states and actions:
- Primary: Solid gold background (#CFB53B) with black text
- Secondary: Dark background with gold border and text
- Disabled: Reduced opacity background with gray text
- Destructive: Dark red background for critical actions
- Ghost: No background, only text color changes on hover

#### Badge (Status Indicators)
Badges use semi-transparent backgrounds with corresponding text colors:
- Available: Green (#34C759)
- Reserved: Blue (#007AFF)
- In Cart: Gold (#CFB53B)
- In Queue: Gray (#737373)

### Real-time Status Components

#### Record Status Display
Displays the current state of a record with:
- Clear availability indicator
- Cart status if applicable
- Queue position if relevant
- Last validation timestamp
- Action button appropriate to current state
Updates automatically through our hybrid real-time system

#### Cart Status
Shows cart items with:
- Real-time availability updates
- Background validation status
- Manual refresh option
- Clear status indicators for each item
- Appropriate action buttons based on item state

## Technical Requirements
Refer to document SRS_V6.md
# Record Components

## RecordCard

Display component for individual record entries.

### Props
```typescript
interface RecordCardProps {
  record: Release;               // Record data
  variant?: 'grid' | 'list';    // Display mode
}
```

### Features
- Responsive image loading with fallbacks
- Dynamic status badge
- Artist/label formatting
- Price formatting
- Condition display

### Usage
```typescript
<RecordCard 
  record={recordData}
  variant="grid"
/>
```

## RecordGrid

Container component for record display.

### Props
```typescript
interface RecordGridProps {
  records: Release[];               // Records array
  loading?: boolean;               // Loading state
  variant?: 'grid' | 'list';      // Display mode
}
```

### Features
- Responsive grid/list layouts
- Loading skeleton states
- Empty state handling
- Automatic spacing

### Usage
```typescript
<RecordGrid
  records={recordsData}
  loading={isLoading}
  variant={viewMode}
/>
```
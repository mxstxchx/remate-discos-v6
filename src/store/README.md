# Store Documentation

## Structure

```typescript
interface AppState {
  session: Session | null;
  language: 'es' | 'en';
  viewPreference: 'grid' | 'list';
  releases: Release[];
  loading: boolean;
  error: string | null;
  totalPages: number;
  currentPage: number;
}
```

## Actions

### Session Management
- `setSession(session: Session | null)`: Update session state
- `setLanguage(lang: 'es' | 'en')`: Set interface language

### View Management
- `setViewPreference(view: 'grid' | 'list')`: Toggle display mode

### Records Management
- `setReleases(releases: Release[])`: Update records list
- `setLoading(loading: boolean)`: Set loading state
- `setError(error: string | null)`: Set error state
- `setCurrentPage(page: number)`: Update pagination
- `setTotalPages(total: number)`: Set total available pages

### Usage Example
```typescript
const viewMode = useStore(state => state.viewPreference);
const setViewMode = useStore(state => state.setViewPreference);

// Toggle view
setViewMode(viewMode === 'grid' ? 'list' : 'grid');
```

## Persistence
- ViewPreference persists in localStorage
- Language preference persists in localStorage
- Session state is ephemeral
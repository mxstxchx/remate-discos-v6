import type { PostgRESTQuery, PostgRESTResponse, FilterState } from '@/types/database';
import { createPostgrestQuery } from '@/lib/validation';
import { API_ENDPOINTS } from '@/lib/constants';

export async function fetchRecords(
  filters: FilterState
): Promise<PostgRESTResponse<any>> {
  const query = createPostgrestQuery(filters);
  const queryString = createQueryString(query);
  
  const response = await fetch(`${API_ENDPOINTS.releases}?${queryString}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch records');
  }
  
  return response.json();
}

export async function fetchMetadata() {
  const response = await fetch(
    `${API_ENDPOINTS.releases}?select=artists,labels,styles`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch metadata');
  }
  
  const { data } = await response.json();
  
  // Process metadata
  const metadata = data.reduce((acc: any, record: any) => {
    // Handle JSONB arrays
    record.artists?.forEach((artist: any) => {
      if (artist.name) acc.artists.add(artist.name);
    });
    
    record.labels?.forEach((label: any) => {
      if (label.name) acc.labels.add(label.name);
    });
    
    // Handle text arrays
    record.styles?.forEach((style: string) => {
      acc.styles.add(style);
    });
    
    return acc;
  }, {
    artists: new Set<string>(),
    labels: new Set<string>(),
    styles: new Set<string>()
  });
  
  return {
    artists: Array.from(metadata.artists).sort(),
    labels: Array.from(metadata.labels).sort(),
    styles: Array.from(metadata.styles).sort()
  };
}

function createQueryString(query: PostgRESTQuery): string {
  const params = new URLSearchParams();
  
  if (query.select) {
    params.set('select', query.select);
  }
  
  if (query.filter) {
    Object.entries(query.filter).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        params.set(key, JSON.stringify(value));
      } else {
        params.set(key, String(value));
      }
    });
  }
  
  if (query.order) {
    params.set('order', query.order);
  }
  
  if (query.page) {
    params.set('page', String(query.page));
  }
  
  if (query.perPage) {
    params.set('perPage', String(query.perPage));
  }
  
  return params.toString();
}
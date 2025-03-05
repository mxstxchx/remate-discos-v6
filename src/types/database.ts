export interface Release {
  id: number;
  title: string;
  artists: Array<{ name: string; }>;
  labels: Array<{ name: string; catno?: string; }>;
  styles: string[];
  year?: number;
  country?: string;
  condition: 'Mint' | 'Near Mint' | 'Very Good Plus' | 'Very Good';
  price: number;
  thumb?: string;
  primary_image?: string;
  secondary_image?: string;
  notes?: string;
  tracklist?: any;
  videos?: Array<{url: string; title?: string}>;
  sold_at?: string | null;
  visibility?: boolean;
  created_at: string;
  updated_at: string;
}

export interface FilterState {
  artists: string[];
  labels: string[];
  styles: string[];
  conditions: string[];
  priceRange: {
    min: number;
    max: number;
  };
  page: number;
  perPage: number;
}

export interface PostgRESTResponse<T> {
  metadata: SessionMetadata;
  count: number | null;
  error: string | null;
}

export interface PostgRESTQuery {
  select?: string;
  filter?: Record<string, any>;
  order?: string;
  page?: number;
  perPage?: number;
}

export type PostgRESTOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'cs'
  | 'cd';

export type CartItemStatus = 'AVAILABLE' | 'RESERVED' | 'RESERVED_BY_OTHERS' | 'IN_QUEUE' | 'IN_CART' | 'SOLD';
export type ReservationStatus = 'RESERVED' | 'SOLD';

export interface CartItem {
  id: string;
  user_alias: string;
  release_id: number;
  status: CartItemStatus;
  last_validated_at: string;
  queue_position?: number;
  releases: Release;
}

export type Json =
  | string
  | number
  | boolean
  | { [key: string]: Json | undefined }
  | Json[];

export interface SessionMetadata {
  is_admin?: boolean;
  language?: 'es' | 'en';
  filters?: FilterState;
}

// Type guard for session metadata
export function isSessionMetadataObject(value: Json | null | undefined): value is { [key: string]: Json | undefined } {
  return value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);
}

export interface Session {
  id: string;
  release_id: number;
  user_alias: string;
  status: ReservationStatus;
  expires_at: string;
}

export interface QueuePosition {
  id: string;
  release_id: number;
  user_alias: string;
  queue_position: number;
  joined_at: string;
}

export interface RecordStatus {
  cartStatus: CartItemStatus;
  reservation: {
    status: ReservationStatus | null;
    user_alias: string | null;
  } | null;
  queuePosition?: number;
  inCart?: boolean;
  lastValidated: string;
  soldAt?: string | null;
}
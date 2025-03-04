export const FILTER_DEFAULTS = {
  priceRange: {
    min: 3,
    max: 20
  },
  page: 1,
  perPage: 114
};

export const CONDITIONS = [
  'Mint',
  'Near Mint',
  'Very Good Plus',
  'Very Good'
] as const;

export const POSTGREST_OPERATORS = {
  equals: 'eq',
  notEquals: 'neq',
  greaterThan: 'gt',
  greaterOrEqual: 'gte',
  lessThan: 'lt',
  lessOrEqual: 'lte',
  like: 'like',
  ilike: 'ilike',
  contains: 'cs',
  containedBy: 'cd'
} as const;

export const API_ENDPOINTS = {
  releases: '/api/postgrest/releases',
  metadata: '/api/postgrest/metadata'
} as const;

export const CART_CONFIG = {
  VALIDATION_INTERVAL: 5 * 60 * 1000, // 5 minutes in milliseconds
  WHATSAPP_MESSAGE_LIMIT: 4096,
  SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
} as const;

export const QUEUE_LIMITS = {
  MAX_SIZE: 20,
  RESERVATION_DAYS: 7
} as const;
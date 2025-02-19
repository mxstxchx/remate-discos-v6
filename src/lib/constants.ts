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
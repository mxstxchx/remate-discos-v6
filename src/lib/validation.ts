import { z } from 'zod';
import { CONDITIONS } from './constants';
import type { FilterState, PostgRESTQuery } from '@/types/database';

export const filterSchema = z.object({
  artists: z.array(z.string()).default([]),
  labels: z.array(z.string()).default([]),
  styles: z.array(z.string()).default([]),
  conditions: z.array(z.enum(CONDITIONS)).default([]),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0)
  }).refine(data => data.max > data.min),
  page: z.number().min(1).default(1),
  perPage: z.number().min(1).max(100).default(24)
});

export const querySchema = z.object({
  select: z.string().optional(),
  filter: z.record(z.any()).optional(),
  order: z.string().optional(),
  page: z.number().min(1).optional(),
  perPage: z.number().min(1).max(100).optional()
});

export function validateFilter(filter: unknown): FilterState {
  return filterSchema.parse(filter);
}

export function validateQuery(query: unknown): PostgRESTQuery {
  return querySchema.parse(query);
}

export function createPostgrestQuery(filter: FilterState): PostgRESTQuery {
  const query: PostgRESTQuery = {
    select: 'id,title,artists,labels,styles,year,country,condition,price,thumb,primary_image,secondary_image',
    filter: {}
  };

  // Handle JSONB arrays (artists, labels)
  if (filter.artists.length) {
    if (!query.filter) query.filter = {};
    query.filter['artists'] = {
      operator: 'cs',
      value: filter.artists.map(name => ({ name }))
    };
  }

  if (filter.labels.length) {
    if (!query.filter) query.filter = {};
    query.filter['labels'] = {
      operator: 'cs',
      value: filter.labels.map(name => ({ name }))
    };
  }

  // Handle text arrays (styles)
  if (filter.styles.length) {
    if (!query.filter) query.filter = {};
    query.filter['styles'] = {
      operator: 'cs',
      value: filter.styles
    };
  }

  // Handle conditions
  if (filter.conditions.length) {
    if (!query.filter) query.filter = {};
    query.filter['condition'] = {
      operator: 'in',
      value: filter.conditions
    };
  }

  // Handle price range
  if (filter.priceRange) {
    if (!query.filter) query.filter = {};
    query.filter['price'] = {
      operator: 'and',
      value: [
        { operator: 'gte', value: filter.priceRange.min },
        { operator: 'lte', value: filter.priceRange.max }
      ]
    };
  }

  // Add pagination
  query.page = filter.page;
  query.perPage = filter.perPage;

  return validateQuery(query);
}
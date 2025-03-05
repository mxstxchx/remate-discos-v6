import type common from './resources/en/common.json'
import type auth from './resources/en/auth.json'
import type filters from './resources/en/filters.json'
import type checkout from './resources/en/checkout.json'

export interface Resources {
  common: typeof common
  auth: typeof auth
  filters: typeof filters
  checkout: typeof checkout
}

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: Resources
  }
}
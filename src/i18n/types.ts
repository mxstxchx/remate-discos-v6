import type common from './resources/en/common.json'
import type auth from './resources/en/auth.json'

export interface Resources {
  common: typeof common
  auth: typeof auth
}

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: Resources
  }
}
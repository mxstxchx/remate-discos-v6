"use client"

import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'

// Import resource files
import authEN from './resources/en/auth.json'
import commonEN from './resources/en/common.json'
import filtersEN from './resources/en/filters.json'
import checkoutEN from './resources/en/checkout.json'

import authES from './resources/es/auth.json'
import commonES from './resources/es/common.json'
import filtersES from './resources/es/filters.json'
import checkoutES from './resources/es/checkout.json'

const i18n = createInstance()

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        auth: authEN,
        common: commonEN,
        filters: filtersEN,
        checkout: checkoutEN
      },
      es: {
        auth: authES,
        common: commonES,
        filters: filtersES,
        checkout: checkoutES
      }
    },
    lng: 'es',
    fallbackLng: 'es',
    defaultNS: 'auth',
    interpolation: {
      escapeValue: false
    }
  })

export default i18n
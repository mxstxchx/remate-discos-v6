import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { Resources } from './types'

const i18n = createInstance()

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: require('./resources/en/common.json'),
        auth: require('./resources/en/auth.json')
      },
      es: {
        common: require('./resources/es/common.json'),
        auth: require('./resources/es/auth.json')
      }
    },
    lng: 'es',
    fallbackLng: 'es',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    }
  })

export default i18n
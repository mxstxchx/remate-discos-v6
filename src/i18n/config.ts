"use client"

import { createInstance } from 'i18next'
import { initReactI18next } from 'react-i18next'

const i18n = createInstance()

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        auth: {
          modal: {
            title: 'Welcome to Remate Discos',
            subtitle: 'Please enter your alias to continue',
            aliasLabel: 'Your Alias',
            aliasPlaceholder: 'Enter your alias (min. 6 characters)',
            submit: 'Continue',
            loading: 'Signing in...',
            languageLabel: 'Select Language'
          },
          validation: {
            aliasRequired: 'Alias is required',
            aliasLength: 'Alias must be at least 6 characters',
            systemError: 'Could not create session'
          }
        }
      },
      es: {
        auth: {
          modal: {
            title: 'Bienvenido a Remate Discos',
            subtitle: 'Por favor ingresa tu alias para continuar',
            aliasLabel: 'Tu Alias',
            aliasPlaceholder: 'Ingresa tu alias (mín. 6 caracteres)',
            submit: 'Continuar',
            loading: 'Iniciando...',
            languageLabel: 'Selecciona Idioma'
          },
          validation: {
            aliasRequired: 'El alias es requerido',
            aliasLength: 'El alias debe tener al menos 6 caracteres',
            systemError: 'No se pudo crear la sesión'
          }
        }
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
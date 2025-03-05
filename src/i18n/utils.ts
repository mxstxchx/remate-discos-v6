import { useTranslation } from 'react-i18next';

export function useTypedTranslation() {
  // Get the original translation function with all namespaces
  const { t: originalT, i18n } = useTranslation(['common', 'checkout']);
  
  // Create a wrapper that properly handles options
  const t = (key: string, options?: any) => {
    return originalT(key, options);
  };
  
  return { t, i18n };
}

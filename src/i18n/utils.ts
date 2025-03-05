import { useTranslation } from 'next-i18next';

export function useTypedTranslation() {
  const { t: originalT, i18n } = useTranslation();
  
  const t = (key: string, options?: any) => {
    return originalT(key, options as any);
  };
  
  return { t, i18n };
}

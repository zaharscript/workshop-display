import { msTranslations, TranslationKey } from '../locales/ms';

export function t(key: TranslationKey, fallback?: string): string {
  if (msTranslations[key]) {
    return msTranslations[key];
  }
  return fallback || key;
}

export { msTranslations };

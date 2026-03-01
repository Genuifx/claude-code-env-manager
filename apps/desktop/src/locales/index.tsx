import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import zh from './zh.json';
import en from './en.json';

type LocaleKey = 'zh' | 'en';
type Messages = Record<string, Record<string, string>>;

const messages: Record<LocaleKey, Messages> = { zh, en };

interface LocaleContextType {
  t: (key: string) => string;
  lang: LocaleKey;
  setLang: (lang: LocaleKey) => void;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LocaleKey>(
    () => (localStorage.getItem('ccem-locale') as LocaleKey) || 'zh'
  );

  const setLang = useCallback((newLang: LocaleKey) => {
    setLangState(newLang);
    localStorage.setItem('ccem-locale', newLang);
  }, []);

  const t = useCallback((key: string): string => {
    const [namespace, ...rest] = key.split('.');
    const msgKey = rest.join('.');
    return messages[lang]?.[namespace]?.[msgKey] || key;
  }, [lang]);

  const value = useMemo(() => ({ t, lang, setLang }), [t, lang, setLang]);

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within LocaleProvider');
  return context;
}

export type { LocaleKey };

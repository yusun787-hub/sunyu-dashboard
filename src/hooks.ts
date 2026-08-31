import { useEffect, useMemo, useState } from 'react';

type LocalStorageOptions<T> = {
  legacyKeys?: string[];
  migrate?: (value: unknown) => T;
};

export function useLocalStorage<T>(key: string, initialValue: T, options?: LocalStorageOptions<T>) {
  const legacyKeys = options?.legacyKeys || [];
  const migrate = options?.migrate;

  const [value, setValue] = useState<T>(() => {
    try {
      const keysToCheck = [key, ...legacyKeys];
      for (const storageKey of keysToCheck) {
        const raw = localStorage.getItem(storageKey);
        if (!raw) continue;
        const parsed = JSON.parse(raw) as unknown;
        const nextValue = migrate ? migrate(parsed) : (parsed as T);
        if (storageKey !== key) {
          localStorage.setItem(key, JSON.stringify(nextValue));
        }
        return nextValue;
      }
      return initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

export function useTodayKey(prefix: string) {
  return useMemo(() => `${prefix}-${new Date().toISOString().slice(0, 10)}`, [prefix]);
}

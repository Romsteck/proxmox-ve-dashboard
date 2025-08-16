/**
 * Enhanced useLocalStorage hook with validation and error handling
 */

import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

export interface UseLocalStorageOptions<T> {
  defaultValue: T;
  validator?: (value: unknown) => value is T;
  serializer?: {
    serialize: (value: T) => string;
    deserialize: (value: string) => T;
  };
  syncAcrossTabs?: boolean;
}

export interface LocalStorageState<T> {
  value: T;
  loading: boolean;
  error: string | null;
}

/**
 * Default JSON serializer
 */
const defaultSerializer = {
  serialize: JSON.stringify,
  deserialize: JSON.parse,
};

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Enhanced localStorage hook with validation and error handling
 */
export function useLocalStorage<T>(
  key: string,
  options: UseLocalStorageOptions<T>
): [T, (value: T | ((prev: T) => T)) => void, LocalStorageState<T>] {
  const {
    defaultValue,
    validator,
    serializer = defaultSerializer,
    syncAcrossTabs = true,
  } = options;

  const [state, setState] = useState<LocalStorageState<T>>({
    value: defaultValue,
    loading: true,
    error: null,
  });

  // Initialize value from localStorage
  useEffect(() => {
    if (!isLocalStorageAvailable()) {
      setState({
        value: defaultValue,
        loading: false,
        error: 'localStorage is not available',
      });
      return;
    }

    try {
      const item = localStorage.getItem(key);
      
      if (item === null) {
        setState({
          value: defaultValue,
          loading: false,
          error: null,
        });
        return;
      }

      const parsed = serializer.deserialize(item);
      
      // Validate the parsed value if validator is provided
      if (validator && !validator(parsed)) {
        console.warn(`Invalid value in localStorage for key "${key}":`, parsed);
        setState({
          value: defaultValue,
          loading: false,
          error: 'Invalid stored value, using default',
        });
        return;
      }

      setState({
        value: parsed,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      setState({
        value: defaultValue,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to read from localStorage',
      });
    }
  }, [key, defaultValue, validator, serializer]);

  // Set value function
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    if (!isLocalStorageAvailable()) {
      setState(prev => ({
        ...prev,
        error: 'localStorage is not available',
      }));
      return;
    }

    try {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(state.value)
        : value;

      // Validate new value if validator is provided
      if (validator && !validator(newValue)) {
        setState(prev => ({
          ...prev,
          error: 'Invalid value provided',
        }));
        return;
      }

      const serialized = serializer.serialize(newValue);
      localStorage.setItem(key, serialized);

      setState({
        value: newValue,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to write to localStorage',
      }));
    }
  }, [key, state.value, validator, serializer]);

  // Listen for storage events (cross-tab synchronization)
  useEffect(() => {
    if (!syncAcrossTabs || !isLocalStorageAvailable()) {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === null) {
        return;
      }

      try {
        const parsed = serializer.deserialize(e.newValue);
        
        if (validator && !validator(parsed)) {
          console.warn(`Invalid value received from storage event for key "${key}":`, parsed);
          return;
        }

        setState(prev => ({
          ...prev,
          value: parsed,
          error: null,
        }));
      } catch (error) {
        console.error(`Error parsing storage event for key "${key}":`, error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, validator, serializer, syncAcrossTabs]);

  return [state.value, setValue, state];
}

/**
 * Specialized hook for user preferences
 */
export function useUserPreferences() {
  return useLocalStorage(STORAGE_KEYS.USER_PREFERENCES, {
    defaultValue: {
      theme: 'system' as const,
      refreshInterval: 5000,
      showNotifications: true,
      compactView: false,
    },
    validator: (value): value is {
      theme: 'light' | 'dark' | 'system';
      refreshInterval: number;
      showNotifications: boolean;
      compactView: boolean;
    } => {
      return (
        typeof value === 'object' &&
        value !== null &&
        'theme' in value &&
        'refreshInterval' in value &&
        'showNotifications' in value &&
        'compactView' in value &&
        ['light', 'dark', 'system'].includes((value as any).theme) &&
        typeof (value as any).refreshInterval === 'number' &&
        typeof (value as any).showNotifications === 'boolean' &&
        typeof (value as any).compactView === 'boolean'
      );
    },
  });
}

/**
 * Hook for caching metrics history
 */
export function useMetricsHistory() {
  return useLocalStorage(STORAGE_KEYS.METRICS_HISTORY, {
    defaultValue: [] as Array<{
      timestamp: number;
      node: string;
      cpu: number;
      memory: number;
      load: number;
    }>,
    validator: (value): value is Array<{
      timestamp: number;
      node: string;
      cpu: number;
      memory: number;
      load: number;
    }> => {
      return (
        Array.isArray(value) &&
        value.every(item =>
          typeof item === 'object' &&
          item !== null &&
          typeof item.timestamp === 'number' &&
          typeof item.node === 'string' &&
          typeof item.cpu === 'number' &&
          typeof item.memory === 'number' &&
          typeof item.load === 'number'
        )
      );
    },
  });
}

/**
 * Generic hook for theme preference
 */
export function useThemePreference() {
  return useLocalStorage(STORAGE_KEYS.THEME_PREFERENCE, {
    defaultValue: 'system' as 'light' | 'dark' | 'system',
    validator: (value): value is 'light' | 'dark' | 'system' => {
      return typeof value === 'string' && ['light', 'dark', 'system'].includes(value);
    },
  });
}

/**
 * Utility function to clear all app-related localStorage data
 */
export function clearAppStorage(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  Object.values(STORAGE_KEYS).forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove localStorage key "${key}":`, error);
    }
  });

  // Clear cache entries
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith(STORAGE_KEYS.CACHE_PREFIX)) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove cache key "${key}":`, error);
      }
    }
  });
}

/**
 * Get storage usage information
 */
export function getStorageInfo(): {
  available: boolean;
  used: number;
  quota: number;
  usagePercentage: number;
} {
  if (!isLocalStorageAvailable()) {
    return {
      available: false,
      used: 0,
      quota: 0,
      usagePercentage: 0,
    };
  }

  try {
    let used = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }

    // Estimate quota (typically 5-10MB for localStorage)
    const quota = 5 * 1024 * 1024; // 5MB estimate
    
    return {
      available: true,
      used,
      quota,
      usagePercentage: (used / quota) * 100,
    };
  } catch (error) {
    return {
      available: false,
      used: 0,
      quota: 0,
      usagePercentage: 0,
    };
  }
}
/**
 * Performance optimization utilities and monitoring
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PERFORMANCE_THRESHOLDS, UI_CONFIG } from '../constants';

/**
 * Debounce utility function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle utility function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Hook for debounced values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for debounced callbacks
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  return useCallback(
    debounce(callback, delay),
    [delay, ...deps]
  ) as T;
}

/**
 * Hook for throttled callbacks
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number,
  deps: React.DependencyList = []
): T {
  return useCallback(
    throttle(callback, limit),
    [limit, ...deps]
  ) as T;
}

/**
 * Performance monitoring hook
 */
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  timestamp: number;
}

export function usePerformanceMonitor(componentName: string) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const mountTime = useRef<number>(Date.now());
  const lastRenderTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);

  // Measure performance on each render (but don't trigger re-renders)
  const currentRenderTime = Date.now();
  const renderTime = currentRenderTime - lastRenderTime.current;
  lastRenderTime.current = currentRenderTime;
  renderCount.current += 1;

  // Only update metrics periodically to avoid infinite loops
  useEffect(() => {
    const updateMetrics = () => {
      // Get memory usage if available
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
      
      const newMetrics: PerformanceMetrics = {
        renderTime: Date.now() - mountTime.current,
        memoryUsage: memoryUsage / (1024 * 1024), // Convert to MB
        timestamp: Date.now(),
      };

      setMetrics(newMetrics);

      // Log performance warnings
      if (renderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING_MS) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime}ms`);
      }

      if (newMetrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_USAGE_WARNING_MB) {
        console.warn(`High memory usage in ${componentName}: ${newMetrics.memoryUsage.toFixed(2)}MB`);
      }
    };

    // Update metrics only once on mount
    updateMetrics();

    // Set up periodic updates (every 10 seconds) to avoid excessive updates
    const interval = setInterval(updateMetrics, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []); // ✅ Empty dependency array - runs only once on mount

  return metrics;
}

/**
 * Hook for measuring API call performance
 */
export function useApiPerformance() {
  const [metrics, setMetrics] = useState<{
    [endpoint: string]: {
      averageTime: number;
      callCount: number;
      lastCall: number;
      slowCalls: number;
    };
  }>({});

  const measureApiCall = useCallback(async <T>(
    endpoint: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = Date.now();
    
    try {
      const result = await apiCall();
      const duration = Date.now() - startTime;
      
      setMetrics(prev => {
        const existing = prev[endpoint] || {
          averageTime: 0,
          callCount: 0,
          lastCall: 0,
          slowCalls: 0,
        };

        const newCallCount = existing.callCount + 1;
        const newAverageTime = (existing.averageTime * existing.callCount + duration) / newCallCount;
        const isSlowCall = duration > PERFORMANCE_THRESHOLDS.SLOW_API_CALL_MS;

        return {
          ...prev,
          [endpoint]: {
            averageTime: newAverageTime,
            callCount: newCallCount,
            lastCall: duration,
            slowCalls: existing.slowCalls + (isSlowCall ? 1 : 0),
          },
        };
      });

      if (duration > PERFORMANCE_THRESHOLDS.SLOW_API_CALL_MS) {
        console.warn(`Slow API call to ${endpoint}: ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`API call to ${endpoint} failed after ${duration}ms:`, error);
      throw error;
    }
  }, []);

  return { metrics, measureApiCall };
}

/**
 * Hook for intersection observer (lazy loading)
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLElement | null>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  return [ref, isIntersecting];
}

/**
 * Hook for lazy loading components
 */
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList = []
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  load: () => void;
} {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await loader();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, deps);

  return { ...state, load };
}

/**
 * Memoization utilities
 */
export function createMemoizedSelector<TInput, TOutput>(
  selector: (input: TInput) => TOutput,
  equalityFn?: (a: TOutput, b: TOutput) => boolean
) {
  let lastInput: TInput;
  let lastOutput: TOutput;
  let hasResult = false;

  return (input: TInput): TOutput => {
    if (!hasResult || input !== lastInput) {
      const newOutput = selector(input);
      
      if (!hasResult || !equalityFn || !equalityFn(lastOutput, newOutput)) {
        lastOutput = newOutput;
      }
      
      lastInput = input;
      hasResult = true;
    }
    
    return lastOutput;
  };
}

/**
 * Hook for stable object references
 */
export function useStableObject<T extends Record<string, any>>(obj: T): T {
  return useMemo(() => obj, Object.values(obj));
}

/**
 * Hook for stable array references
 */
export function useStableArray<T>(arr: T[]): T[] {
  return useMemo(() => arr, arr);
}

/**
 * Virtual scrolling utilities
 */
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
) {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight,
    }));
  }, [items, startIndex, endIndex, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    startIndex,
    endIndex,
  };
}

/**
 * Performance measurement decorator
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    
    console.log(`${name} took ${(end - start).toFixed(2)}ms`);
    
    return result;
  }) as T;
}

/**
 * Async performance measurement
 */
export function measureAsyncPerformance<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string
): T {
  return (async (...args: Parameters<T>) => {
    const start = performance.now();
    const result = await fn(...args);
    const end = performance.now();
    
    console.log(`${name} took ${(end - start).toFixed(2)}ms`);
    
    return result;
  }) as T;
}
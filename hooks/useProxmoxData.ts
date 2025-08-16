/**
 * Centralized hook for Proxmox API data with caching, retry logic, and error handling
 */

import { useCallback, useEffect, useState } from 'react';
import { withRetry, createContextualError } from '@/lib/utils/error-handling';
import { cachedFetch, CacheKeys } from '@/lib/utils/cache';
import { API_ENDPOINTS, TIMEOUTS, INTERVALS } from '@/lib/constants';
import { 
  ClusterSummary, 
  safeValidateClusterSummary,
  safeValidateApiResponse,
  ApiResponse 
} from '@/lib/types';

export interface UseProxmoxDataOptions {
  enabled?: boolean;
  refetchInterval?: number;
  cacheTime?: number;
  retryOnError?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export interface ProxmoxDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
  refetchCount: number;
}

/**
 * Generic hook for fetching Proxmox data with caching and error handling
 */
function useProxmoxQuery<T>(
  queryKey: string,
  fetcher: () => Promise<T>,
  options: UseProxmoxDataOptions = {}
) {
  const {
    enabled = true,
    refetchInterval,
    cacheTime = TIMEOUTS.CACHE_TTL,
    retryOnError = true,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<ProxmoxDataState<T>>({
    data: null,
    loading: false,
    error: null,
    lastFetch: null,
    refetchCount: 0,
  });

  const fetchData = useCallback(async (isRefetch = false) => {
    if (!enabled) return;

    setState(prev => ({
      ...prev,
      loading: true,
      error: isRefetch ? prev.error : null,
    }));

    try {
      const data = await cachedFetch(
        queryKey,
        retryOnError ? () => withRetry(fetcher) : fetcher,
        { ttl: cacheTime }
      );

      setState(prev => ({
        ...prev,
        data,
        loading: false,
        error: null,
        lastFetch: Date.now(),
        refetchCount: isRefetch ? prev.refetchCount + 1 : 0,
      }));

      onSuccess?.(data);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const contextualError = createContextualError('fetch Proxmox data', err, { queryKey });
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: contextualError.message,
      }));

      onError?.(contextualError);
    }
  }, [enabled, queryKey, fetcher, cacheTime, retryOnError, onSuccess, onError]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, fetchData]);

  // Polling interval
  useEffect(() => {
    if (!enabled || !refetchInterval) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [enabled, refetchInterval, fetchData]);

  return {
    ...state,
    refetch,
    isStale: state.lastFetch ? Date.now() - state.lastFetch > cacheTime : true,
  };
}

/**
 * Hook for fetching cluster summary data
 */
export function useClusterSummary(options: UseProxmoxDataOptions = {}) {
  const fetcher = useCallback(async (): Promise<ClusterSummary> => {
    const response = await fetch(API_ENDPOINTS.SUMMARY, {
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUTS.API_REQUEST),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    
    // Validate API response structure
    const apiValidation = safeValidateApiResponse(json);
    if (!apiValidation.success) {
      throw new Error(`Invalid API response: ${apiValidation.error}`);
    }

    const apiResponse = apiValidation.data;
    if (!apiResponse.ok) {
      throw new Error(apiResponse.error);
    }

    // Validate cluster summary data
    const dataValidation = safeValidateClusterSummary(apiResponse.data);
    if (!dataValidation.success) {
      throw new Error(`Invalid cluster summary data: ${dataValidation.error}`);
    }

    return dataValidation.data;
  }, []);

  return useProxmoxQuery(
    CacheKeys.clusterSummary(),
    fetcher,
    {
      refetchInterval: INTERVALS.METRICS_POLL,
      ...options,
    }
  );
}

/**
 * Hook for fetching node metrics
 */
export function useNodeMetrics(node: string, rangeSeconds: number = 3600, options: UseProxmoxDataOptions = {}) {
  const fetcher = useCallback(async () => {
    const params = new URLSearchParams({
      node,
      range: rangeSeconds.toString(),
    });

    const response = await fetch(`${API_ENDPOINTS.METRICS}?${params}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUTS.API_REQUEST),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    
    // Validate API response structure
    const apiValidation = safeValidateApiResponse(json);
    if (!apiValidation.success) {
      throw new Error(`Invalid API response: ${apiValidation.error}`);
    }

    const apiResponse = apiValidation.data;
    if (!apiResponse.ok) {
      throw new Error(apiResponse.error);
    }

    return apiResponse.data;
  }, [node, rangeSeconds]);

  return useProxmoxQuery(
    CacheKeys.nodeMetrics(node, rangeSeconds),
    fetcher,
    {
      enabled: Boolean(node),
      refetchInterval: INTERVALS.METRICS_POLL,
      ...options,
    }
  );
}

/**
 * Hook for health check
 */
export function useHealthCheck(options: UseProxmoxDataOptions = {}) {
  const fetcher = useCallback(async () => {
    const response = await fetch(API_ENDPOINTS.HEALTH, {
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUTS.HEALTH_CHECK),
    });

    if (!response.ok) {
      throw new Error(`Health check failed: HTTP ${response.status}`);
    }

    return response.json();
  }, []);

  return useProxmoxQuery(
    'health-check',
    fetcher,
    {
      refetchInterval: INTERVALS.HEALTH_CHECK,
      cacheTime: TIMEOUTS.HEALTH_CHECK,
      ...options,
    }
  );
}

/**
 * Combined hook for dashboard data
 */
export function useDashboardData(options: UseProxmoxDataOptions = {}) {
  const clusterSummary = useClusterSummary(options);
  const healthCheck = useHealthCheck({
    ...options,
    enabled: options.enabled !== false, // Health check is less critical
  });

  const loading = clusterSummary.loading;
  const error = clusterSummary.error || healthCheck.error;
  
  const refetch = useCallback(async () => {
    await Promise.all([
      clusterSummary.refetch(),
      healthCheck.refetch(),
    ]);
  }, [clusterSummary.refetch, healthCheck.refetch]);

  return {
    clusterSummary: clusterSummary.data,
    healthStatus: healthCheck.data,
    loading,
    error,
    refetch,
    lastFetch: Math.max(
      clusterSummary.lastFetch || 0,
      healthCheck.lastFetch || 0
    ) || null,
    isStale: clusterSummary.isStale || healthCheck.isStale,
  };
}

/**
 * Hook for managing multiple node metrics
 */
export function useMultiNodeMetrics(nodes: string[], rangeSeconds: number = 3600, options: UseProxmoxDataOptions = {}) {
  const [metricsData, setMetricsData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllMetrics = useCallback(async () => {
    if (!nodes.length) return;

    setLoading(true);
    setError(null);

    try {
      const promises = nodes.map(async (node) => {
        const data = await cachedFetch(
          CacheKeys.nodeMetrics(node, rangeSeconds),
          async () => {
            const params = new URLSearchParams({
              node,
              range: rangeSeconds.toString(),
            });

            const response = await fetch(`${API_ENDPOINTS.METRICS}?${params}`, {
              cache: 'no-store',
              signal: AbortSignal.timeout(TIMEOUTS.API_REQUEST),
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const json = await response.json();
            const apiValidation = safeValidateApiResponse(json);
            if (!apiValidation.success) {
              throw new Error(`Invalid API response: ${apiValidation.error}`);
            }

            const apiResponse = apiValidation.data;
            if (!apiResponse.ok) {
              throw new Error(apiResponse.error);
            }

            return apiResponse.data;
          },
          { ttl: options.cacheTime || TIMEOUTS.CACHE_TTL }
        );

        return { node, data };
      });

      const results = await Promise.allSettled(promises);
      const newMetricsData: Record<string, any> = {};
      const errors: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          newMetricsData[result.value.node] = result.value.data;
        } else {
          errors.push(`${nodes[index]}: ${result.reason.message}`);
        }
      });

      setMetricsData(newMetricsData);
      
      if (errors.length > 0) {
        setError(`Failed to fetch metrics for some nodes: ${errors.join(', ')}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [nodes, rangeSeconds, options.cacheTime]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchAllMetrics();
    }
  }, [options.enabled, fetchAllMetrics]);

  // Polling
  useEffect(() => {
    if (!options.refetchInterval || options.enabled === false) return;

    const interval = setInterval(fetchAllMetrics, options.refetchInterval);
    return () => clearInterval(interval);
  }, [options.refetchInterval, options.enabled, fetchAllMetrics]);

  return {
    data: metricsData,
    loading,
    error,
    refetch: fetchAllMetrics,
  };
}
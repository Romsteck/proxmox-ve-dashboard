/**
 * Application constants for timeouts, intervals, and configuration
 */

// Retry and timeout constants
export const RETRY_CONFIG = {
  DEFAULT_MAX_ATTEMPTS: 3,
  DEFAULT_BASE_DELAY_MS: 1000,
  DEFAULT_MAX_DELAY_MS: 30000,
  DEFAULT_BACKOFF_MULTIPLIER: 2,
} as const;

// API and network timeouts
export const TIMEOUTS = {
  API_REQUEST: 10000, // 10 seconds
  SSE_RECONNECT: 3000, // 3 seconds
  HEALTH_CHECK: 5000, // 5 seconds
  CACHE_TTL: 300000, // 5 minutes
} as const;

// Polling and refresh intervals
export const INTERVALS = {
  METRICS_POLL: 5000, // 5 seconds
  HEALTH_CHECK: 30000, // 30 seconds
  CACHE_CLEANUP: 60000, // 1 minute
  HEARTBEAT: 10000, // 10 seconds
} as const;

// UI and UX constants
export const UI_CONFIG = {
  TOAST_DURATION: 4000,
  DEBOUNCE_DELAY: 300,
  LOADING_DELAY: 200, // Delay before showing loading state
  ANIMATION_DURATION: 200,
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  MAX_ENTRIES: 100,
  DEFAULT_TTL_MS: TIMEOUTS.CACHE_TTL,
  CLEANUP_INTERVAL_MS: INTERVALS.CACHE_CLEANUP,
} as const;

// Performance monitoring thresholds
export const PERFORMANCE_THRESHOLDS = {
  SLOW_API_CALL_MS: 2000,
  MEMORY_USAGE_WARNING_MB: 100,
  RENDER_TIME_WARNING_MS: 16, // 60fps threshold
} as const;

// Error message templates
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  API_TIMEOUT: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  AUTHENTICATION_ERROR: 'Authentication failed. Please check your credentials.',
  RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment and try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_PERFORMANCE_MONITORING: true,
  ENABLE_CLIENT_SIDE_CACHING: true,
  ENABLE_RETRY_LOGIC: true,
  ENABLE_ERROR_BOUNDARIES: true,
  ENABLE_LAZY_LOADING: true,
} as const;

// Chart configuration
export const CHART_CONFIG = {
  DEFAULT_HEIGHT: 200,
  MAX_DATA_POINTS: 50,
  ANIMATION_DURATION: 300,
  COLORS: {
    PRIMARY: '#3b82f6',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#6366f1',
  },
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  THEME_PREFERENCE: 'proxmox-dashboard-theme',
  USER_PREFERENCES: 'proxmox-dashboard-preferences',
  CACHE_PREFIX: 'proxmox-cache-',
  METRICS_HISTORY: 'proxmox-metrics-history',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  SUMMARY: '/api/proxmox/summary',
  EVENTS: '/api/proxmox/events',
  METRICS: '/api/proxmox/metrics',
  HEALTH: '/api/health',
} as const;

// Validation rules
export const VALIDATION_RULES = {
  NODE_NAME_MAX_LENGTH: 50,
  ERROR_MESSAGE_MAX_LENGTH: 500,
  METRIC_VALUE_MIN: 0,
  METRIC_VALUE_MAX: 100,
} as const;
/**
 * Cache tag for superadmin system logs table data.
 *
 * Invalidate this tag after mutations that append to `activity_logs`
 * so `/system-logs` reflects fresh data immediately.
 */
export const SYSTEM_LOGS_CACHE_TAG = 'system-logs';

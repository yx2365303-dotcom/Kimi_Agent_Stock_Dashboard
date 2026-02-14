export interface ApiMetricEntry {
  name: string;
  calls: number;
  success: number;
  failed: number;
  cacheHit: number;
  totalDurationMs: number;
  maxDurationMs: number;
  lastDurationMs: number;
  lastAt: number;
}

const metrics = new Map<string, ApiMetricEntry>();

function getOrCreate(name: string): ApiMetricEntry {
  const existing = metrics.get(name);
  if (existing) return existing;

  const created: ApiMetricEntry = {
    name,
    calls: 0,
    success: 0,
    failed: 0,
    cacheHit: 0,
    totalDurationMs: 0,
    maxDurationMs: 0,
    lastDurationMs: 0,
    lastAt: 0,
  };
  metrics.set(name, created);
  return created;
}

export function recordApiMetric(
  name: string,
  durationMs: number,
  options: { ok: boolean; cacheHit?: boolean }
): void {
  const entry = getOrCreate(name);

  entry.calls += 1;
  entry.totalDurationMs += durationMs;
  entry.lastDurationMs = durationMs;
  entry.lastAt = Date.now();
  entry.maxDurationMs = Math.max(entry.maxDurationMs, durationMs);

  if (options.ok) {
    entry.success += 1;
  } else {
    entry.failed += 1;
  }

  if (options.cacheHit) {
    entry.cacheHit += 1;
  }
}

export function getApiMetricsSnapshot(): Array<ApiMetricEntry & { avgDurationMs: number }> {
  return Array.from(metrics.values())
    .map((entry) => ({
      ...entry,
      avgDurationMs: entry.calls > 0 ? Number((entry.totalDurationMs / entry.calls).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.calls - a.calls);
}

export function clearApiMetrics(): void {
  metrics.clear();
}

// 便于在浏览器控制台查看
if (typeof window !== 'undefined') {
  (window as Window & {
    __ALPHAPULSE_API_METRICS__?: () => ReturnType<typeof getApiMetricsSnapshot>;
    __ALPHAPULSE_CLEAR_API_METRICS__?: () => void;
  }).__ALPHAPULSE_API_METRICS__ = getApiMetricsSnapshot;

  (window as Window & {
    __ALPHAPULSE_CLEAR_API_METRICS__?: () => void;
  }).__ALPHAPULSE_CLEAR_API_METRICS__ = clearApiMetrics;
}

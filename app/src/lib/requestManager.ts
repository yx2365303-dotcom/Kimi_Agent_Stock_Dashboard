import { recordApiMetric } from '@/lib/apiMetrics';

interface CachedValue<T> {
  value: T;
  expiresAt: number;
}

interface InflightRequest<T> {
  promise: Promise<T>;
  controller: AbortController;
}

interface RequestOptions {
  ttlMs?: number;
  allowCache?: boolean;
  dedupeInFlight?: boolean;
  signal?: AbortSignal;
}

const cacheStore = new Map<string, CachedValue<unknown>>();
const inflightStore = new Map<string, InflightRequest<unknown>>();

export function clearRequestCache(prefix?: string): void {
  if (!prefix) {
    cacheStore.clear();
    inflightStore.clear();
    return;
  }

  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }

  for (const [key, request] of inflightStore.entries()) {
    if (key.startsWith(prefix)) {
      request.controller.abort();
      inflightStore.delete(key);
    }
  }
}

export function abortInflightRequest(key: string): void {
  const request = inflightStore.get(key);
  if (!request) return;

  request.controller.abort();
  inflightStore.delete(key);
}

export async function requestWithCache<T>(
  key: string,
  metricName: string,
  requestFn: (signal: AbortSignal) => Promise<T>,
  options: RequestOptions = {}
): Promise<T> {
  const {
    ttlMs = 0,
    allowCache = true,
    dedupeInFlight = true,
    signal,
  } = options;

  const now = Date.now();
  const cached = cacheStore.get(key) as CachedValue<T> | undefined;

  if (allowCache && ttlMs > 0 && cached && cached.expiresAt > now) {
    recordApiMetric(metricName, 0, { ok: true, cacheHit: true });
    return cached.value;
  }

  const inflight = inflightStore.get(key) as InflightRequest<T> | undefined;
  if (dedupeInFlight && inflight) {
    return inflight.promise;
  }

  const controller = new AbortController();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  const startedAt = Date.now();

  const promise = requestFn(controller.signal)
    .then((result) => {
      const duration = Date.now() - startedAt;
      recordApiMetric(metricName, duration, { ok: true });

      if (allowCache && ttlMs > 0) {
        cacheStore.set(key, {
          value: result,
          expiresAt: Date.now() + ttlMs,
        });
      }

      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startedAt;
      recordApiMetric(metricName, duration, { ok: false });
      throw error;
    })
    .finally(() => {
      const active = inflightStore.get(key);
      if (active?.promise === promise) {
        inflightStore.delete(key);
      }
    });

  inflightStore.set(key, { promise, controller });

  return promise;
}

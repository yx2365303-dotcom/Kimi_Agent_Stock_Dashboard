/**
 * 服务层共享工具函数和常量
 * 被 marketService, stockDetailService, sectorService, newsService, dragonTigerService 共用
 */
import { supabaseStock } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// Re-export for convenience
export { supabaseStock };
export { supabaseNews } from '@/lib/supabase';
export { requestWithCache } from '@/lib/requestManager';
export { logger };

// 是否使用模拟数据（当Supabase未配置或出错时自动降级）
export const USE_MOCK_FALLBACK = true;

// ===========================================
// RPC 辅助函数
// ===========================================

const RPC_DISABLE_KEY_PREFIX = 'alphapulse:rpc:disable:';
const RPC_DISABLE_MS = 30 * 60 * 1000;

function getRpcDisableKey(rpcName: string): string {
  return `${RPC_DISABLE_KEY_PREFIX}${rpcName}`;
}

function getRpcDisabledUntil(rpcName: string): number {
  if (typeof window === 'undefined') return 0;

  const raw = window.localStorage.getItem(getRpcDisableKey(rpcName));
  if (!raw) return 0;
  const until = Number(raw);
  return Number.isFinite(until) ? until : 0;
}

export function isRpcTemporarilyDisabled(rpcName: string): boolean {
  return Date.now() < getRpcDisabledUntil(rpcName);
}

export function disableRpcTemporarily(rpcName: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getRpcDisableKey(rpcName), String(Date.now() + RPC_DISABLE_MS));
}

export function clearRpcDisableFlag(rpcName: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(getRpcDisableKey(rpcName));
}

export function shouldDisableRpcAfterError(error: unknown): boolean {
  const text = (
    typeof error === 'string'
      ? error
      : JSON.stringify(error)
  ).toLowerCase();

  return (
    text.includes('pgrst202') ||
    text.includes('42883') ||
    text.includes('42p01') ||
    text.includes('42501') ||
    text.includes('could not find the function') ||
    text.includes('function') && text.includes('does not exist') ||
    text.includes('relation') && text.includes('does not exist') ||
    text.includes('permission denied')
  );
}

// ===========================================
// 工具函数
// ===========================================

/**
 * 获取最近的交易日期（YYYYMMDD格式）
 * 使用北京时间，用于查询最新数据
 */
export function getRecentTradeDates(count = 5): string[] {
  const dates: string[] = [];
  const now = new Date();
  const beijingOffset = 8 * 60 * 60 * 1000;
  const beijingNow = new Date(now.getTime() + beijingOffset + now.getTimezoneOffset() * 60 * 1000);

  for (let i = 0; i < count + 10 && dates.length < count; i++) {
    const d = new Date(beijingNow);
    d.setDate(d.getDate() - i);
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}${month}${date}`);
    }
  }

  logger.log('生成的交易日期:', dates);
  return dates;
}

export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return String(value);

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([k, v]) => `${k}:${stableStringify(v)}`).join(',')}}`;
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return [];

  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const worker = async () => {
    while (currentIndex < items.length) {
      const itemIndex = currentIndex;
      currentIndex += 1;
      results[itemIndex] = await mapper(items[itemIndex]);
    }
  };

  const workerCount = Math.min(Math.max(concurrency, 1), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

/**
 * 从 new_share 表批量获取新股名称
 */
export async function fetchNewShareNames(tsCodes: string[]): Promise<Map<string, { name: string; industry: string }>> {
  const nameMap = new Map<string, { name: string; industry: string }>();

  if (tsCodes.length === 0) return nameMap;

  try {
    const { data, error } = await supabaseStock
      .from('new_share')
      .select('ts_code, name')
      .in('ts_code', tsCodes);

    if (error) {
      logger.warn('从 new_share 表获取新股名称失败:', error);
      return nameMap;
    }

    if (data && data.length > 0) {
      data.forEach((item: { ts_code: string; name: string }) => {
        nameMap.set(item.ts_code, {
          name: item.name,
          industry: '新股'
        });
      });
      logger.log(`从 new_share 表获取到 ${data.length} 只新股的名称`);
    }
  } catch (error) {
    logger.error('批量获取新股名称失败:', error);
  }

  return nameMap;
}

/**
 * 格式化当前时间为更新时间字符串
 */
export function getFormattedUpdateTime(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

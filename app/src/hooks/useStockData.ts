import { useState, useEffect, useCallback } from 'react';
import {
  fetchIndices,
  fetchHotSectors,
  fetchLimitUpList,
  fetchUpDownDistribution,
  fetchMarketSentiment,
  fetchNorthFlow,
  fetchNews,
  fetchStockList,
  fetchStockDetail,
  fetchKLineData,
  fetchTimeSeriesData,
  fetchMoneyFlow,
  fetchKplConcepts,
  fetchHsgtTop10
} from '@/services/stockService';
import type { IndexData, StockBasic, SectorData, LimitUpData, NewsItem, MarketSentiment } from '@/types';

// 通用的数据获取状态
interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// 通用的数据获取 Hook
function useFetch<T>(
  fetchFn: () => Promise<T>,
  deps: unknown[] = []
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    fetch();
  }, [...deps, fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * 获取指数数据
 */
export function useIndices() {
  return useFetch<IndexData[]>(fetchIndices);
}

/**
 * 获取热门板块数据
 */
export function useHotSectors(limit = 10) {
  return useFetch<SectorData[]>(() => fetchHotSectors(limit), [limit]);
}

/**
 * 获取涨停板数据
 */
export function useLimitUpList(limit = 20) {
  return useFetch<LimitUpData[]>(() => fetchLimitUpList(limit), [limit]);
}

/**
 * 获取涨跌分布数据
 */
export function useUpDownDistribution() {
  return useFetch(fetchUpDownDistribution);
}

/**
 * 获取市场情绪数据
 */
export function useMarketSentiment() {
  return useFetch<MarketSentiment | null>(fetchMarketSentiment);
}

/**
 * 获取北向资金数据
 */
export function useNorthFlow(days = 30) {
  return useFetch(() => fetchNorthFlow(days), [days]);
}

/**
 * 获取新闻列表
 */
export function useNews(params: {
  category?: string;
  importance?: 'high' | 'normal' | 'low';
  limit?: number;
} = {}) {
  return useFetch<NewsItem[]>(
    () => fetchNews(params),
    [params.category, params.importance, params.limit]
  );
}

/**
 * 获取股票列表
 */
export function useStockList(params: {
  industry?: string;
  market?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
} = {}) {
  return useFetch<StockBasic[]>(
    () => fetchStockList(params),
    [params.industry, params.market, params.keyword, params.limit, params.offset]
  );
}

/**
 * 获取股票详情
 */
export function useStockDetail(tsCode: string) {
  return useFetch<StockBasic | null>(
    () => fetchStockDetail(tsCode),
    [tsCode]
  );
}

/**
 * 获取K线数据
 */
export function useKLineData(tsCode: string, days = 60) {
  return useFetch(
    () => fetchKLineData(tsCode, days),
    [tsCode, days]
  );
}

/**
 * 获取分时数据
 */
export function useTimeSeriesData(tsCode: string) {
  return useFetch(
    () => fetchTimeSeriesData(tsCode),
    [tsCode]
  );
}

/**
 * 获取资金流向数据
 */
export function useMoneyFlow(tsCode: string, days = 10) {
  return useFetch(
    () => fetchMoneyFlow(tsCode, days),
    [tsCode, days]
  );
}

/**
 * 获取开盘啦题材数据
 */
export function useKplConcepts() {
  return useFetch(fetchKplConcepts);
}

/**
 * 获取沪深股通Top10
 */
export function useHsgtTop10() {
  return useFetch(fetchHsgtTop10);
}

/**
 * 定时刷新数据的 Hook
 */
export function useAutoRefresh<T>(
  fetchFn: () => Promise<T>,
  intervalMs: number = 30000
): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, intervalMs);
    return () => clearInterval(interval);
  }, [fetch, intervalMs]);

  return { data, loading, error, refetch: fetch };
}

/**
 * 市场概览数据聚合 Hook
 */
export function useMarketOverview() {
  const indices = useIndices();
  const sentiment = useMarketSentiment();
  const upDownDist = useUpDownDistribution();
  const northFlow = useNorthFlow();
  const limitUp = useLimitUpList(10);

  return {
    indices: indices.data,
    sentiment: sentiment.data,
    upDownDistribution: upDownDist.data,
    northFlow: northFlow.data,
    limitUpList: limitUp.data,
    loading: indices.loading || sentiment.loading || upDownDist.loading || northFlow.loading || limitUp.loading,
    error: indices.error || sentiment.error || upDownDist.error || northFlow.error || limitUp.error,
    refetch: () => {
      indices.refetch();
      sentiment.refetch();
      upDownDist.refetch();
      northFlow.refetch();
      limitUp.refetch();
    }
  };
}

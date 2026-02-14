import { lazy, Suspense, useMemo } from 'react';
import useSWR from 'swr';
import { IndexCard } from '@/components/stock/IndexCard';
import { SectorList } from '@/components/stock/SectorList';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, getChangeColor } from '@/lib/utils';
import {
  fetchMarketOverviewBundle,
  type MarketOverviewBundle,
} from '@/services/stockService';

const UpDownDistribution = lazy(() =>
  import('@/components/stock/UpDownDistribution').then((m) => ({ default: m.UpDownDistribution }))
);
const MoneyFlowChart = lazy(() =>
  import('@/components/stock/MoneyFlowChart').then((m) => ({ default: m.MoneyFlowChart }))
);
const EnhancedMarketSentiment = lazy(() =>
  import('@/components/stock/EnhancedMarketSentiment').then((m) => ({ default: m.EnhancedMarketSentiment }))
);
const LimitUpStats = lazy(() =>
  import('@/components/stock/LimitUpStats').then((m) => ({ default: m.LimitUpStats }))
);

const MARKET_OVERVIEW_SNAPSHOT_KEY = 'alphapulse:market-overview:snapshot';
const MARKET_OVERVIEW_SNAPSHOT_TTL = 5 * 60 * 1000;

function loadMarketOverviewSnapshot(): MarketOverviewBundle | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    const raw = window.localStorage.getItem(MARKET_OVERVIEW_SNAPSHOT_KEY);
    if (!raw) return undefined;

    const parsed = JSON.parse(raw) as { savedAt?: number; data?: MarketOverviewBundle };
    if (!parsed?.savedAt || !parsed?.data) return undefined;

    if (Date.now() - parsed.savedAt > MARKET_OVERVIEW_SNAPSHOT_TTL) {
      window.localStorage.removeItem(MARKET_OVERVIEW_SNAPSHOT_KEY);
      return undefined;
    }

    return parsed.data;
  } catch {
    return undefined;
  }
}

function saveMarketOverviewSnapshot(data: MarketOverviewBundle): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      MARKET_OVERVIEW_SNAPSHOT_KEY,
      JSON.stringify({ savedAt: Date.now(), data })
    );
  } catch {
    // ignore storage quota errors
  }
}

export function MarketOverview() {
  const { data, isLoading, isValidating, mutate } = useSWR(
    'market:overview:bundle',
    () => fetchMarketOverviewBundle(),
    {
      dedupingInterval: 30_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      fallbackData: loadMarketOverviewSnapshot(),
      onSuccess: (nextData) => {
        saveMarketOverviewSnapshot(nextData);
      },
    }
  );

  const loading = isLoading && !data;
  const refreshing = isValidating && !!data;

  const indices = data?.indices || [];
  const sectors = data?.sectors || [];
  const limitUpList = data?.limitUpList || [];
  const upDownDistribution = data?.upDownDistribution || null;
  const enhancedSentiment = data?.enhancedSentiment || null;
  const northFlow = data?.northFlow || null;
  const hsgtTop10 = data?.hsgtTop10 || [];
  const updateTime = data?.updateTime || '';
  const upSectors = useMemo(() => sectors.filter(s => s.pct_change > 0).slice(0, 10), [sectors]);
  const downSectors = useMemo(() => (
    sectors
      .filter(s => s.pct_change < 0)
      .sort((a, b) => a.pct_change - b.pct_change)
      .slice(0, 10)
  ), [sectors]);

  const handleRefresh = () => {
    mutate(fetchMarketOverviewBundle(true), { revalidate: false });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">市场概览</h2>
          <div className="text-sm text-slate-500">正在加载数据...</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 更新时间 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">市场概览</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <Clock className="w-4 h-4" />
            <span>更新时间: {updateTime}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 大盘指数 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {indices.length > 0 ? (
          indices.map((index) => (
            <IndexCard key={index.code} data={index} />
          ))
        ) : (
          <div className="col-span-5 text-center py-8 text-slate-500">
            暂无指数数据
          </div>
        )}
      </div>

      {/* 涨跌分布 + 北向资金流向 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense fallback={<Skeleton className="h-[480px]" />}>
          {upDownDistribution ? (
            <UpDownDistribution data={upDownDistribution} className="min-h-[480px]" />
          ) : (
            <Card className="p-4 border-slate-200 min-h-[480px]">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">涨跌分布</h3>
              <div className="h-48 flex items-center justify-center text-slate-500">
                暂无数据
              </div>
            </Card>
          )}
        </Suspense>
        <Suspense fallback={<Skeleton className="h-[480px]" />}>
          {northFlow ? (
            <MoneyFlowChart data={northFlow} className="min-h-[480px]" />
          ) : (
            <Card className="p-4 border-slate-200 min-h-[480px]">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">北向资金流向</h3>
              <div className="h-48 flex items-center justify-center text-slate-500">
                暂无数据
              </div>
            </Card>
          )}
        </Suspense>
      </div>

      {/* 市场情绪面板（增强版） */}
      <Suspense fallback={<Skeleton className="h-[400px]" />}>
        <EnhancedMarketSentiment
          data={enhancedSentiment}
          loading={loading}
          className="min-h-[400px]"
        />
      </Suspense>

      {/* 涨跌停统计 */}
      <Suspense fallback={<Skeleton className="h-[320px]" />}>
        {limitUpList.length > 0 && upDownDistribution ? (
          <LimitUpStats
            limitUpList={limitUpList}
            limitUpCount={upDownDistribution.limit_up}
            limitDownCount={upDownDistribution.limit_down}
            brokenCount={enhancedSentiment?.limitStats.zhabanCount ?? 0}
            maxLimitCount={enhancedSentiment?.limitStats.maxLianban ?? 0}
          />
        ) : (
          <Card className="p-4 border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">涨跌停统计</h3>
            <div className="h-48 flex items-center justify-center text-slate-500">
              暂无数据
            </div>
          </Card>
        )}
      </Suspense>

      {/* 板块涨幅榜 + 板块跌幅榜 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectorList
          sectors={upSectors}
          title="板块涨幅榜"
          type="up"
        />
        <SectorList
          sectors={downSectors}
          title="板块跌幅榜"
          type="down"
        />
      </div>

      {/* 沪深股通 Top10 */}
      <Card className="p-4 border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">沪深股通 Top10</h3>
        {hsgtTop10.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {hsgtTop10.slice(0, 10).map((item, index) => (
              <div
                key={item.ts_code}
                className="p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    'w-5 h-5 flex items-center justify-center text-xs font-bold rounded',
                    index < 3 ? 'bg-yellow-100 text-yellow-700' : 'text-slate-500'
                  )}>
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-900 truncate">{item.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn('text-sm font-mono font-medium', getChangeColor(item.change))}>
                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {(item.amount / 100000000).toFixed(1)}亿
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-slate-500">
            暂无数据
          </div>
        )}
      </Card>
    </div >
  );
}

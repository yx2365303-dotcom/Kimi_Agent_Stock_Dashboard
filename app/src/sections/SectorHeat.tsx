import { useState } from 'react';
import useSWR from 'swr';
import { cn, formatPercent } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Flame, TrendingUp, TrendingDown, Zap, Loader2 } from 'lucide-react';
import {
  fetchSectorHeatBundle,
  type SectorHotData,
  type HotStockData,
} from '@/services/stockService';

// 开盘啦题材数据类型
interface KplConceptItem {
  ts_code?: string;
  name: string;
  limit_up_count: number;
  up_count: number;
  trade_date?: string;
  heat_score?: number;
  leading_stock?: string;
  leading_change?: number;
  total?: number;
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function toConcepts(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // ignore parse error and fallback to split
    }

    return text.split(/[，,]/).map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

export function SectorHeat() {
  const [activeTab, setActiveTab] = useState('industry');
  const { data, isLoading } = useSWR(
    'sector:heat:bundle',
    () => fetchSectorHeatBundle(20),
    {
      dedupingInterval: 30_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const loading = isLoading && !data;
  const heatmapData = (Array.isArray(data?.heatmapData) ? data.heatmapData : []).map((item, index) => {
    const row = item as Record<string, unknown>;
    return {
      name: String(row.name ?? `板块${index + 1}`),
      value: toFiniteNumber(row.value, 0),
      size: Math.max(30, toFiniteNumber(row.size, 50)),
      type: String(row.type ?? 'industry'),
    };
  });

  const industryHotList = (Array.isArray(data?.industryHotList) ? data.industryHotList : []).map((item, index) => {
    const row = item as unknown as Record<string, unknown>;
    return {
      ts_code: String(row.ts_code ?? ''),
      ts_name: String(row.ts_name ?? `行业${index + 1}`),
      rank: toFiniteNumber(row.rank, index + 1),
      pct_change: toFiniteNumber(row.pct_change, 0),
      hot: toFiniteNumber(row.hot, 0),
    } as SectorHotData;
  });

  const conceptHotList = (Array.isArray(data?.conceptHotList) ? data.conceptHotList : []).map((item, index) => {
    const row = item as unknown as Record<string, unknown>;
    return {
      ts_code: String(row.ts_code ?? ''),
      ts_name: String(row.ts_name ?? `概念${index + 1}`),
      rank: toFiniteNumber(row.rank, index + 1),
      pct_change: toFiniteNumber(row.pct_change, 0),
      hot: toFiniteNumber(row.hot, 0),
    } as SectorHotData;
  });

  const hotStockList = (Array.isArray(data?.hotStockList) ? data.hotStockList : []).map((item, index) => {
    const row = item as unknown as Record<string, unknown>;
    return {
      ts_code: String(row.ts_code ?? ''),
      ts_name: String(row.ts_name ?? `热股${index + 1}`),
      rank: toFiniteNumber(row.rank, index + 1),
      pct_change: toFiniteNumber(row.pct_change, 0),
      hot: toFiniteNumber(row.hot, 0),
      concepts: toConcepts(row.concepts),
    } as HotStockData;
  });

  const kplConcepts = (Array.isArray(data?.kplConcepts) ? data.kplConcepts : []).map((item, index) => {
    const row = item as unknown as Record<string, unknown>;
    return {
      ts_code: row.ts_code ? String(row.ts_code) : undefined,
      name: String(row.name ?? `题材${index + 1}`),
      limit_up_count: toFiniteNumber(row.limit_up_count, 0),
      up_count: toFiniteNumber(row.up_count, 0),
      trade_date: row.trade_date ? String(row.trade_date) : undefined,
      heat_score: toFiniteNumber(row.heat_score, 0),
      leading_stock: row.leading_stock ? String(row.leading_stock) : undefined,
      leading_change: toFiniteNumber(row.leading_change, 0),
      total: toFiniteNumber(row.total, 0),
    } as KplConceptItem;
  });

  const getHeatColor = (value: number) => {
    if (value >= 5) return 'bg-[#dc2626]';
    if (value >= 4) return 'bg-[#ef4444]';
    if (value >= 3) return 'bg-[#f87171]';
    if (value >= 2) return 'bg-[#fca5a5]';
    if (value >= 1) return 'bg-[#fecaca]';
    if (value >= 0) return 'bg-slate-300';
    if (value >= -1) return 'bg-[#bbf7d0]';
    if (value >= -2) return 'bg-[#86efac]';
    if (value >= -3) return 'bg-[#4ade80]';
    return 'bg-[#22c55e]';
  };

  const getTextColor = (value: number) => {
    if (value >= 2 || value <= -2) return 'text-white';
    return value >= 0 ? 'text-red-900' : 'text-green-900';
  };

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">板块热点</h2>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Flame className="w-4 h-4 text-[#ff4d4f]" />
          <span>实时热度排行</span>
        </div>
      </div>

      {/* 热力图 */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">板块热力图</h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-600">加载中...</span>
          </div>
        ) : heatmapData.length === 0 ? (
          <div className="text-center text-slate-500 py-8">暂无数据</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {heatmapData.map((item) => (
              <div
                key={item.name}
                className={cn(
                  'px-3 py-2 rounded-lg cursor-pointer transition-all hover:scale-105',
                  getHeatColor(item.value),
                  getTextColor(item.value)
                )}
                style={{ fontSize: `${Math.max(12, item.size / 8)}px` }}
                title={`${item.type === 'industry' ? '行业' : '概念'}板块`}
              >
                <div className="font-medium">{item.name}</div>
                <div className="text-xs opacity-80">{formatPercent(item.value)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tab切换 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-slate-100">
          <TabsTrigger value="industry" className="data-[state=active]:bg-white">
            行业板块
          </TabsTrigger>
          <TabsTrigger value="concept" className="data-[state=active]:bg-white">
            概念板块
          </TabsTrigger>
          <TabsTrigger value="kpl" className="data-[state=active]:bg-white">
            开盘啦题材
          </TabsTrigger>
        </TabsList>

        <TabsContent value="industry" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 涨幅榜 - 行业板块 */}
            <Card className="p-4 self-start">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-slate-900">行业涨幅榜</h3>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="space-y-1">
                  {industryHotList
                    .sort((a, b) => b.pct_change - a.pct_change)
                    .slice(0, 10)
                    .map((sector, index) => (
                      <div
                        key={sector.ts_code}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'w-6 h-6 flex items-center justify-center text-xs font-bold rounded',
                            index < 3 ? 'bg-red-100 text-red-700' : 'text-slate-600'
                          )}>
                            {index + 1}
                          </span>
                          <span className="font-medium text-slate-900">{sector.ts_name}</span>
                          {sector.hot > 80 && (
                            <Flame className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={cn(
                              'font-mono font-medium',
                              sector.pct_change >= 0 ? 'text-[#ff4d4f]' : 'text-green-600'
                            )}>
                              {sector.pct_change >= 0 ? '+' : ''}{sector.pct_change.toFixed(2)}%
                            </div>
                            <div className="text-xs text-slate-600">
                              热度 {sector.hot}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  {industryHotList.length === 0 && (
                    <div className="text-center text-slate-500 py-4">暂无上涨行业</div>
                  )}
                </div>
              )}
            </Card>

            {/* 跌幅榜 - 行业板块 */}
            <Card className="p-4 self-start">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-slate-900">行业跌幅榜</h3>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="space-y-1">
                  {industryHotList
                    .sort((a, b) => a.pct_change - b.pct_change)
                    .slice(0, 10)
                    .map((sector, index) => (
                      <div
                        key={sector.ts_code}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'w-6 h-6 flex items-center justify-center text-xs font-bold rounded',
                            index < 3 ? 'bg-green-100 text-green-700' : 'text-slate-600'
                          )}>
                            {index + 1}
                          </span>
                          <span className="font-medium text-slate-900">{sector.ts_name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={cn(
                              'font-mono font-medium',
                              sector.pct_change >= 0 ? 'text-[#ff4d4f]' : 'text-green-600'
                            )}>
                              {sector.pct_change >= 0 ? '+' : ''}{sector.pct_change.toFixed(2)}%
                            </div>
                            <div className="text-xs text-slate-600">
                              热度 {sector.hot}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  {industryHotList.length === 0 && (
                    <div className="text-center text-slate-500 py-4">暂无下跌行业</div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="concept" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 涨幅榜 - 概念板块 */}
            <Card className="p-4 self-start">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-slate-900">概念涨幅榜</h3>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="space-y-1">
                  {conceptHotList
                    .sort((a, b) => b.pct_change - a.pct_change)
                    .slice(0, 10)
                    .map((sector, index) => (
                      <div
                        key={sector.ts_code}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'w-6 h-6 flex items-center justify-center text-xs font-bold rounded',
                            index < 3 ? 'bg-red-100 text-red-700' : 'text-slate-600'
                          )}>
                            {index + 1}
                          </span>
                          <span className="font-medium text-slate-900">{sector.ts_name}</span>
                          {sector.hot > 80 && (
                            <Flame className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={cn(
                              'font-mono font-medium',
                              sector.pct_change >= 0 ? 'text-[#ff4d4f]' : 'text-green-600'
                            )}>
                              {sector.pct_change >= 0 ? '+' : ''}{sector.pct_change.toFixed(2)}%
                            </div>
                            <div className="text-xs text-slate-600">
                              热度 {sector.hot}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  {conceptHotList.length === 0 && (
                    <div className="text-center text-slate-500 py-4">暂无上涨概念</div>
                  )}
                </div>
              )}
            </Card>

            {/* 跌幅榜 - 概念板块 */}
            <Card className="p-4 self-start">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-slate-900">概念跌幅榜</h3>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="space-y-1">
                  {conceptHotList
                    .sort((a, b) => a.pct_change - b.pct_change)
                    .slice(0, 10)
                    .map((sector, index) => (
                      <div
                        key={sector.ts_code}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'w-6 h-6 flex items-center justify-center text-xs font-bold rounded',
                            index < 3 ? 'bg-green-100 text-green-700' : 'text-slate-600'
                          )}>
                            {index + 1}
                          </span>
                          <span className="font-medium text-slate-900">{sector.ts_name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={cn(
                              'font-mono font-medium',
                              sector.pct_change >= 0 ? 'text-[#ff4d4f]' : 'text-green-600'
                            )}>
                              {sector.pct_change >= 0 ? '+' : ''}{sector.pct_change.toFixed(2)}%
                            </div>
                            <div className="text-xs text-slate-600">
                              热度 {sector.hot}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  {conceptHotList.length === 0 && (
                    <div className="text-center text-slate-500 py-4">暂无下跌概念</div>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* 热股榜 */}
          <Card className="p-4 mt-4">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-slate-900">同花顺热股榜</h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <ScrollArea className="h-80">
                <div className="space-y-2">
                  {hotStockList.map((stock, index) => (
                    <div
                      key={stock.ts_code}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'w-6 h-6 flex items-center justify-center text-xs font-bold rounded',
                          index < 3 ? 'bg-orange-100 text-orange-700' : 'text-slate-600'
                        )}>
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-medium text-slate-900">{stock.ts_name}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {stock.concepts.slice(0, 3).map((concept, i) => (
                              <span key={i} className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                                {concept}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          'font-mono font-medium',
                          stock.pct_change >= 0 ? 'text-[#ff4d4f]' : 'text-green-600'
                        )}>
                          {stock.pct_change >= 0 ? '+' : ''}{stock.pct_change.toFixed(2)}%
                        </div>
                        <div className="text-xs text-slate-600">
                          热度 {stock.hot}
                        </div>
                      </div>
                    </div>
                  ))}
                  {hotStockList.length === 0 && (
                    <div className="text-center text-slate-500 py-4">暂无热股数据</div>
                  )}
                </div>
              </ScrollArea>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="kpl" className="mt-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-slate-900">开盘啦题材</h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {kplConcepts.map((concept, index) => (
                    <div
                      key={concept.name}
                      className="p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            'w-8 h-8 flex items-center justify-center text-sm font-bold rounded-lg',
                            index < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-200 text-slate-600'
                          )}>
                            {index + 1}
                          </span>
                          <span className="text-lg font-medium text-slate-900">{concept.name}</span>
                          <div className="flex items-center gap-1">
                            <Flame className="w-4 h-4 text-red-600" />
                            <span className="text-sm text-red-600">{concept.heat_score || 0}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-[#ff4d4f] font-mono">{concept.limit_up_count || 0}</div>
                            <div className="text-xs text-slate-600">涨停</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-slate-900 font-mono">{concept.up_count || 0}</div>
                            <div className="text-xs text-slate-600">上涨</div>
                          </div>
                        </div>
                      </div>
                      {concept.leading_stock && (
                        <div className="flex items-center gap-2 pl-11">
                          <span className="text-sm text-slate-600">龙头股:</span>
                          <span className="text-sm font-medium text-slate-900">{concept.leading_stock}</span>
                          {concept.leading_change && (
                            <span className={cn(
                              'text-sm font-mono',
                              (concept.leading_change || 0) >= 0 ? 'text-red-600' : 'text-green-600'
                            )}>
                              {(concept.leading_change || 0) >= 0 ? '+' : ''}{(concept.leading_change || 0).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {kplConcepts.length === 0 && (
                    <div className="text-center text-slate-500 py-8">暂无开盘啦题材数据</div>
                  )}
                </div>
              </ScrollArea>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

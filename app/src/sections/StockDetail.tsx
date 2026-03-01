import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { KLineChart } from '@/components/chart/KLineChart';
import { TimeSeriesChart } from '@/components/chart/TimeSeriesChart';
import { StockListTable } from '@/components/stock/StockListTable';
import { cn, formatNumber, getChangeColor, formatLargeNumber, formatVolumeHand } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Star,
  Bell,
  Share2,
  TrendingUp,
  BarChart3,
  FileText,
  Newspaper,
  ArrowLeft
} from 'lucide-react';
import { fetchStockDetailBundle } from '@/services/stockDetailService';

interface StockDetailData {
  ts_code: string;
  symbol: string;
  name: string;
  industry: string;
  market: string;
  area: string;
  list_date: string;
  trade_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  pre_close: number;
  change: number;
  pct_chg: number;
  vol: number;
  amount: number;
  turnover_rate: number;
  turnover_rate_f: number;
  volume_ratio: number;
  pe: number;
  pe_ttm: number;
  pb: number;
  ps: number;
  ps_ttm: number;
  dv_ratio: number;
  dv_ttm: number;
  total_share: number;
  float_share: number;
  free_share: number;
  total_mv: number;
  circ_mv: number;
}

interface MoneyFlowItem {
  trade_date: string;
  buy_sm_amount: number;
  sell_sm_amount: number;
  net_sm_amount: number;
  buy_md_amount: number;
  sell_md_amount: number;
  net_md_amount: number;
  buy_lg_amount: number;
  sell_lg_amount: number;
  net_lg_amount: number;
  buy_elg_amount: number;
  sell_elg_amount: number;
  net_elg_amount: number;
  net_main_amount: number;
  net_mf_amount: number;
}

interface KLineItem {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TimeSeriesItem {
  time: string;
  price: number;
  volume: number;
  avg_price: number;
}

// 股票详情视图组件
function StockDetailView({
  stockCode,
  onBack
}: {
  stockCode: string;
  onBack: () => void;
}) {
  const [chartType, setChartType] = useState<'timeseries' | 'kline'>('timeseries');
  const [isFavorited, setIsFavorited] = useState(false);
  const { data, isLoading } = useSWR(
    ['stock:detail:bundle', stockCode],
    () => fetchStockDetailBundle(stockCode),
    {
      dedupingInterval: 15_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const loading = isLoading && !data;
  const stockData = (data?.detail || null) as StockDetailData | null;
  const kLineData = (data?.kLineData || []) as KLineItem[];
  const timeSeriesData = (data?.timeSeriesData || []) as TimeSeriesItem[];
  const moneyFlowData = (data?.moneyFlowData || []) as MoneyFlowItem[];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-96 lg:col-span-2" />
          <div className="space-y-4">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        </div>
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </Button>
        <div className="text-center py-20 text-muted-foreground">
          未找到股票数据
        </div>
      </div>
    );
  }

  const { change, pct_chg, close: currentPrice, pre_close: preClose } = stockData;

  return (
    <div className="space-y-4">
      {/* 返回按钮 */}
      <Button variant="outline" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        返回列表
      </Button>

      {/* 股票头部信息 */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{stockData.name}</h2>
                <span className="text-sm text-muted-foreground">{stockData.ts_code}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded bg-border text-muted-foreground">{stockData.industry}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-border text-muted-foreground">{stockData.market}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-yellow-400"
                onClick={() => setIsFavorited(!isFavorited)}
              >
                <Star className={cn('w-5 h-5', isFavorited && 'fill-yellow-400 text-yellow-400')} />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-muted-foreground">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-muted-foreground">
                <Share2 className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={cn('text-3xl font-bold font-mono', getChangeColor(change))}>
              {formatNumber(currentPrice)}
            </div>
            <div className="flex flex-col">
              <span className={cn('text-sm font-mono', getChangeColor(change))}>
                {change > 0 ? '+' : ''}{formatNumber(change)}
              </span>
              <span className={cn('text-sm font-mono', getChangeColor(change))}>
                {pct_chg > 0 ? '+' : ''}{pct_chg.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* 关键数据 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mt-4 pt-4 border-t border-border">
          <div>
            <div className="text-xs text-muted-foreground">今开</div>
            <div className={cn('text-sm font-mono', getChangeColor(stockData.open - preClose))}>
              {formatNumber(stockData.open)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">最高</div>
            <div className="text-sm font-mono text-red-500">{formatNumber(stockData.high)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">最低</div>
            <div className="text-sm font-mono text-green-500">{formatNumber(stockData.low)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">昨收</div>
            <div className="text-sm font-mono text-foreground">{formatNumber(preClose)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">成交量</div>
            <div className="text-sm font-mono text-foreground">{formatVolumeHand(stockData.vol)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">成交额</div>
            <div className="text-sm font-mono text-foreground">{formatLargeNumber(stockData.amount, 'qian')}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">换手率</div>
            <div className="text-sm font-mono text-foreground">{stockData.turnover_rate?.toFixed(2) || '-'}%</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">市盈率</div>
            <div className="text-sm font-mono text-foreground">{stockData.pe_ttm?.toFixed(2) || '-'}</div>
          </div>
        </div>
      </Card>

      {/* 主要内容区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 图表区域 */}
        <Card className="p-4 lg:col-span-2">
          {/* 图表类型切换 */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={chartType === 'timeseries' ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setChartType('timeseries')}
            >
              分时
            </Button>
            <Button
              variant={chartType === 'kline' ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setChartType('kline')}
            >
              日K
            </Button>
          </div>

          {/* 图表内容 */}
          {chartType === 'timeseries' ? (
            <TimeSeriesChart
              data={timeSeriesData}
              preClose={stockData.pre_close || 0}
              className="h-96"
              stockName={stockData.name}
              stockCode={stockData.ts_code}
              tradeDate={stockData.trade_date}
            />
          ) : (
            kLineData.length > 0 ? (
              <KLineChart data={kLineData} className="h-96" />
            ) : (
              <div className="h-96 flex items-center justify-center text-muted-foreground">
                暂无K线数据
              </div>
            )
          )}
        </Card>

        {/* 右侧信息 */}
        <div className="space-y-4">
          {/* 行情概览 */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">行情概览</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">量比</span>
                <span className="font-mono text-foreground">{stockData.volume_ratio?.toFixed(2) || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">换手率(自由流通)</span>
                <span className="font-mono text-foreground">{stockData.turnover_rate_f?.toFixed(2) || '-'}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">市盈率(静态)</span>
                <span className="font-mono text-foreground">{stockData.pe?.toFixed(2) || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">市盈率(TTM)</span>
                <span className="font-mono text-foreground">{stockData.pe_ttm?.toFixed(2) || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">市净率</span>
                <span className="font-mono text-foreground">{stockData.pb?.toFixed(2) || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">股息率</span>
                <span className="font-mono text-foreground">{stockData.dv_ttm?.toFixed(2) || '-'}%</span>
              </div>
            </div>
          </Card>

          {/* 资金流向 */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">今日资金流向</h3>
            {moneyFlowData.length > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">主力净流入</span>
                  <span className={cn(
                    'font-mono font-medium',
                    (moneyFlowData[0].net_main_amount || 0) > 0 ? 'text-red-500' : 'text-green-500'
                  )}>
                    {(moneyFlowData[0].net_main_amount || 0) > 0 ? '+' : ''}
                    {((moneyFlowData[0].net_main_amount || 0) / 10000).toFixed(2)}万
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">特大单净流入</span>
                  <span className={cn(
                    'font-mono',
                    (moneyFlowData[0].net_elg_amount || 0) > 0 ? 'text-red-500' : 'text-green-500'
                  )}>
                    {(moneyFlowData[0].net_elg_amount || 0) > 0 ? '+' : ''}
                    {((moneyFlowData[0].net_elg_amount || 0) / 10000).toFixed(2)}万
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">大单净流入</span>
                  <span className={cn(
                    'font-mono',
                    (moneyFlowData[0].net_lg_amount || 0) > 0 ? 'text-red-500' : 'text-green-500'
                  )}>
                    {(moneyFlowData[0].net_lg_amount || 0) > 0 ? '+' : ''}
                    {((moneyFlowData[0].net_lg_amount || 0) / 10000).toFixed(2)}万
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">中单净流入</span>
                  <span className={cn(
                    'font-mono',
                    (moneyFlowData[0].net_md_amount || 0) > 0 ? 'text-red-500' : 'text-green-500'
                  )}>
                    {(moneyFlowData[0].net_md_amount || 0) > 0 ? '+' : ''}
                    {((moneyFlowData[0].net_md_amount || 0) / 10000).toFixed(2)}万
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">小单净流入</span>
                  <span className={cn(
                    'font-mono',
                    (moneyFlowData[0].net_sm_amount || 0) > 0 ? 'text-red-500' : 'text-green-500'
                  )}>
                    {(moneyFlowData[0].net_sm_amount || 0) > 0 ? '+' : ''}
                    {((moneyFlowData[0].net_sm_amount || 0) / 10000).toFixed(2)}万
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">暂无资金流向数据</div>
            )}
          </Card>
        </div>
      </div>

      {/* Tab内容 */}
      <Tabs defaultValue="fundamental" className="w-full">
        <TabsList className="w-full justify-start bg-muted">
          <TabsTrigger value="fundamental" className="data-[state=active]:bg-white">
            <FileText className="w-4 h-4 mr-1" />
            基本面
          </TabsTrigger>
          <TabsTrigger value="financial" className="data-[state=active]:bg-white">
            <BarChart3 className="w-4 h-4 mr-1" />
            市值股本
          </TabsTrigger>
          <TabsTrigger value="capital" className="data-[state=active]:bg-white">
            <TrendingUp className="w-4 h-4 mr-1" />
            资金流向
          </TabsTrigger>
          <TabsTrigger value="news" className="data-[state=active]:bg-white">
            <Newspaper className="w-4 h-4 mr-1" />
            公司信息
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fundamental" className="mt-4">
          <Card className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">总市值</div>
                <div className="text-lg font-mono text-foreground">{formatLargeNumber(stockData.total_mv || 0, 'wan')}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">流通市值</div>
                <div className="text-lg font-mono text-foreground">{formatLargeNumber(stockData.circ_mv || 0, 'wan')}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">市盈率(TTM)</div>
                <div className="text-lg font-mono text-foreground">{stockData.pe_ttm?.toFixed(2) || '-'}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">市净率</div>
                <div className="text-lg font-mono text-foreground">{stockData.pb?.toFixed(2) || '-'}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">市销率(TTM)</div>
                <div className="text-lg font-mono text-foreground">{stockData.ps_ttm?.toFixed(2) || '-'}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">股息率</div>
                <div className="text-lg font-mono text-foreground">{stockData.dv_ratio?.toFixed(2) || '-'}%</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">股息率(TTM)</div>
                <div className="text-lg font-mono text-foreground">{stockData.dv_ttm?.toFixed(2) || '-'}%</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">量比</div>
                <div className="text-lg font-mono text-foreground">{stockData.volume_ratio?.toFixed(2) || '-'}</div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="mt-4">
          <Card className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">总股本</div>
                <div className="text-lg font-mono text-foreground">{formatLargeNumber(stockData.total_share || 0, 'wan')}股</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">流通股本</div>
                <div className="text-lg font-mono text-foreground">{formatLargeNumber(stockData.float_share || 0, 'wan')}股</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">自由流通股</div>
                <div className="text-lg font-mono text-foreground">{formatLargeNumber(stockData.free_share || 0, 'wan')}股</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">换手率</div>
                <div className="text-lg font-mono text-foreground">{stockData.turnover_rate?.toFixed(2) || '-'}%</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">换手率(自由流通)</div>
                <div className="text-lg font-mono text-foreground">{stockData.turnover_rate_f?.toFixed(2) || '-'}%</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">总市值</div>
                <div className="text-lg font-mono text-foreground">{formatLargeNumber(stockData.total_mv || 0, 'wan')}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">流通市值</div>
                <div className="text-lg font-mono text-foreground">{formatLargeNumber(stockData.circ_mv || 0, 'wan')}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">数据日期</div>
                <div className="text-lg font-mono text-foreground">{stockData.trade_date || '-'}</div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="capital" className="mt-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">近5日资金流向</h3>
            {moneyFlowData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium">日期</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">主力净流入</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">特大单</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">大单</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">中单</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium">小单</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moneyFlowData.map((flow) => (
                      <tr key={flow.trade_date} className="border-b border-border hover:bg-muted">
                        <td className="py-2 px-3 text-foreground">{flow.trade_date}</td>
                        <td className={cn(
                          'py-2 px-3 text-right font-mono',
                          (flow.net_main_amount || 0) > 0 ? 'text-red-500' : 'text-green-500'
                        )}>
                          {((flow.net_main_amount || 0) / 10000).toFixed(2)}万
                        </td>
                        <td className={cn(
                          'py-2 px-3 text-right font-mono',
                          (flow.net_elg_amount || 0) > 0 ? 'text-red-500' : 'text-green-500'
                        )}>
                          {((flow.net_elg_amount || 0) / 10000).toFixed(2)}万
                        </td>
                        <td className={cn(
                          'py-2 px-3 text-right font-mono',
                          (flow.net_lg_amount || 0) > 0 ? 'text-red-500' : 'text-green-500'
                        )}>
                          {((flow.net_lg_amount || 0) / 10000).toFixed(2)}万
                        </td>
                        <td className={cn(
                          'py-2 px-3 text-right font-mono',
                          (flow.net_md_amount || 0) > 0 ? 'text-red-500' : 'text-green-500'
                        )}>
                          {((flow.net_md_amount || 0) / 10000).toFixed(2)}万
                        </td>
                        <td className={cn(
                          'py-2 px-3 text-right font-mono',
                          (flow.net_sm_amount || 0) > 0 ? 'text-red-500' : 'text-green-500'
                        )}>
                          {((flow.net_sm_amount || 0) / 10000).toFixed(2)}万
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                暂无资金流向数据
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="news" className="mt-4">
          <Card className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">所属行业</div>
                <div className="text-lg font-medium text-foreground">{stockData.industry || '-'}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">所属地区</div>
                <div className="text-lg font-medium text-foreground">{stockData.area || '-'}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">上市板块</div>
                <div className="text-lg font-medium text-foreground">{stockData.market || '-'}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">上市日期</div>
                <div className="text-lg font-mono text-foreground">{stockData.list_date || '-'}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">股票代码</div>
                <div className="text-lg font-mono text-foreground">{stockData.ts_code}</div>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="text-xs text-muted-foreground">证券代码</div>
                <div className="text-lg font-mono text-foreground">{stockData.symbol}</div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 主组件：股票列表 + 详情切换
export function StockDetail({ initialStockCode }: { initialStockCode?: string | null }) {
  const [selectedStock, setSelectedStock] = useState<string | null>(initialStockCode ?? null);

  // 当外部传入的 initialStockCode 变化时同步更新
  useEffect(() => {
    if (initialStockCode) {
      setSelectedStock(initialStockCode);
    }
  }, [initialStockCode]);

  // 如果选中了股票，显示详情页
  if (selectedStock) {
    return (
      <StockDetailView
        stockCode={selectedStock}
        onBack={() => setSelectedStock(null)}
      />
    );
  }

  // 默认显示股票列表
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">全部股票行情</h2>
        <div className="text-sm text-muted-foreground">
          点击任意股票查看详情
        </div>
      </div>
      <StockListTable onSelectStock={setSelectedStock} />
    </div>
  );
}

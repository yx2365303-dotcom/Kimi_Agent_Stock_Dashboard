import { useEffect, useState } from 'react';
import { IndexCard } from '@/components/stock/IndexCard';
import { UpDownDistribution } from '@/components/stock/UpDownDistribution';
import { MoneyFlowChart } from '@/components/stock/MoneyFlowChart';
import { MarketSentimentCard } from '@/components/stock/MarketSentiment';
import { LimitUpStats } from '@/components/stock/LimitUpStats';
import { SectorList } from '@/components/stock/SectorList';
import { NorthFlowCard } from '@/components/stock/NorthFlowCard';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, getChangeColor } from '@/lib/utils';
import { 
  fetchIndices,
  fetchHotSectors,
  fetchLimitUpList,
  fetchUpDownDistribution,
  fetchMarketSentiment,
  fetchNorthFlow,
  fetchHsgtTop10
} from '@/services/stockService';
import type { IndexData, SectorData, LimitUpData, MarketSentiment as MarketSentimentType } from '@/types';

// 定义北向资金和涨跌分布的类型
interface NorthFlowData {
  net_inflow: number;
  sh_inflow: number;
  sz_inflow: number;
  cumulative_30d: number;
  time_series: { date: string; amount: number }[];
}

interface UpDownDistributionData {
  up_count: number;
  down_count: number;
  flat_count: number;
  limit_up: number;
  limit_down: number;
  distribution: { range: string; count: number; type: 'limit_up' | 'up' | 'flat' | 'down' | 'limit_down' }[];
}

interface HsgtItem {
  ts_code: string;
  name: string;
  amount: number;
  close: number;
  change: number;
  rank: number;
  market_type: string;
  net_amount: number | null;
}

export function MarketOverview() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [indices, setIndices] = useState<IndexData[]>([]);
  const [sectors, setSectors] = useState<SectorData[]>([]);
  const [limitUpList, setLimitUpList] = useState<LimitUpData[]>([]);
  const [upDownDistribution, setUpDownDistribution] = useState<UpDownDistributionData | null>(null);
  const [sentiment, setSentiment] = useState<MarketSentimentType | null>(null);
  const [northFlow, setNorthFlow] = useState<NorthFlowData | null>(null);
  const [hsgtTop10, setHsgtTop10] = useState<HsgtItem[]>([]);
  const [updateTime, setUpdateTime] = useState('');

  const loadData = async () => {
    console.log('开始加载数据...');
    
    try {
      // 并行加载所有数据，每个请求独立处理错误
      const results = await Promise.allSettled([
        fetchIndices(),
        fetchHotSectors(20),
        fetchLimitUpList(20),
        fetchUpDownDistribution(),
        fetchMarketSentiment(),
        fetchNorthFlow(30),
        fetchHsgtTop10()
      ]);
      
      console.log('数据加载完成:', results.map((r, i) => 
        `${['indices', 'sectors', 'limitUp', 'upDown', 'sentiment', 'northFlow', 'hsgt'][i]}: ${r.status}`
      ));
      
      // 分别处理每个结果
      if (results[0].status === 'fulfilled') {
        setIndices(results[0].value as IndexData[]);
      }
      if (results[1].status === 'fulfilled') {
        setSectors(results[1].value as SectorData[]);
      }
      if (results[2].status === 'fulfilled') {
        setLimitUpList(results[2].value as LimitUpData[]);
      }
      if (results[3].status === 'fulfilled') {
        setUpDownDistribution(results[3].value as UpDownDistributionData);
      }
      if (results[4].status === 'fulfilled') {
        setSentiment(results[4].value as MarketSentimentType);
      }
      if (results[5].status === 'fulfilled') {
        setNorthFlow(results[5].value as NorthFlowData);
      }
      if (results[6].status === 'fulfilled') {
        setHsgtTop10(results[6].value as HsgtItem[]);
      }
      
      // 更新时间
      const now = new Date();
      setUpdateTime(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
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
      </div>

      {/* 市场情绪 + 涨跌停统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sentiment ? (
          <MarketSentimentCard data={sentiment} />
        ) : (
          <Card className="p-4 border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">市场情绪</h3>
            <div className="h-48 flex items-center justify-center text-slate-500">
              暂无数据
            </div>
          </Card>
        )}
        {limitUpList.length > 0 && upDownDistribution ? (
          <LimitUpStats 
            limitUpList={limitUpList}
            limitUpCount={upDownDistribution.limit_up}
            limitDownCount={upDownDistribution.limit_down}
            brokenCount={12}
            maxLimitCount={5}
          />
        ) : (
          <Card className="p-4 border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">涨跌停统计</h3>
            <div className="h-48 flex items-center justify-center text-slate-500">
              暂无数据
            </div>
          </Card>
        )}
      </div>

      {/* 板块涨幅榜 + 板块跌幅榜 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectorList 
          sectors={sectors.filter(s => s.pct_change > 0).slice(0, 10)} 
          title="板块涨幅榜"
          type="up"
        />
        <SectorList 
          sectors={sectors.filter(s => s.pct_change < 0).sort((a, b) => a.pct_change - b.pct_change).slice(0, 10)} 
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
    </div>
  );
}

import { useState } from 'react';
import { mockSectors, mockKplConcepts } from '@/data/mock';
import { cn, formatPercent } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Flame, TrendingUp, TrendingDown, Zap } from 'lucide-react';

// 热力图数据
const heatmapData = [
  { name: '半导体', value: 5.23, size: 100 },
  { name: '人工智能', value: 4.85, size: 95 },
  { name: '芯片概念', value: 4.62, size: 90 },
  { name: '新能源', value: 3.78, size: 85 },
  { name: '5G通信', value: 3.45, size: 80 },
  { name: '云计算', value: 2.95, size: 75 },
  { name: '生物医药', value: 2.56, size: 70 },
  { name: '消费电子', value: 2.12, size: 65 },
  { name: '军工', value: 1.85, size: 60 },
  { name: '银行', value: -1.95, size: 55 },
  { name: '房地产', value: -2.81, size: 50 },
  { name: '煤炭', value: -3.52, size: 45 },
  { name: '钢铁', value: -2.15, size: 40 },
  { name: '石油', value: -1.85, size: 35 },
  { name: '电力', value: -1.25, size: 30 },
];

export function SectorHeat() {
  const [activeTab, setActiveTab] = useState('industry');

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
            >
              <div className="font-medium">{item.name}</div>
              <div className="text-xs opacity-80">{formatPercent(item.value)}</div>
            </div>
          ))}
        </div>
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
            {/* 热门板块 */}
            <Card className="p-4 self-start">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold text-slate-900">热门板块</h3>
              </div>
              <div className="space-y-1">
                {mockSectors
                  .filter(s => s.pct_change > 0)
                  .sort((a, b) => b.pct_change - a.pct_change)
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
                        <span className="font-medium text-slate-900">{sector.name}</span>
                        {sector.heat_score >= 80 && (
                          <Flame className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[#ff4d4f] font-mono font-medium">
                            +{sector.pct_change.toFixed(2)}%
                          </div>
                          <div className="text-xs text-slate-600">
                            {sector.limit_up_count}只涨停
                          </div>
                        </div>
                        <div className="text-right min-w-20">
                          <div className="text-sm text-[#ff7875]">
                            +{sector.net_inflow.toFixed(1)}亿
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>

            {/* 跌幅榜 */}
            <Card className="p-4 self-start">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-slate-900">跌幅榜</h3>
              </div>
              <div className="space-y-1">
                {mockSectors
                  .filter(s => s.pct_change < 0)
                  .sort((a, b) => a.pct_change - b.pct_change)
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
                        <span className="font-medium text-slate-900">{sector.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-green-600 font-mono font-medium">
                            {sector.pct_change.toFixed(2)}%
                          </div>
                          <div className="text-xs text-slate-600">
                            {sector.down_count}只下跌
                          </div>
                        </div>
                        <div className="text-right min-w-20">
                          <div className="text-sm text-green-500">
                            {sector.net_inflow.toFixed(1)}亿
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="concept" className="mt-4">
          <Card className="p-4">
            <div className="text-center text-slate-600 py-8">
              概念板块数据加载中...
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="kpl" className="mt-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-slate-900">开盘啦题材</h3>
            </div>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {mockKplConcepts.map((concept, index) => (
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
                          <span className="text-sm text-red-600">{concept.heat_score}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-[#ff4d4f] font-mono">{concept.limit_up_count}</div>
                          <div className="text-xs text-slate-600">涨停</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-slate-900 font-mono">{concept.up_count}</div>
                          <div className="text-xs text-slate-600">上涨</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-11">
                      <span className="text-sm text-slate-600">龙头股:</span>
                      <span className="text-sm font-medium text-slate-900">{concept.leading_stock}</span>
                      <span className="text-sm text-red-600 font-mono">+{concept.leading_change.toFixed(2)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

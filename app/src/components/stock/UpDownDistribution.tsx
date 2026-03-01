import { memo, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import * as echarts from 'echarts/core';
import { BarChart as EBarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Flame, TrendingUp, Zap, TrendingDown } from 'lucide-react';

echarts.use([EBarChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface DistributionItem {
  range: string;
  count: number;
  type?: 'limit_up' | 'up' | 'flat' | 'down' | 'limit_down';
  color?: string;
}

interface LianbanStats {
  oneBoard: number;
  twoBoard: number;
  threeBoard: number;
  fourBoard: number;
  fivePlus: number;
}

interface IndustryItem {
  name: string;
  count: number;
}

interface UpDownDistributionProps {
  data: {
    up_count: number;
    down_count: number;
    flat_count: number;
    limit_up: number;
    limit_down: number;
    distribution: DistributionItem[];
    // 新增字段
    lianbanStats?: LianbanStats;
    zhabanCount?: number;
    fengbanRate?: number;
    topIndustries?: IndustryItem[];
    maxLianban?: number;
    totalAttempts?: number;
  };
  className?: string;
}

export const UpDownDistribution = memo(function UpDownDistribution({ data, className }: UpDownDistributionProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  const getBarColor = (item: DistributionItem) => {
    if (item.color) return item.color;
    switch (item.type) {
      case 'limit_up': return '#dc2626';
      case 'up': return '#ef4444';
      case 'flat': return '#94a3b8';
      case 'down': return '#16a34a';
      case 'limit_down': return '#22c55e';
      default: return '#94a3b8';
    }
  };

  useEffect(() => {
    if (!chartRef.current || !data.distribution?.length) return;
    const isDark = document.documentElement.classList.contains('dark');
    const chart = echarts.init(chartRef.current);
    const colors = data.distribution.map(item => getBarColor(item));
    chart.setOption({
      grid: { top: 5, right: 5, bottom: 45, left: 30 },
      xAxis: {
        type: 'category',
        data: data.distribution.map(d => d.range),
        axisLabel: { fontSize: 9, color: isDark ? '#94a3b8' : '#64748b', rotate: 45 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10, color: isDark ? '#94a3b8' : '#64748b' },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: isDark ? '#334155' : '#e2e8f0' } },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        textStyle: { color: isDark ? '#e2e8f0' : '#1e293b', fontSize: 12 },
        formatter: (params: any) => {
          const p = params[0];
          return `${p.name}<br/>数量: ${p.value}只`;
        },
      },
      series: [{
        type: 'bar',
        data: data.distribution.map((d, i) => ({
          value: d.count,
          itemStyle: { color: colors[i], borderRadius: [2, 2, 0, 0] },
        })),
        barMaxWidth: 20,
      }],
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [data.distribution]);

  // 连板数据
  const lianban = data.lianbanStats || { oneBoard: 0, twoBoard: 0, threeBoard: 0, fourBoard: 0, fivePlus: 0 };
  const maxBar = Math.max(lianban.oneBoard, lianban.twoBoard, lianban.threeBoard, lianban.fourBoard, lianban.fivePlus, 1);

  // 计算涨跌比例
  const total = (data.up_count || 0) + (data.down_count || 0) + (data.flat_count || 0);
  const upRatio = total > 0 ? ((data.up_count / total) * 100).toFixed(1) : '0';
  const downRatio = total > 0 ? ((data.down_count / total) * 100).toFixed(1) : '0';

  return (
    <Card className={cn('p-4 border-border', className)}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground">涨跌分布</h3>
        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded">
            <TrendingUp className="w-3 h-3 text-red-600" />
            <span className="text-red-600 font-semibold">{data.up_count || 0}</span>
            <span className="text-red-400">({upRatio}%)</span>
          </div>
          <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded">
            <span className="text-muted-foreground">平</span>
            <span className="text-muted-foreground font-semibold">{data.flat_count || 0}</span>
          </div>
          <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded">
            <TrendingDown className="w-3 h-3 text-green-600" />
            <span className="text-green-600 font-semibold">{data.down_count || 0}</span>
            <span className="text-green-400">({downRatio}%)</span>
          </div>
        </div>
      </div>

      {/* 涨停/跌停 主数据 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
          <div className="text-2xl font-bold text-red-600 font-mono">{data.limit_up}</div>
          <div className="text-xs text-muted-foreground mt-0.5">涨停</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
          <div className="text-2xl font-bold text-green-600 font-mono">{data.limit_down}</div>
          <div className="text-xs text-muted-foreground mt-0.5">跌停</div>
        </div>
      </div>

      {/* 连板分布 + 炸板统计 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* 连板分布 */}
        <div className="bg-muted rounded-lg p-2.5 border border-border">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-medium text-muted-foreground">连板分布</span>
            {data.maxLianban && data.maxLianban > 0 && (
              <span className="text-xs text-red-500 ml-auto">最高{data.maxLianban}板</span>
            )}
          </div>
          <div className="space-y-1.5">
            {[
              { label: '一板', value: lianban.oneBoard },
              { label: '二板', value: lianban.twoBoard },
              { label: '三板', value: lianban.threeBoard },
              { label: '四板+', value: lianban.fourBoard + lianban.fivePlus },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-8">{item.label}</span>
                <div className="flex-1 h-3 bg-border rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all"
                    style={{ width: `${(item.value / maxBar) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground w-6 text-right">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 炸板统计 */}
        <div className="bg-muted rounded-lg p-2.5 border border-border">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground">封板统计</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">炸板数</span>
              <span className="text-sm font-mono font-semibold text-amber-600">{data.zhabanCount || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">封板率</span>
              <span className={cn(
                'text-sm font-mono font-semibold',
                (data.fengbanRate || 0) >= 80 ? 'text-red-500' : 
                (data.fengbanRate || 0) >= 60 ? 'text-amber-500' : 'text-green-500'
              )}>
                {(data.fengbanRate || 0).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">涨停/跌停比</span>
              <span className={cn(
                'text-sm font-mono font-semibold',
                data.limit_up > data.limit_down ? 'text-red-500' : 'text-green-500'
              )}>
                {data.limit_down > 0 ? (data.limit_up / data.limit_down).toFixed(1) : data.limit_up}:1
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 涨停行业TOP3 */}
      {data.topIndustries && data.topIndustries.length > 0 && (
        <div className="mb-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-2.5 border border-red-100">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Flame className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-medium text-muted-foreground">涨停行业TOP3</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.topIndustries.map((industry, index) => (
              <span 
                key={industry.name}
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  index === 0 ? 'bg-red-100 text-red-700' :
                  index === 1 ? 'bg-orange-100 text-orange-700' :
                  'bg-amber-100 text-amber-700'
                )}
              >
                {industry.name} ({industry.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 涨跌幅分布图 */}
      <div className="h-36" ref={chartRef} />
    </Card>
  );
});
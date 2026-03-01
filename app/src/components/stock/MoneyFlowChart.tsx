import { memo, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, MarkLineComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

echarts.use([LineChart, GridComponent, TooltipComponent, MarkLineComponent, CanvasRenderer]);

interface MoneyFlowChartProps {
  data: {
    net_inflow: number;
    sh_inflow: number;
    sz_inflow: number;
    cumulative_30d: number;
    cumulative_week?: number;
    change_from_yesterday?: number;
    change_percent?: number;
    time_series: { date: string; amount: number; hgt?: number; sgt?: number }[];
  };
  className?: string;
}

export const MoneyFlowChart = memo(function MoneyFlowChart({ data, className }: MoneyFlowChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isPositive = data.net_inflow > 0;
  const changeIsPositive = (data.change_from_yesterday || 0) > 0;

  useEffect(() => {
    if (!chartRef.current || !data.time_series?.length) return;
    const isDark = document.documentElement.classList.contains('dark');
    const chart = echarts.init(chartRef.current);
    chart.setOption({
      grid: { top: 10, right: 5, bottom: 25, left: 40 },
      xAxis: {
        type: 'category',
        data: data.time_series.map(d => d.date),
        axisLabel: {
          fontSize: 10,
          color: isDark ? '#94a3b8' : '#64748b',
          interval: 3,
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 10,
          color: isDark ? '#94a3b8' : '#64748b',
          formatter: (v: number) => v.toFixed(0),
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          lineStyle: { color: isDark ? '#334155' : '#e2e8f0', type: 'dashed' as const },
        },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        textStyle: { color: isDark ? '#e2e8f0' : '#1e293b', fontSize: 12 },
        extraCssText: 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);border-radius:8px;',
        formatter: (params: any) => {
          const p = params[0];
          const val = Number(p.value);
          return `日期: ${p.name}<br/>净流入: ${val > 0 ? '+' : ''}${val.toFixed(2)}亿`;
        },
      },
      series: [{
        type: 'line',
        data: data.time_series.map(d => d.amount),
        smooth: true,
        symbol: 'none',
        emphasis: {
          itemStyle: { color: '#3b82f6', borderColor: '#fff', borderWidth: 2 },
          scale: true,
        },
        lineStyle: { color: '#3b82f6', width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: isDark ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.4)' },
            { offset: 1, color: isDark ? 'rgba(59,130,246,0.02)' : 'rgba(59,130,246,0.05)' },
          ]),
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: isDark ? '#64748b' : '#94a3b8', type: 'dashed' as const },
          data: [{ yAxis: 0 }],
          label: { show: false },
        },
      }],
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [data.time_series]);

  return (
    <Card className={cn('p-4 border-border flex flex-col h-full', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">北向资金流向</h3>
        <div className="flex items-center gap-2">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-red-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-green-600" />
          )}
          <span className={cn('text-lg font-bold font-mono', isPositive ? 'text-red-600' : 'text-green-600')}>
            {isPositive ? '+' : ''}{data.net_inflow.toFixed(2)}亿
          </span>
          {data.change_percent !== undefined && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5',
              changeIsPositive ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
            )}>
              {changeIsPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(data.change_percent).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* 2x3 数据网格 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-muted rounded-lg p-2.5 text-center border border-border">
          <div className="text-xs text-muted-foreground mb-1">沪股通</div>
          <div className={cn('text-sm font-bold font-mono', data.sh_inflow > 0 ? 'text-red-600' : 'text-green-600')}>
            {data.sh_inflow > 0 ? '+' : ''}{data.sh_inflow.toFixed(2)}亿
          </div>
        </div>
        <div className="bg-muted rounded-lg p-2.5 text-center border border-border">
          <div className="text-xs text-muted-foreground mb-1">深股通</div>
          <div className={cn('text-sm font-bold font-mono', data.sz_inflow > 0 ? 'text-red-600' : 'text-green-600')}>
            {data.sz_inflow > 0 ? '+' : ''}{data.sz_inflow.toFixed(2)}亿
          </div>
        </div>
        <div className="bg-muted rounded-lg p-2.5 text-center border border-border">
          <div className="text-xs text-muted-foreground mb-1">较昨日</div>
          <div className={cn('text-sm font-bold font-mono', changeIsPositive ? 'text-red-600' : 'text-green-600')}>
            {changeIsPositive ? '+' : ''}{(data.change_from_yesterday || 0).toFixed(2)}亿
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-2.5 text-center border border-blue-100">
          <div className="text-xs text-blue-600 mb-1">本周累计</div>
          <div className={cn('text-sm font-bold font-mono', (data.cumulative_week || 0) > 0 ? 'text-red-600' : 'text-green-600')}>
            {(data.cumulative_week || 0) > 0 ? '+' : ''}{(data.cumulative_week || 0).toFixed(2)}亿
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-2.5 text-center border border-blue-100">
          <div className="text-xs text-blue-600 mb-1">30日累计</div>
          <div className={cn('text-sm font-bold font-mono', data.cumulative_30d > 0 ? 'text-red-600' : 'text-green-600')}>
            {data.cumulative_30d > 0 ? '+' : ''}{data.cumulative_30d.toFixed(2)}亿
          </div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2.5 text-center border border-amber-100">
          <div className="text-xs text-amber-600 mb-1">日均流入</div>
          <div className={cn('text-sm font-bold font-mono', (data.cumulative_30d / 30) > 0 ? 'text-red-600' : 'text-green-600')}>
            {(data.cumulative_30d / 30) > 0 ? '+' : ''}{(data.cumulative_30d / 30).toFixed(2)}亿
          </div>
        </div>
      </div>

      {/* 图表区域 - 自动填满剩余空间 */}
      <div className="flex-1 min-h-[200px]" ref={chartRef} />
    </Card>
  );
});
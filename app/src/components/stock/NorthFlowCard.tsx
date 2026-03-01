import { memo, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface NorthFlowData {
  net_inflow: number;
  sh_inflow: number;
  sz_inflow: number;
  cumulative_30d: number;
  time_series: { date: string; amount: number }[];
}

interface NorthFlowCardProps {
  data: NorthFlowData;
  className?: string;
}

export const NorthFlowCard = memo(function NorthFlowCard({ data, className }: NorthFlowCardProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isPositive = data.net_inflow > 0;
  
  const recent5Days = data.time_series.slice(-5);
  const cumulative5d = recent5Days.reduce((sum, item) => sum + item.amount, 0);
  
  const yesterdayAmount = data.time_series.length >= 2 
    ? data.time_series[data.time_series.length - 2].amount 
    : 0;
  const dayChange = data.net_inflow - yesterdayAmount;
  
  const chartData = data.time_series.slice(-10);

  useEffect(() => {
    if (!chartRef.current || !chartData.length) return;
    const isDark = document.documentElement.classList.contains('dark');
    const chart = echarts.init(chartRef.current);
    const strokeColor = isPositive ? '#ef4444' : '#22c55e';
    chart.setOption({
      grid: { top: 5, right: 5, bottom: 20, left: 5 },
      xAxis: {
        type: 'category',
        data: chartData.map(d => d.date),
        axisLabel: { fontSize: 10, color: isDark ? '#94a3b8' : '#94a3b8' },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        show: false,
        min: 'dataMin',
        max: 'dataMax',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        textStyle: { color: isDark ? '#e2e8f0' : '#1e293b', fontSize: 12 },
        formatter: (params: any) => {
          const p = params[0];
          return `日期: ${p.name}<br/>净流入: ${Number(p.value).toFixed(2)}亿`;
        },
      },
      series: [{
        type: 'line',
        data: chartData.map(d => d.amount),
        smooth: true,
        symbol: 'none',
        lineStyle: { color: strokeColor, width: 2 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: strokeColor + '4D' },   // 0.3 opacity
            { offset: 1, color: strokeColor + '00' },
          ]),
        },
      }],
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [chartData, isPositive]);
  
  return (
    <Card className={cn('p-4 border-border', className)}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground">北向资金</h3>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-muted-foreground">今日:</span>
          <span className={cn(
            'font-mono font-medium',
            isPositive ? 'text-red-600' : 'text-green-600'
          )}>
            {isPositive ? '+' : ''}{data.net_inflow.toFixed(2)}亿
          </span>
        </div>
      </div>
      
      {/* 主数字区域 */}
      <div className="bg-gradient-to-br from-muted to-muted rounded-lg p-4 mb-3">
        <div className="text-center mb-2">
          <div className={cn(
            'text-3xl font-bold font-mono',
            isPositive ? 'text-red-600' : 'text-green-600'
          )}>
            {isPositive ? '+' : ''}{data.net_inflow.toFixed(2)}亿
          </div>
          <div className="flex items-center justify-center gap-2 mt-1 text-sm text-muted-foreground">
            {dayChange !== 0 && (
              <span className={cn(
                'flex items-center gap-0.5',
                dayChange > 0 ? 'text-red-500' : 'text-green-500'
              )}>
                {dayChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                较昨日 {dayChange > 0 ? '+' : ''}{dayChange.toFixed(2)}亿
              </span>
            )}
          </div>
        </div>
        
        {/* 沪股通 / 深股通 分流 */}
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">沪股通</div>
            <div className={cn(
              'text-base font-mono font-semibold',
              data.sh_inflow > 0 ? 'text-red-600' : 'text-green-600'
            )}>
              {data.sh_inflow > 0 ? '+' : ''}{data.sh_inflow.toFixed(2)}亿
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">深股通</div>
            <div className={cn(
              'text-base font-mono font-semibold',
              data.sz_inflow > 0 ? 'text-red-600' : 'text-green-600'
            )}>
              {data.sz_inflow > 0 ? '+' : ''}{data.sz_inflow.toFixed(2)}亿
            </div>
          </div>
        </div>
      </div>
      
      {/* 迷你趋势图 */}
      {chartData.length > 0 && (
        <div className="h-20 mb-3" ref={chartRef} />
      )}
      
      {/* 累计数据 */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">5日累计</span>
          <span className={cn(
            'text-sm font-mono font-medium',
            cumulative5d > 0 ? 'text-red-600' : 'text-green-600'
          )}>
            {cumulative5d > 0 ? '+' : ''}{cumulative5d.toFixed(2)}亿
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">30日累计</span>
          <span className={cn(
            'text-sm font-mono font-medium',
            data.cumulative_30d > 0 ? 'text-red-600' : 'text-green-600'
          )}>
            {data.cumulative_30d > 0 ? '+' : ''}{data.cumulative_30d.toFixed(0)}亿
          </span>
        </div>
      </div>
    </Card>
  );
});
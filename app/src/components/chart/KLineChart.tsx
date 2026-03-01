import { useEffect, useRef, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import * as echarts from 'echarts/core';
import { CandlestickChart, BarChart as EBarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  DataZoomInsideComponent,
  DataZoomSliderComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  CandlestickChart,
  EBarChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  CanvasRenderer,
]);

interface KLineData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface KLineChartProps {
  data: KLineData[];
  className?: string;
}

// 聚合日K为周K / 月K
function aggregateKLine(data: KLineData[], period: 'day' | 'week' | 'month'): KLineData[] {
  if (period === 'day' || data.length === 0) return data;

  const groups: KLineData[][] = [];
  let currentGroup: KLineData[] = [];

  for (const item of data) {
    const d = new Date(item.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    if (currentGroup.length === 0) {
      currentGroup.push(item);
      continue;
    }

    const prevDate = new Date(currentGroup[0].date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    let isSameGroup = false;

    if (period === 'week') {
      // 同一周：取 ISO week
      const getWeek = (dt: Date) => {
        const start = new Date(dt.getFullYear(), 0, 1);
        return Math.ceil(((dt.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
      };
      isSameGroup = d.getFullYear() === prevDate.getFullYear() && getWeek(d) === getWeek(prevDate);
    } else {
      isSameGroup = d.getFullYear() === prevDate.getFullYear() && d.getMonth() === prevDate.getMonth();
    }

    if (isSameGroup) {
      currentGroup.push(item);
    } else {
      groups.push(currentGroup);
      currentGroup = [item];
    }
  }
  if (currentGroup.length > 0) groups.push(currentGroup);

  return groups.map((group) => ({
    date: group[group.length - 1].date,
    open: group[0].open,
    high: Math.max(...group.map((g) => g.high)),
    low: Math.min(...group.map((g) => g.low)),
    close: group[group.length - 1].close,
    volume: group.reduce((sum, g) => sum + g.volume, 0),
  }));
}

export function KLineChart({ data, className }: KLineChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  // 根据周期聚合数据
  const chartData = useMemo(() => aggregateKLine(data, period), [data, period]);

  // Init once, dispose on unmount
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = echarts.init(chartContainerRef.current, null);
    chartRef.current = chart;

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  // Update option when data or period changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || chartData.length === 0) return;

    const isDark = document.documentElement.classList.contains('dark');
    const colors = {
      up: isDark ? '#ef4444' : '#dc2626',
      down: isDark ? '#22c55e' : '#16a34a',
      text: isDark ? '#94a3b8' : '#64748b',
      line: isDark ? '#334155' : '#cbd5e1',
      grid: isDark ? '#1e293b' : '#f1f5f9',
      tooltipBg: isDark ? '#1e293b' : '#ffffff',
      tooltipBorder: isDark ? '#334155' : '#e2e8f0',
      tooltipText: isDark ? '#e2e8f0' : '#334155',
      zoom: isDark ? 'rgba(96,165,250,0.2)' : 'rgba(59,130,246,0.2)',
      zoomHandle: isDark ? '#60a5fa' : '#3b82f6',
    };

    const dates = chartData.map(item => item.date);
    const values = chartData.map(item => [item.open, item.close, item.low, item.high]);
    const volumes = chartData.map(item => item.volume);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.tooltipText }
      },
      grid: [
        {
          left: '10%',
          right: '3%',
          top: '8%',
          height: '55%'
        },
        {
          left: '10%',
          right: '3%',
          top: '70%',
          height: '15%'
        }
      ],
      xAxis: [
        {
          type: 'category',
          data: dates,
          boundaryGap: false,
          axisLine: { onZero: false, lineStyle: { color: colors.line } },
          splitLine: { show: false },
          axisLabel: { color: colors.text },
          min: 'dataMin',
          max: 'dataMax'
        },
        {
          type: 'category',
          gridIndex: 1,
          data: dates,
          axisLabel: { show: false }
        }
      ],
      yAxis: [
        {
          scale: true,
          splitArea: {
            show: true,
            areaStyle: {
              color: ['transparent', 'transparent']
            }
          },
          axisLine: { lineStyle: { color: colors.line } },
          axisLabel: { color: colors.text },
          splitLine: { lineStyle: { color: colors.grid } }
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLabel: { show: false },
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false }
        }
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 50,
          end: 100
        },
        {
          show: true,
          xAxisIndex: [0, 1],
          type: 'slider',
          top: '92%',
          start: 50,
          end: 100,
          textStyle: { color: colors.text },
          borderColor: colors.line,
          fillerColor: colors.zoom,
          handleStyle: {
            color: colors.zoomHandle
          }
        }
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: values,
          itemStyle: {
            color: colors.up,
            color0: colors.down,
            borderColor: colors.up,
            borderColor0: colors.down
          }
        },
        {
          name: '成交量',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volumes,
          itemStyle: {
            color: (params: any) => {
              const dataIndex = params.dataIndex;
              const close = values[dataIndex][1];
              const open = values[dataIndex][0];
              return close >= open ? colors.up : colors.down;
            }
          }
        }
      ]
    }, true); // notMerge=true for clean replace
  }, [chartData]);

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">K线图</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant={period === 'day' ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setPeriod('day')}
          >
            日K
          </Button>
          <Button
            variant={period === 'week' ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setPeriod('week')}
          >
            周K
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setPeriod('month')}
          >
            月K
          </Button>
        </div>
      </div>
      <div 
        ref={chartContainerRef} 
        className="flex-1 min-h-[300px] rounded-lg bg-muted/50"
      />
    </div>
  );
}

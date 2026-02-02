import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import * as echarts from 'echarts';

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

export function KLineChart({ data, className }: KLineChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = echarts.init(chartContainerRef.current, null);
    chartRef.current = chart;

    const dates = data.map(item => item.date);
    const values = data.map(item => [item.open, item.close, item.low, item.high]);
    const volumes = data.map(item => item.volume);

    const option = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        textStyle: { color: '#334155' }
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
          axisLine: { onZero: false, lineStyle: { color: '#cbd5e1' } },
          splitLine: { show: false },
          axisLabel: { color: '#64748b' },
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
              color: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0)']
            }
          },
          axisLine: { lineStyle: { color: '#cbd5e1' } },
          axisLabel: { color: '#64748b' },
          splitLine: { lineStyle: { color: '#f1f5f9' } }
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
          textStyle: { color: '#64748b' },
          borderColor: '#e2e8f0',
          fillerColor: 'rgba(59, 130, 246, 0.2)',
          handleStyle: {
            color: '#3b82f6'
          }
        }
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: values,
          itemStyle: {
            color: '#dc2626',
            color0: '#16a34a',
            borderColor: '#dc2626',
            borderColor0: '#16a34a'
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
              return close >= open ? '#dc2626' : '#16a34a';
            }
          }
        }
      ]
    };

    chart.setOption(option);

    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [data]);

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-700" />
          <span className="text-sm font-medium text-slate-900">K线图</span>
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
        className="flex-1 min-h-[300px] rounded-lg bg-slate-50"
      />
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';
import * as echarts from 'echarts';

interface TimeSeriesData {
    time: string;
    price: number;
    volume: number;
    avg_price: number;
}

interface TimeSeriesChartProps {
    data: TimeSeriesData[];
    preClose: number;
    className?: string;
}

export function TimeSeriesChart({ data, preClose, className }: TimeSeriesChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<echarts.ECharts | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current || data.length === 0) return;

        const chart = echarts.init(chartContainerRef.current, null);
        chartRef.current = chart;

        const times = data.map(item => item.time);
        const prices = data.map(item => item.price);
        const avgPrices = data.map(item => item.avg_price);
        const volumes = data.map(item => item.volume);

        // 计算价格范围
        const minPrice = Math.min(...prices, preClose);
        const maxPrice = Math.max(...prices, preClose);
        const priceRange = maxPrice - minPrice;
        const padding = priceRange * 0.1 || preClose * 0.02;

        // 计算涨跌幅范围（对称显示）
        const maxChangePct = Math.max(
            Math.abs((maxPrice - preClose) / preClose),
            Math.abs((minPrice - preClose) / preClose)
        ) * 100;

        const option: echarts.EChartsOption = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross',
                    crossStyle: {
                        color: '#999'
                    }
                },
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                textStyle: { color: '#334155', fontSize: 12 },
                formatter: (params: any) => {
                    if (!Array.isArray(params) || params.length === 0) return '';
                    const time = params[0].axisValue;
                    let html = `<div style="font-weight:600;margin-bottom:4px">${time}</div>`;

                    params.forEach((item: any) => {
                        if (item.seriesName === '价格') {
                            const price = item.value;
                            const change = price - preClose;
                            const changePct = (change / preClose * 100).toFixed(2);
                            const color = change >= 0 ? '#dc2626' : '#16a34a';
                            html += `<div style="display:flex;justify-content:space-between;gap:16px">
                <span>现价</span>
                <span style="color:${color};font-weight:600">${price.toFixed(2)} (${change >= 0 ? '+' : ''}${changePct}%)</span>
              </div>`;
                        } else if (item.seriesName === '均价') {
                            html += `<div style="display:flex;justify-content:space-between;gap:16px">
                <span>均价</span>
                <span style="color:#f59e0b">${item.value.toFixed(2)}</span>
              </div>`;
                        } else if (item.seriesName === '成交量') {
                            html += `<div style="display:flex;justify-content:space-between;gap:16px">
                <span>成交量</span>
                <span>${(item.value / 10000).toFixed(2)}万</span>
              </div>`;
                        }
                    });
                    return html;
                }
            },
            grid: [
                {
                    left: '10%',
                    right: '10%',
                    top: '8%',
                    height: '55%'
                },
                {
                    left: '10%',
                    right: '10%',
                    top: '70%',
                    height: '18%'
                }
            ],
            xAxis: [
                {
                    type: 'category',
                    data: times,
                    boundaryGap: false,
                    axisLine: { lineStyle: { color: '#e2e8f0' } },
                    axisTick: { show: false },
                    axisLabel: {
                        color: '#64748b',
                        fontSize: 10,
                        formatter: (value: string) => {
                            // 只显示关键时间点
                            if (value === '09:30' || value === '10:30' || value === '11:30' ||
                                value === '13:00' || value === '14:00' || value === '15:00') {
                                return value;
                            }
                            return '';
                        }
                    },
                    splitLine: {
                        show: true,
                        lineStyle: { color: '#f1f5f9', type: 'dashed' }
                    }
                },
                {
                    type: 'category',
                    gridIndex: 1,
                    data: times,
                    boundaryGap: false,
                    axisLine: { lineStyle: { color: '#e2e8f0' } },
                    axisTick: { show: false },
                    axisLabel: { show: false },
                    splitLine: { show: false }
                }
            ],
            yAxis: [
                {
                    type: 'value',
                    min: minPrice - padding,
                    max: maxPrice + padding,
                    position: 'left',
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: '#64748b',
                        fontSize: 10,
                        formatter: (value: number) => value.toFixed(2)
                    },
                    splitLine: {
                        lineStyle: { color: '#f1f5f9', type: 'dashed' }
                    }
                },
                {
                    type: 'value',
                    min: -maxChangePct - 0.5,
                    max: maxChangePct + 0.5,
                    position: 'right',
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: {
                        color: '#64748b',
                        fontSize: 10,
                        formatter: (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
                    },
                    splitLine: { show: false }
                },
                {
                    type: 'value',
                    gridIndex: 1,
                    splitNumber: 2,
                    axisLine: { show: false },
                    axisTick: { show: false },
                    axisLabel: { show: false },
                    splitLine: { show: false }
                }
            ],
            series: [
                {
                    name: '价格',
                    type: 'line',
                    data: prices,
                    symbol: 'none',
                    lineStyle: {
                        width: 1.5,
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: '#3b82f6' },
                            { offset: 1, color: '#3b82f6' }
                        ])
                    },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(59, 130, 246, 0.15)' },
                            { offset: 1, color: 'rgba(59, 130, 246, 0.02)' }
                        ])
                    },
                    markLine: {
                        silent: true,
                        symbol: 'none',
                        lineStyle: {
                            color: '#94a3b8',
                            type: 'dashed',
                            width: 1
                        },
                        data: [
                            {
                                yAxis: preClose,
                                label: {
                                    show: true,
                                    position: 'insideEndTop',
                                    formatter: `昨收 ${preClose.toFixed(2)}`,
                                    color: '#64748b',
                                    fontSize: 10
                                }
                            }
                        ]
                    }
                },
                {
                    name: '均价',
                    type: 'line',
                    data: avgPrices,
                    symbol: 'none',
                    lineStyle: {
                        width: 1,
                        color: '#f59e0b',
                        type: 'dashed'
                    }
                },
                {
                    name: '成交量',
                    type: 'bar',
                    xAxisIndex: 1,
                    yAxisIndex: 2,
                    data: volumes.map((vol, idx) => ({
                        value: vol,
                        itemStyle: {
                            color: prices[idx] >= preClose ? 'rgba(220, 38, 38, 0.6)' : 'rgba(22, 163, 74, 0.6)'
                        }
                    })),
                    barWidth: '60%'
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
    }, [data, preClose]);

    return (
        <div className={cn('flex flex-col', className)}>
            <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-slate-700" />
                <span className="text-sm font-medium text-slate-900">分时图</span>
                <div className="flex items-center gap-4 ml-4 text-xs">
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-0.5 bg-blue-500"></span>
                        <span className="text-slate-600">价格</span>
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-3 h-0.5 bg-amber-500" style={{ borderStyle: 'dashed' }}></span>
                        <span className="text-slate-600">均价</span>
                    </span>
                </div>
            </div>
            {data.length > 0 ? (
                <div
                    ref={chartContainerRef}
                    className="flex-1 min-h-[300px] rounded-lg bg-slate-50"
                />
            ) : (
                <div className="flex-1 min-h-[300px] rounded-lg bg-slate-50 flex items-center justify-center text-slate-500">
                    暂无分时数据
                </div>
            )}
        </div>
    );
}

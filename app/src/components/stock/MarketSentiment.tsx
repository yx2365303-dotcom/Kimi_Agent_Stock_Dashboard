import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Gauge } from 'lucide-react';
import type { MarketSentiment as MarketSentimentType } from '@/types';

interface MarketSentimentProps {
  data: MarketSentimentType;
  className?: string;
}

export function MarketSentimentCard({ data, className }: MarketSentimentProps) {
  const getSentimentColor = (score: number) => {
    if (score >= 80) return 'text-purple-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    if (score >= 20) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">市场情绪</h3>
        <Gauge className="w-5 h-5 text-slate-500" />
      </div>

      <div className="flex items-center justify-center mb-4">
        <div className="relative w-32 h-32">
          {/* 仪表盘背景 */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray="188.5 251.3"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(data.overall / 100) * 188.5} 251.3`}
              className={getSentimentColor(data.overall)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-2xl font-bold font-mono', getSentimentColor(data.overall))}>
              {data.overall}
            </span>
            <span className="text-xs text-slate-500">{data.label}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">涨跌比</span>
          <span className="text-sm font-mono text-slate-900">{data.up_down_ratio.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">平均涨跌幅</span>
          <span className={cn('text-sm font-mono', data.avg_change > 0 ? 'text-red-600' : 'text-green-600')}>
            {data.avg_change > 0 ? '+' : ''}{data.avg_change.toFixed(2)}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">涨停成功率</span>
          <span className="text-sm font-mono text-slate-900">{data.limit_up_success_rate.toFixed(1)}%</span>
        </div>
      </div>
    </Card>
  );
}

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';
import type { LimitUpData } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LimitUpStatsProps {
  limitUpList: LimitUpData[];
  limitUpCount: number;
  limitDownCount: number;
  brokenCount: number;
  maxLimitCount: number;
  className?: string;
}

export function LimitUpStats({ 
  limitUpList, 
  limitUpCount, 
  limitDownCount, 
  brokenCount, 
  maxLimitCount,
  className 
}: LimitUpStatsProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">涨跌停统计</h3>
        <div className="flex items-center gap-1">
          <Zap className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-slate-500">连板高度:</span>
          <span className="text-lg font-bold text-yellow-600 font-mono">{maxLimitCount}板</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-red-600" />
            <span className="text-xs text-slate-500">涨停</span>
          </div>
          <div className="text-xl font-bold text-red-600 font-mono">{limitUpCount}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingDown className="w-4 h-4 text-green-600" />
            <span className="text-xs text-slate-500">跌停</span>
          </div>
          <div className="text-xl font-bold text-green-600 font-mono">{limitDownCount}</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Zap className="w-4 h-4 text-yellow-600" />
            <span className="text-xs text-slate-500">炸板</span>
          </div>
          <div className="text-xl font-bold text-yellow-600 font-mono">{brokenCount}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-500 px-2">
          <span>股票名称</span>
          <span>涨停时间</span>
          <span>连板</span>
        </div>
        <ScrollArea className="h-48">
          <div className="space-y-1">
            {limitUpList.map((stock) => (
              <div 
                key={stock.ts_code}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{stock.name}</span>
                  <span className="text-xs text-slate-500">{stock.ts_code}</span>
                  {stock.tag && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                      {stock.tag}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500 font-mono">{stock.first_time}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{stock.limit_times}板</span>
                  {stock.open_times > 0 && (
                    <span className="text-xs text-yellow-600">炸{stock.open_times}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}

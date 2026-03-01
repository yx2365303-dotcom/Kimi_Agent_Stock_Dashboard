import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { cn, formatNumber, formatPercent, getChangeColor, getChangeBgColor } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { IndexData } from '@/types';

interface IndexCardProps {
  data: IndexData;
  className?: string;
  onClick?: () => void;
}

// 格式化成交量（手 -> 亿手/万手）
function formatVolume(vol: number): string {
  if (vol >= 100000000) {
    return (vol / 100000000).toFixed(2) + '亿';
  } else if (vol >= 10000) {
    return (vol / 10000).toFixed(2) + '万';
  }
  return vol.toFixed(0);
}

export const IndexCard = memo(function IndexCard({ data, className, onClick }: IndexCardProps) {
  const isUp = data.pct_change > 0;
  const isDown = data.pct_change < 0;
  const isFlat = data.pct_change === 0;

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-border',
        getChangeBgColor(data.pct_change),
        className
      )}
      onClick={onClick}
    >
      {/* 标题行 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{data.name}</span>
        {isUp && <TrendingUp className="w-4 h-4 text-stock-up" />}
        {isDown && <TrendingDown className="w-4 h-4 text-stock-down" />}
        {isFlat && <Minus className="w-4 h-4 text-stock-flat" />}
      </div>
      
      {/* 当前价格 */}
      <div className={cn('text-2xl font-bold font-mono', getChangeColor(data.pct_change))}>
        {formatNumber(data.current)}
      </div>
      
      {/* 涨跌额和涨跌幅 */}
      <div className="flex items-center gap-2 mt-1">
        <span className={cn('text-sm font-mono', getChangeColor(data.pct_change))}>
          {data.change > 0 ? '+' : ''}{formatNumber(data.change)}
        </span>
        <span className={cn('text-sm font-mono', getChangeColor(data.pct_change))}>
          {formatPercent(data.pct_change)}
        </span>
      </div>
      
      {/* 详细数据网格 */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {/* 第一行：成交额 & 成交量 */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">成交</span>
            <span className="text-foreground font-mono">{(data.amount / 100000).toFixed(0)}亿</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">量</span>
            <span className="text-foreground font-mono">{formatVolume(data.volume)}</span>
          </div>
          
          {/* 第二行：最高 & 最低 */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">最高</span>
            <span className="text-stock-up font-mono">{formatNumber(data.high)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">最低</span>
            <span className="text-stock-down font-mono">{formatNumber(data.low)}</span>
          </div>
          
          {/* 第三行：开盘 & 昨收 */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">开盘</span>
            <span className={cn('font-mono', data.open >= data.pre_close ? 'text-stock-up' : 'text-stock-down')}>
              {formatNumber(data.open)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">昨收</span>
            <span className="text-foreground font-mono">
              {formatNumber(data.pre_close)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
});
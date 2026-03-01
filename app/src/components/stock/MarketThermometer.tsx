import { memo } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketThermometerProps {
    upCount: number;
    downCount: number;
    flatCount: number;
    limitUp: number;
    limitDown: number;
    upRatio: number;       // 0-100
    className?: string;
}

export const MarketThermometer = memo(function MarketThermometer({
    upCount,
    downCount,
    flatCount,
    limitUp,
    limitDown,
    upRatio,
    className
}: MarketThermometerProps) {
    const total = upCount + downCount + flatCount;
    const upPercent = total > 0 ? (upCount / total) * 100 : 50;
    const downPercent = total > 0 ? (downCount / total) * 100 : 50;

    return (
        <div className={cn('p-4', className)}>
            {/* 标题 */}
            <div className="text-sm font-medium text-muted-foreground mb-3">市场温度</div>

            {/* 涨跌对比条 */}
            <div className="relative h-8 rounded-full overflow-hidden bg-muted mb-3">
                <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
                    style={{ width: `${upPercent}%` }}
                />
                <div
                    className="absolute right-0 top-0 h-full bg-gradient-to-l from-green-500 to-green-400 transition-all duration-500"
                    style={{ width: `${downPercent}%` }}
                />
                {/* 中间分隔 */}
                <div
                    className="absolute top-0 h-full w-1 bg-background shadow-sm transition-all duration-500"
                    style={{ left: `calc(${upPercent}% - 2px)` }}
                />
                {/* 数值标签 */}
                <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="text-xs font-bold text-white drop-shadow-sm">{upCount}</span>
                    <span className="text-xs font-bold text-white drop-shadow-sm">{downCount}</span>
                </div>
            </div>

            {/* 涨跌比 */}
            <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">涨跌比</span>
                <span className={cn(
                    'text-lg font-bold font-mono',
                    upRatio > 50 ? 'text-red-500' : upRatio < 50 ? 'text-green-500' : 'text-muted-foreground'
                )}>
                    {upRatio}%
                </span>
                {upRatio > 50 ? (
                    <TrendingUp className="w-4 h-4 text-red-500" />
                ) : upRatio < 50 ? (
                    <TrendingDown className="w-4 h-4 text-green-500" />
                ) : null}
            </div>

            {/* 涨停/跌停/平盘统计 */}
            <div className="grid grid-cols-3 gap-2">
                {/* 涨停 */}
                <div className="flex flex-col items-center p-2 rounded-lg bg-red-50">
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span className="text-xs text-muted-foreground">涨停</span>
                    </div>
                    <span className="text-lg font-bold text-red-500 font-mono">{limitUp}</span>
                </div>

                {/* 平盘 */}
                <div className="flex flex-col items-center p-2 rounded-lg bg-muted">
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground"></span>
                        <span className="text-xs text-muted-foreground">平盘</span>
                    </div>
                    <span className="text-lg font-bold text-muted-foreground font-mono">{flatCount}</span>
                </div>

                {/* 跌停 */}
                <div className="flex flex-col items-center p-2 rounded-lg bg-green-50">
                    <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-xs text-muted-foreground">跌停</span>
                    </div>
                    <span className="text-lg font-bold text-green-500 font-mono">{limitDown}</span>
                </div>
            </div>
        </div>
    );
});
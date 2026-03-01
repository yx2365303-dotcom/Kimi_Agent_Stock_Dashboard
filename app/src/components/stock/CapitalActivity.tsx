import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Wallet, TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface CapitalActivityProps {
    totalAmount: number;      // 成交额（亿）
    amountChange: number;     // 较昨日变化%
    avgTurnover: number;      // 平均换手率
    northFlow: number;        // 北向净流入（亿）
    className?: string;
}

export const CapitalActivity = memo(function CapitalActivity({
    totalAmount,
    amountChange,
    avgTurnover,
    northFlow,
    className
}: CapitalActivityProps) {
    const formatAmount = (value: number) => {
        if (Math.abs(value) >= 10000) {
            return (value / 10000).toFixed(2) + '万亿';
        }
        return value.toFixed(0) + '亿';
    };

    return (
        <div className={cn('p-4', className)}>
            {/* 标题 */}
            <div className="text-sm font-medium text-muted-foreground mb-3">资金活跃度</div>

            {/* 主要指标 */}
            <div className="space-y-3">
                {/* 成交额 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">两市成交</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-base font-bold font-mono text-foreground">
                            {formatAmount(totalAmount)}
                        </span>
                        {amountChange !== 0 && (
                            <span className={cn(
                                'flex items-center text-xs font-mono',
                                amountChange > 0 ? 'text-red-500' : 'text-green-500'
                            )}>
                                {amountChange > 0 ? (
                                    <ArrowUpRight className="w-3 h-3" />
                                ) : (
                                    <ArrowDownRight className="w-3 h-3" />
                                )}
                                {Math.abs(amountChange).toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>

                {/* 北向资金 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            northFlow >= 0 ? 'bg-red-500/10' : 'bg-green-500/10'
                        )}>
                            {northFlow >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-red-500" />
                            ) : (
                                <TrendingDown className="w-4 h-4 text-green-500" />
                            )}
                        </div>
                        <span className="text-sm text-muted-foreground">北向资金</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className={cn(
                            'text-base font-bold font-mono',
                            northFlow >= 0 ? 'text-red-500' : 'text-green-500'
                        )}>
                            {northFlow >= 0 ? '+' : ''}{northFlow.toFixed(2)}亿
                        </span>
                    </div>
                </div>

                {/* 换手率 */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted hover:bg-muted transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-purple-500" />
                        </div>
                        <span className="text-sm text-muted-foreground">平均换手</span>
                    </div>
                    <span className="text-base font-bold font-mono text-foreground">
                        {avgTurnover.toFixed(2)}%
                    </span>
                </div>
            </div>
        </div>
    );
});
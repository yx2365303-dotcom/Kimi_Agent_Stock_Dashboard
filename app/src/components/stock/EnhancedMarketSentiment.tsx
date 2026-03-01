import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SentimentGauge } from './SentimentGauge';
import { MarketThermometer } from './MarketThermometer';
import { CapitalActivity } from './CapitalActivity';
import { LimitBoardStats } from './LimitBoardStats';
import type { EnhancedSentimentData } from '@/services/marketService';

interface EnhancedMarketSentimentProps {
    data: EnhancedSentimentData | null;
    loading?: boolean;
    className?: string;
}

/**
 * 增强版市场情绪面板
 * 整合四个子模块：情绪仪表盘、市场温度计、资金活跃度、连板统计
 */
export const EnhancedMarketSentiment = memo(function EnhancedMarketSentiment({ data, loading, className }: EnhancedMarketSentimentProps) {
    if (loading) {
        return (
            <Card className={cn('p-4', className)}>
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-48" />
                    <Skeleton className="h-48" />
                    <Skeleton className="h-40" />
                    <Skeleton className="h-40" />
                </div>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card className={cn('p-6', className)}>
                <div className="text-center text-muted-foreground py-8">
                    暂无市场情绪数据
                </div>
            </Card>
        );
    }

    return (
        <Card className={cn('p-2 overflow-hidden', className)}>
            {/* 2x2 网格布局 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {/* 情绪仪表盘 */}
                <div className="bg-gradient-to-br from-muted to-white rounded-xl border border-border">
                    <SentimentGauge
                        score={data.sentiment.score}
                        label={data.sentiment.label}
                        trend={data.sentiment.trend}
                    />
                </div>

                {/* 市场温度计 */}
                <div className="bg-gradient-to-br from-muted to-white rounded-xl border border-border">
                    <MarketThermometer
                        upCount={data.thermometer.upCount}
                        downCount={data.thermometer.downCount}
                        flatCount={data.thermometer.flatCount}
                        limitUp={data.thermometer.limitUp}
                        limitDown={data.thermometer.limitDown}
                        upRatio={data.thermometer.upRatio}
                    />
                </div>

                {/* 资金活跃度 */}
                <div className="bg-gradient-to-br from-muted to-white rounded-xl border border-border">
                    <CapitalActivity
                        totalAmount={data.capital.totalAmount}
                        amountChange={data.capital.amountChange}
                        avgTurnover={data.capital.avgTurnover}
                        northFlow={data.capital.northFlow}
                    />
                </div>

                {/* 连板统计 */}
                <div className="bg-gradient-to-br from-muted to-white rounded-xl border border-border">
                    <LimitBoardStats
                        lianbanStats={data.limitStats.lianbanStats}
                        zhabanCount={data.limitStats.zhabanCount}
                        fengbanRate={data.limitStats.fengbanRate}
                        maxLianban={data.limitStats.maxLianban}
                        topIndustries={data.limitStats.topIndustries}
                    />
                </div>
            </div>
        </Card>
    );
});
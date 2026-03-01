import { memo } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SentimentGaugeProps {
    score: number;          // 0-100
    label: string;          // 情绪标签
    trend: 'up' | 'down' | 'flat';
    className?: string;
}

export const SentimentGauge = memo(function SentimentGauge({ score, label, trend, className }: SentimentGaugeProps) {
    // 根据分数获取颜色
    const getScoreColor = (s: number) => {
        if (s >= 80) return { main: '#22c55e', bg: 'bg-green-500/10', text: 'text-green-500' };
        if (s >= 65) return { main: '#84cc16', bg: 'bg-lime-500/10', text: 'text-lime-500' };
        if (s >= 55) return { main: '#eab308', bg: 'bg-yellow-500/10', text: 'text-yellow-500' };
        if (s >= 45) return { main: '#f97316', bg: 'bg-orange-500/10', text: 'text-orange-500' };
        if (s >= 35) return { main: '#ef4444', bg: 'bg-red-500/10', text: 'text-red-500' };
        return { main: '#dc2626', bg: 'bg-red-600/10', text: 'text-red-600' };
    };

    const colors = getScoreColor(score);

    // 计算仪表盘弧度 (0-100 映射到 0-270度)
    const angle = (score / 100) * 270;
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = (angle / 360) * circumference;

    return (
        <div className={cn('flex flex-col items-center p-4', className)}>
            {/* 标题 */}
            <div className="text-sm font-medium text-muted-foreground mb-2">市场情绪</div>

            {/* 仪表盘 */}
            <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-[135deg]" viewBox="0 0 100 100">
                    {/* 背景弧 */}
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke="#e2e8f0"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(270 / 360) * circumference} ${circumference}`}
                    />
                    {/* 渐变定义 */}
                    <defs>
                        <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#dc2626" />
                            <stop offset="25%" stopColor="#ef4444" />
                            <stop offset="50%" stopColor="#eab308" />
                            <stop offset="75%" stopColor="#84cc16" />
                            <stop offset="100%" stopColor="#22c55e" />
                        </linearGradient>
                    </defs>
                    {/* 进度弧 */}
                    <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke={colors.main}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${strokeDasharray} ${circumference}`}
                        className="transition-all duration-700 ease-out"
                    />
                </svg>

                {/* 中心数值 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span
                        className="text-3xl font-bold font-mono transition-colors duration-300"
                        style={{ color: colors.main }}
                    >
                        {score}
                    </span>
                    <span className={cn('text-xs font-medium', colors.text)}>{label}</span>
                </div>
            </div>

            {/* 趋势指示 */}
            <div className="flex items-center gap-1 mt-2">
                {trend === 'up' && (
                    <>
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-green-500">情绪上升</span>
                    </>
                )}
                {trend === 'down' && (
                    <>
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className="text-xs text-red-500">情绪下降</span>
                    </>
                )}
                {trend === 'flat' && (
                    <>
                        <Minus className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">情绪持平</span>
                    </>
                )}
            </div>

            {/* 刻度标签 */}
            <div className="flex justify-between w-full mt-3 px-2">
                <span className="text-[10px] text-red-500">恐惧</span>
                <span className="text-[10px] text-muted-foreground">中性</span>
                <span className="text-[10px] text-green-500">贪婪</span>
            </div>
        </div>
    );
});
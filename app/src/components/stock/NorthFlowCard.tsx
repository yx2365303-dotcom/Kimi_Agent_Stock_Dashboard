import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface NorthFlowData {
  net_inflow: number;
  sh_inflow: number;
  sz_inflow: number;
  cumulative_30d: number;
  time_series: { date: string; amount: number }[];
}

interface NorthFlowCardProps {
  data: NorthFlowData;
  className?: string;
}

export function NorthFlowCard({ data, className }: NorthFlowCardProps) {
  const isPositive = data.net_inflow > 0;
  
  // 计算5日累计（取最近5天的数据）
  const recent5Days = data.time_series.slice(-5);
  const cumulative5d = recent5Days.reduce((sum, item) => sum + item.amount, 0);
  
  // 计算昨日数据用于对比
  const yesterdayAmount = data.time_series.length >= 2 
    ? data.time_series[data.time_series.length - 2].amount 
    : 0;
  const dayChange = data.net_inflow - yesterdayAmount;
  
  // 获取近10日数据用于趋势图
  const chartData = data.time_series.slice(-10);
  
  return (
    <Card className={cn('p-4 border-slate-200', className)}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-900">北向资金</h3>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-slate-600">今日:</span>
          <span className={cn(
            'font-mono font-medium',
            isPositive ? 'text-red-600' : 'text-green-600'
          )}>
            {isPositive ? '+' : ''}{data.net_inflow.toFixed(2)}亿
          </span>
        </div>
      </div>
      
      {/* 主数字区域 */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 mb-3">
        <div className="text-center mb-2">
          <div className={cn(
            'text-3xl font-bold font-mono',
            isPositive ? 'text-red-600' : 'text-green-600'
          )}>
            {isPositive ? '+' : ''}{data.net_inflow.toFixed(2)}亿
          </div>
          <div className="flex items-center justify-center gap-2 mt-1 text-sm text-slate-600">
            {dayChange !== 0 && (
              <span className={cn(
                'flex items-center gap-0.5',
                dayChange > 0 ? 'text-red-500' : 'text-green-500'
              )}>
                {dayChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                较昨日 {dayChange > 0 ? '+' : ''}{dayChange.toFixed(2)}亿
              </span>
            )}
          </div>
        </div>
        
        {/* 沪股通 / 深股通 分流 */}
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200">
          <div className="text-center">
            <div className="text-xs text-slate-600 mb-1">沪股通</div>
            <div className={cn(
              'text-base font-mono font-semibold',
              data.sh_inflow > 0 ? 'text-red-600' : 'text-green-600'
            )}>
              {data.sh_inflow > 0 ? '+' : ''}{data.sh_inflow.toFixed(2)}亿
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-600 mb-1">深股通</div>
            <div className={cn(
              'text-base font-mono font-semibold',
              data.sz_inflow > 0 ? 'text-red-600' : 'text-green-600'
            )}>
              {data.sz_inflow > 0 ? '+' : ''}{data.sz_inflow.toFixed(2)}亿
            </div>
          </div>
        </div>
      </div>
      
      {/* 迷你趋势图 */}
      {chartData.length > 0 && (
        <div className="h-20 mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 5 }}>
              <defs>
                <linearGradient id="northFlowGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? '#ef4444' : '#22c55e'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isPositive ? '#ef4444' : '#22c55e'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => [`${value.toFixed(2)}亿`, '净流入']}
                labelFormatter={(label) => `日期: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke={isPositive ? '#ef4444' : '#22c55e'}
                strokeWidth={2}
                fill="url(#northFlowGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* 累计数据 */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-600">5日累计</span>
          <span className={cn(
            'text-sm font-mono font-medium',
            cumulative5d > 0 ? 'text-red-600' : 'text-green-600'
          )}>
            {cumulative5d > 0 ? '+' : ''}{cumulative5d.toFixed(2)}亿
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-600">30日累计</span>
          <span className={cn(
            'text-sm font-mono font-medium',
            data.cumulative_30d > 0 ? 'text-red-600' : 'text-green-600'
          )}>
            {data.cumulative_30d > 0 ? '+' : ''}{data.cumulative_30d.toFixed(0)}亿
          </span>
        </div>
      </div>
    </Card>
  );
}

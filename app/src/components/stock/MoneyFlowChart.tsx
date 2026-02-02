import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MoneyFlowChartProps {
  data: {
    net_inflow: number;
    sh_inflow: number;
    sz_inflow: number;
    cumulative_30d: number;
    time_series: { date: string; amount: number }[];
  };
  className?: string;
}

export function MoneyFlowChart({ data, className }: MoneyFlowChartProps) {
  const isPositive = data.net_inflow > 0;

  return (
    <Card className={cn('p-4 border-slate-200', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">北向资金流向</h3>
        <div className="flex items-center gap-2">
          {isPositive ? (
            <TrendingUp className="w-4 h-4 text-red-600" />
          ) : (
            <TrendingDown className="w-4 h-4 text-green-600" />
          )}
          <span className={cn('text-lg font-bold font-mono', isPositive ? 'text-red-600' : 'text-green-600')}>
            {isPositive ? '+' : ''}{data.net_inflow.toFixed(2)}亿
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
          <div className="text-xs text-slate-500">沪股通</div>
          <div className={cn('text-sm font-bold font-mono', data.sh_inflow > 0 ? 'text-red-600' : 'text-green-600')}>
            {data.sh_inflow > 0 ? '+' : ''}{data.sh_inflow.toFixed(2)}亿
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
          <div className="text-xs text-slate-500">深股通</div>
          <div className={cn('text-sm font-bold font-mono', data.sz_inflow > 0 ? 'text-red-600' : 'text-green-600')}>
            {data.sz_inflow > 0 ? '+' : ''}{data.sz_inflow.toFixed(2)}亿
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-100">
          <div className="text-xs text-slate-500">30日累计</div>
          <div className={cn('text-sm font-bold font-mono', data.cumulative_30d > 0 ? 'text-red-600' : 'text-green-600')}>
            {data.cumulative_30d > 0 ? '+' : ''}{data.cumulative_30d.toFixed(2)}亿
          </div>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.time_series} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: '#64748b' }}
              interval={4}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => value.toFixed(0)}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#1e293b'
              }}
              formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toFixed(2)}亿`, '净流入']}
            />
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorAmount)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

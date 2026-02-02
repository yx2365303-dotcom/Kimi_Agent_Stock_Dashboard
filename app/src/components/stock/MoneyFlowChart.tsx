import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MoneyFlowChartProps {
  data: {
    net_inflow: number;
    sh_inflow: number;
    sz_inflow: number;
    cumulative_30d: number;
    cumulative_week?: number;
    change_from_yesterday?: number;
    change_percent?: number;
    time_series: { date: string; amount: number; hgt?: number; sgt?: number }[];
  };
  className?: string;
}

export function MoneyFlowChart({ data, className }: MoneyFlowChartProps) {
  const isPositive = data.net_inflow > 0;
  const changeIsPositive = (data.change_from_yesterday || 0) > 0;

  return (
    <Card className={cn('p-4 border-slate-200 flex flex-col h-full', className)}>
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
          {data.change_percent !== undefined && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5',
              changeIsPositive ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
            )}>
              {changeIsPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(data.change_percent).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* 2x3 数据网格 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-slate-50 rounded-lg p-2.5 text-center border border-slate-100">
          <div className="text-xs text-slate-500 mb-1">沪股通</div>
          <div className={cn('text-sm font-bold font-mono', data.sh_inflow > 0 ? 'text-red-600' : 'text-green-600')}>
            {data.sh_inflow > 0 ? '+' : ''}{data.sh_inflow.toFixed(2)}亿
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 text-center border border-slate-100">
          <div className="text-xs text-slate-500 mb-1">深股通</div>
          <div className={cn('text-sm font-bold font-mono', data.sz_inflow > 0 ? 'text-red-600' : 'text-green-600')}>
            {data.sz_inflow > 0 ? '+' : ''}{data.sz_inflow.toFixed(2)}亿
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 text-center border border-slate-100">
          <div className="text-xs text-slate-500 mb-1">较昨日</div>
          <div className={cn('text-sm font-bold font-mono', changeIsPositive ? 'text-red-600' : 'text-green-600')}>
            {changeIsPositive ? '+' : ''}{(data.change_from_yesterday || 0).toFixed(2)}亿
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-2.5 text-center border border-blue-100">
          <div className="text-xs text-blue-600 mb-1">本周累计</div>
          <div className={cn('text-sm font-bold font-mono', (data.cumulative_week || 0) > 0 ? 'text-red-600' : 'text-green-600')}>
            {(data.cumulative_week || 0) > 0 ? '+' : ''}{(data.cumulative_week || 0).toFixed(2)}亿
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-2.5 text-center border border-blue-100">
          <div className="text-xs text-blue-600 mb-1">30日累计</div>
          <div className={cn('text-sm font-bold font-mono', data.cumulative_30d > 0 ? 'text-red-600' : 'text-green-600')}>
            {data.cumulative_30d > 0 ? '+' : ''}{data.cumulative_30d.toFixed(2)}亿
          </div>
        </div>
        <div className="bg-amber-50 rounded-lg p-2.5 text-center border border-amber-100">
          <div className="text-xs text-amber-600 mb-1">日均流入</div>
          <div className={cn('text-sm font-bold font-mono', (data.cumulative_30d / 30) > 0 ? 'text-red-600' : 'text-green-600')}>
            {(data.cumulative_30d / 30) > 0 ? '+' : ''}{(data.cumulative_30d / 30).toFixed(2)}亿
          </div>
        </div>
      </div>

      {/* 图表区域 - 自动填满剩余空间 */}
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.time_series} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: '#64748b' }}
              interval={3}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => value.toFixed(0)}
              domain={['auto', 'auto']}
            />
            <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#1e293b',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              formatter={(value: number, name: string) => {
                const label = name === 'amount' ? '净流入' : name === 'hgt' ? '沪股通' : '深股通';
                return [`${value > 0 ? '+' : ''}${value.toFixed(2)}亿`, label];
              }}
              labelFormatter={(label) => `日期: ${label}`}
            />
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorAmount)"
              dot={false}
              activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

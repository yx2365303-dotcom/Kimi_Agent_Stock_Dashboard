import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Flame, TrendingUp, Zap, TrendingDown } from 'lucide-react';

interface DistributionItem {
  range: string;
  count: number;
  type?: 'limit_up' | 'up' | 'flat' | 'down' | 'limit_down';
  color?: string;
}

interface LianbanStats {
  oneBoard: number;
  twoBoard: number;
  threeBoard: number;
  fourBoard: number;
  fivePlus: number;
}

interface IndustryItem {
  name: string;
  count: number;
}

interface UpDownDistributionProps {
  data: {
    up_count: number;
    down_count: number;
    flat_count: number;
    limit_up: number;
    limit_down: number;
    distribution: DistributionItem[];
    // 新增字段
    lianbanStats?: LianbanStats;
    zhabanCount?: number;
    fengbanRate?: number;
    topIndustries?: IndustryItem[];
    maxLianban?: number;
    totalAttempts?: number;
  };
  className?: string;
}

export function UpDownDistribution({ data, className }: UpDownDistributionProps) {
  const getBarColor = (item: DistributionItem, _index: number) => {
    // 优先使用数据中的 color 字段
    if (item.color) return item.color;
    
    // 如果有 type 字段则用 type 判断颜色
    switch (item.type) {
      case 'limit_up': return '#dc2626';
      case 'up': return '#ef4444';
      case 'flat': return '#94a3b8';
      case 'down': return '#16a34a';
      case 'limit_down': return '#22c55e';
      default: return '#94a3b8';
    }
  };

  // 连板数据
  const lianban = data.lianbanStats || { oneBoard: 0, twoBoard: 0, threeBoard: 0, fourBoard: 0, fivePlus: 0 };
  const maxBar = Math.max(lianban.oneBoard, lianban.twoBoard, lianban.threeBoard, lianban.fourBoard, lianban.fivePlus, 1);

  // 计算涨跌比例
  const total = (data.up_count || 0) + (data.down_count || 0) + (data.flat_count || 0);
  const upRatio = total > 0 ? ((data.up_count / total) * 100).toFixed(1) : '0';
  const downRatio = total > 0 ? ((data.down_count / total) * 100).toFixed(1) : '0';

  return (
    <Card className={cn('p-4 border-slate-200', className)}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-900">涨跌分布</h3>
        <div className="flex gap-2 text-xs">
          <div className="flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded">
            <TrendingUp className="w-3 h-3 text-red-600" />
            <span className="text-red-600 font-semibold">{data.up_count || 0}</span>
            <span className="text-red-400">({upRatio}%)</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
            <span className="text-slate-500">平</span>
            <span className="text-slate-600 font-semibold">{data.flat_count || 0}</span>
          </div>
          <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded">
            <TrendingDown className="w-3 h-3 text-green-600" />
            <span className="text-green-600 font-semibold">{data.down_count || 0}</span>
            <span className="text-green-400">({downRatio}%)</span>
          </div>
        </div>
      </div>

      {/* 涨停/跌停 主数据 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
          <div className="text-2xl font-bold text-red-600 font-mono">{data.limit_up}</div>
          <div className="text-xs text-slate-500 mt-0.5">涨停</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
          <div className="text-2xl font-bold text-green-600 font-mono">{data.limit_down}</div>
          <div className="text-xs text-slate-500 mt-0.5">跌停</div>
        </div>
      </div>

      {/* 连板分布 + 炸板统计 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* 连板分布 */}
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-medium text-slate-700">连板分布</span>
            {data.maxLianban && data.maxLianban > 0 && (
              <span className="text-xs text-red-500 ml-auto">最高{data.maxLianban}板</span>
            )}
          </div>
          <div className="space-y-1.5">
            {[
              { label: '一板', value: lianban.oneBoard },
              { label: '二板', value: lianban.twoBoard },
              { label: '三板', value: lianban.threeBoard },
              { label: '四板+', value: lianban.fourBoard + lianban.fivePlus },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-8">{item.label}</span>
                <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all"
                    style={{ width: `${(item.value / maxBar) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-slate-700 w-6 text-right">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 炸板统计 */}
        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-slate-700">封板统计</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">炸板数</span>
              <span className="text-sm font-mono font-semibold text-amber-600">{data.zhabanCount || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">封板率</span>
              <span className={cn(
                'text-sm font-mono font-semibold',
                (data.fengbanRate || 0) >= 80 ? 'text-red-500' : 
                (data.fengbanRate || 0) >= 60 ? 'text-amber-500' : 'text-green-500'
              )}>
                {(data.fengbanRate || 0).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">涨停/跌停比</span>
              <span className={cn(
                'text-sm font-mono font-semibold',
                data.limit_up > data.limit_down ? 'text-red-500' : 'text-green-500'
              )}>
                {data.limit_down > 0 ? (data.limit_up / data.limit_down).toFixed(1) : data.limit_up}:1
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 涨停行业TOP3 */}
      {data.topIndustries && data.topIndustries.length > 0 && (
        <div className="mb-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-2.5 border border-red-100">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Flame className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-medium text-slate-700">涨停行业TOP3</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.topIndustries.map((industry, index) => (
              <span 
                key={industry.name}
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  index === 0 ? 'bg-red-100 text-red-700' :
                  index === 1 ? 'bg-orange-100 text-orange-700' :
                  'bg-amber-100 text-amber-700'
                )}
              >
                {industry.name} ({industry.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 涨跌幅分布图 */}
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.distribution} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <XAxis 
              dataKey="range" 
              tick={{ fontSize: 9, fill: '#64748b' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={45}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ 
                backgroundColor: '#ffffff', 
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#1e293b'
              }}
              formatter={(value: number) => [value + '只', '数量']}
            />
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {data.distribution.map((item, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(item, index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

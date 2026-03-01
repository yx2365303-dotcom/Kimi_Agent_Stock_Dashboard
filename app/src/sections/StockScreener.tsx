import { useState } from 'react';
import { cn, formatNumber, getChangeColor } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Filter, 
  Search, 
  Save, 
  RotateCcw, 
  TrendingUp,
  BarChart3,
  DollarSign,
  Activity
} from 'lucide-react';

// 筛选条件类型
interface FilterCondition {
  id: string;
  name: string;
  type: 'market' | 'price' | 'change' | 'volume' | 'technical' | 'fundamental' | 'capital';
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

const filterConditions: FilterCondition[] = [
  {
    id: 'market',
    name: '市场',
    type: 'market',
    options: [
      { value: 'all', label: '全部' },
      { value: 'sh', label: '沪市' },
      { value: 'sz', label: '深市' },
      { value: 'cy', label: '创业板' },
      { value: 'kc', label: '科创板' },
      { value: 'bj', label: '北交所' },
    ],
  },
  {
    id: 'price',
    name: '价格区间',
    type: 'price',
    min: 0,
    max: 1000,
  },
  {
    id: 'change',
    name: '涨跌幅',
    type: 'change',
    min: -10,
    max: 10,
  },
  {
    id: 'volume',
    name: '成交量',
    type: 'volume',
    min: 0,
    max: 1000000,
  },
];

// 技术指标条件
const technicalConditions = [
  { id: 'macd_golden', name: 'MACD金叉', icon: Activity },
  { id: 'kdj_oversold', name: 'KDJ超卖', icon: TrendingUp },
  { id: 'ma_bull', name: '均线多头', icon: TrendingUp },
  { id: 'boll_break', name: '布林突破', icon: BarChart3 },
  { id: 'volume_burst', name: '放量上涨', icon: Activity },
  { id: 'break_high', name: '突破新高', icon: TrendingUp },
];

// 基本面条件
const fundamentalConditions = [
  { id: 'pe_low', name: 'PE<20', icon: DollarSign },
  { id: 'roe_high', name: 'ROE>15%', icon: BarChart3 },
  { id: 'growth', name: '净利润增长>20%', icon: TrendingUp },
  { id: 'low_debt', name: '负债率<50%', icon: Activity },
];

// 资金面条件
const capitalConditions = [
  { id: 'main_inflow', name: '主力净流入', icon: TrendingUp },
  { id: 'big_order', name: '大单占比>30%', icon: BarChart3 },
  { id: 'high_turnover', name: '换手率>5%', icon: Activity },
];

// 模拟选股结果
const mockResults = [
  { code: '000938.SZ', name: '中芯国际', price: 58.80, change: 10.01, marketCap: 4500, score: 92 },
  { code: '600756.SH', name: '浪潮信息', price: 35.20, change: 10.00, marketCap: 1200, score: 88 },
  { code: '002230.SZ', name: '科大讯飞', price: 52.80, change: 9.99, marketCap: 2500, score: 85 },
  { code: '300750.SZ', name: '宁德时代', price: 165.80, change: 9.98, marketCap: 8500, score: 82 },
  { code: '000858.SZ', name: '五粮液', price: 145.60, change: 9.97, marketCap: 5800, score: 78 },
];

export function StockScreener() {
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [marketFilter, setMarketFilter] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [changeRange, setChangeRange] = useState({ min: '', max: '' });
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<typeof mockResults>([]);

  const toggleFilter = (filterId: string) => {
    setSelectedFilters(prev => 
      prev.includes(filterId) 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  const handleSearch = () => {
    setIsSearching(true);
    // 模拟搜索
    setTimeout(() => {
      setResults(mockResults);
      setIsSearching(false);
    }, 1000);
  };

  const handleReset = () => {
    setSelectedFilters([]);
    setMarketFilter('all');
    setPriceRange({ min: '', max: '' });
    setChangeRange({ min: '', max: '' });
    setResults([]);
  };

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-foreground">智能选股</h2>
          <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-600 text-xs">开发中</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1 border-border text-muted-foreground hover:bg-muted">
            <Save className="w-4 h-4" />
            保存策略
          </Button>
        </div>
      </div>

      {/* 筛选条件 */}
      <Card className="p-4 bg-background border-border">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground">筛选条件</h3>
        </div>

        {/* 市场选择 */}
        <div className="mb-4">
          <div className="text-sm text-muted-foreground mb-2">市场</div>
          <div className="flex flex-wrap gap-2">
            {filterConditions[0].options?.map((option) => (
              <Button
                key={option.value}
                variant={marketFilter === option.value ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'text-xs',
                  marketFilter === option.value 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
                onClick={() => setMarketFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* 价格区间 */}
        <div className="mb-4">
          <div className="text-sm text-muted-foreground mb-2">价格区间</div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="最低价"
              value={priceRange.min}
              onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
              className="w-24 h-8 bg-background border-border text-foreground text-sm placeholder:text-muted-foreground"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="最高价"
              value={priceRange.max}
              onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
              className="w-24 h-8 bg-background border-border text-foreground text-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* 涨跌幅区间 */}
        <div className="mb-4">
          <div className="text-sm text-muted-foreground mb-2">涨跌幅</div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="最小%"
              value={changeRange.min}
              onChange={(e) => setChangeRange({ ...changeRange, min: e.target.value })}
              className="w-24 h-8 bg-background border-border text-foreground text-sm placeholder:text-muted-foreground"
            />
            <span className="text-muted-foreground">%</span>
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              placeholder="最大%"
              value={changeRange.max}
              onChange={(e) => setChangeRange({ ...changeRange, max: e.target.value })}
              className="w-24 h-8 bg-background border-border text-foreground text-sm placeholder:text-muted-foreground"
            />
            <span className="text-muted-foreground">%</span>
          </div>
        </div>

        {/* 技术指标 */}
        <div className="mb-4">
          <div className="text-sm text-muted-foreground mb-2">技术指标</div>
          <div className="flex flex-wrap gap-2">
            {technicalConditions.map((condition) => {
              const Icon = condition.icon;
              return (
                <Badge
                  key={condition.id}
                  variant={selectedFilters.includes(condition.id) ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer gap-1 py-1.5 px-2',
                    selectedFilters.includes(condition.id)
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                  onClick={() => toggleFilter(condition.id)}
                >
                  <Icon className="w-3 h-3" />
                  {condition.name}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* 基本面 */}
        <div className="mb-4">
          <div className="text-sm text-muted-foreground mb-2">基本面</div>
          <div className="flex flex-wrap gap-2">
            {fundamentalConditions.map((condition) => {
              const Icon = condition.icon;
              return (
                <Badge
                  key={condition.id}
                  variant={selectedFilters.includes(condition.id) ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer gap-1 py-1.5 px-2',
                    selectedFilters.includes(condition.id)
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                  onClick={() => toggleFilter(condition.id)}
                >
                  <Icon className="w-3 h-3" />
                  {condition.name}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* 资金面 */}
        <div className="mb-4">
          <div className="text-sm text-muted-foreground mb-2">资金面</div>
          <div className="flex flex-wrap gap-2">
            {capitalConditions.map((condition) => {
              const Icon = condition.icon;
              return (
                <Badge
                  key={condition.id}
                  variant={selectedFilters.includes(condition.id) ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer gap-1 py-1.5 px-2',
                    selectedFilters.includes(condition.id)
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'border-border text-muted-foreground hover:text-white hover:bg-secondary'
                  )}
                  onClick={() => toggleFilter(condition.id)}
                >
                  <Icon className="w-3 h-3" />
                  {condition.name}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={handleSearch}
            disabled={isSearching}
          >
            <Search className="w-4 h-4 mr-1" />
            {isSearching ? '搜索中...' : '开始选股'}
          </Button>
          <Button variant="outline" onClick={handleReset} className="border-border text-muted-foreground hover:bg-muted">
            <RotateCcw className="w-4 h-4 mr-1" />
            重置
          </Button>
        </div>
      </Card>

      {/* 选股结果 */}
      {results.length > 0 && (
        <Card className="p-4 bg-background border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              选股结果 <span className="text-sm text-muted-foreground">(共 {results.length} 只)</span>
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:bg-muted">按涨幅</Button>
              <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:bg-muted">按评分</Button>
            </div>
          </div>

          <ScrollArea className="h-80">
            <div className="space-y-1">
              {results.map((stock, index) => (
                <div
                  key={stock.code}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'w-6 h-6 flex items-center justify-center text-xs font-bold rounded',
                      index < 3 ? 'bg-yellow-100 text-yellow-700' : 'text-muted-foreground'
                    )}>
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium text-foreground">{stock.name}</div>
                      <div className="text-xs text-muted-foreground">{stock.code}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-foreground font-mono">{formatNumber(stock.price)}</div>
                    </div>
                    <div className={cn('text-right font-mono', getChangeColor(stock.change))}>
                      +{stock.change.toFixed(2)}%
                    </div>
                    <div className="text-right text-muted-foreground">
                      {(stock.marketCap / 100).toFixed(0)}亿
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold',
                        stock.score >= 90 ? 'bg-red-100 text-red-700' :
                        stock.score >= 80 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      )}>
                        {stock.score}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:bg-muted">
                      查看
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}

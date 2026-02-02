import { useState, useEffect, useCallback } from 'react';
import { cn, formatNumber, getChangeColor } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { fetchStockListWithQuotes, type StockQuoteItem } from '@/services/stockService';

// 格式化大数值
function formatLargeNumber(value: number): string {
  if (!value) return '-';
  // 成交额单位是千元，转换为亿
  if (value >= 100000) {
    return (value / 100000).toFixed(2) + '亿';
  }
  if (value >= 100) {
    return (value / 100).toFixed(2) + '万';
  }
  return value.toFixed(2);
}

// 格式化成交量
function formatVolume(vol: number): string {
  if (!vol) return '-';
  // vol 单位是手
  if (vol >= 10000) {
    return (vol / 10000).toFixed(2) + '万手';
  }
  return vol.toFixed(0) + '手';
}

// 格式化市值（万元转亿元）
function formatMarketCap(value: number): string {
  if (!value) return '-';
  if (value >= 10000) {
    return (value / 10000).toFixed(2) + '亿';
  }
  return value.toFixed(2) + '万';
}

type SortField = 'amount' | 'pct_chg' | 'turnover_rate' | 'total_mv';
type SortOrder = 'asc' | 'desc';

interface StockListTableProps {
  onSelectStock: (tsCode: string) => void;
}

export function StockListTable({ onSelectStock }: StockListTableProps) {
  const [stocks, setStocks] = useState<StockQuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<SortField>('amount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const pageSize = 50;
  const totalPages = Math.ceil(totalCount / pageSize);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, total } = await fetchStockListWithQuotes({
        keyword: keyword || undefined,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        sortBy,
        sortOrder
      });
      setStocks(data);
      setTotalCount(total);
    } catch (error) {
      console.error('加载股票列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [keyword, currentPage, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 搜索处理
  const handleSearch = () => {
    setKeyword(searchInput);
    setCurrentPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 排序处理
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // 排序图标
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-slate-400" />;
    }
    return sortOrder === 'desc' 
      ? <ArrowDown className="w-4 h-4 ml-1 text-blue-500" />
      : <ArrowUp className="w-4 h-4 ml-1 text-blue-500" />;
  };

  // 分页组件
  const Pagination = () => (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
      <div className="text-sm text-slate-600">
        共 <span className="font-medium text-slate-900">{totalCount.toLocaleString()}</span> 只股票，
        第 <span className="font-medium text-slate-900">{currentPage}</span> / {totalPages} 页
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        {/* 页码按钮 */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let page: number;
          if (totalPages <= 5) {
            page = i + 1;
          } else if (currentPage <= 3) {
            page = i + 1;
          } else if (currentPage >= totalPages - 2) {
            page = totalPages - 4 + i;
          } else {
            page = currentPage - 2 + i;
          }
          return (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentPage(page)}
              className="w-8"
            >
              {page}
            </Button>
          );
        })}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="overflow-hidden">
      {/* 搜索栏 */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="搜索股票代码或名称..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch}>搜索</Button>
          {keyword && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setSearchInput('');
                setKeyword('');
                setCurrentPage(1);
              }}
            >
              清除
            </Button>
          )}
        </div>
        {keyword && (
          <div className="mt-2 text-sm text-slate-600">
            搜索 "<span className="font-medium text-slate-900">{keyword}</span>" 的结果：{totalCount} 只股票
          </div>
        )}
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="w-28 font-semibold text-slate-700">代码</TableHead>
              <TableHead className="w-24 font-semibold text-slate-700">名称</TableHead>
              <TableHead className="w-24 text-right font-semibold text-slate-700">最新价</TableHead>
              <TableHead 
                className="w-24 text-right font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('pct_chg')}
              >
                <div className="flex items-center justify-end">
                  涨跌幅
                  <SortIcon field="pct_chg" />
                </div>
              </TableHead>
              <TableHead className="w-24 text-right font-semibold text-slate-700">涨跌额</TableHead>
              <TableHead className="w-24 text-right font-semibold text-slate-700">今开</TableHead>
              <TableHead className="w-24 text-right font-semibold text-slate-700">最高</TableHead>
              <TableHead className="w-24 text-right font-semibold text-slate-700">最低</TableHead>
              <TableHead className="w-28 text-right font-semibold text-slate-700">成交量</TableHead>
              <TableHead 
                className="w-28 text-right font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end">
                  成交额
                  <SortIcon field="amount" />
                </div>
              </TableHead>
              <TableHead 
                className="w-24 text-right font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('turnover_rate')}
              >
                <div className="flex items-center justify-end">
                  换手率
                  <SortIcon field="turnover_rate" />
                </div>
              </TableHead>
              <TableHead className="w-24 text-right font-semibold text-slate-700">市盈率</TableHead>
              <TableHead 
                className="w-28 text-right font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('total_mv')}
              >
                <div className="flex items-center justify-end">
                  总市值
                  <SortIcon field="total_mv" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              // 骨架屏
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : stocks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-10 text-slate-500">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              stocks.map((stock) => (
                <TableRow 
                  key={stock.ts_code}
                  className="cursor-pointer hover:bg-blue-50"
                  onClick={() => onSelectStock(stock.ts_code)}
                >
                  <TableCell className="font-mono text-slate-700">{stock.ts_code}</TableCell>
                  <TableCell className="font-medium text-slate-900">{stock.name}</TableCell>
                  <TableCell className={cn('text-right font-mono', getChangeColor(stock.pct_chg))}>
                    {formatNumber(stock.close)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono font-medium', getChangeColor(stock.pct_chg))}>
                    {stock.pct_chg > 0 ? '+' : ''}{stock.pct_chg.toFixed(2)}%
                  </TableCell>
                  <TableCell className={cn('text-right font-mono', getChangeColor(stock.change))}>
                    {stock.change > 0 ? '+' : ''}{formatNumber(stock.change)}
                  </TableCell>
                  <TableCell className={cn('text-right font-mono', getChangeColor(stock.open - stock.pre_close))}>
                    {formatNumber(stock.open)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-500">
                    {formatNumber(stock.high)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-green-500">
                    {formatNumber(stock.low)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-700">
                    {formatVolume(stock.vol)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-700">
                    {formatLargeNumber(stock.amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-700">
                    {stock.turnover_rate.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-700">
                    {stock.pe_ttm > 0 ? stock.pe_ttm.toFixed(2) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-slate-700">
                    {formatMarketCap(stock.total_mv)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {!loading && totalCount > 0 && <Pagination />}
    </Card>
  );
}

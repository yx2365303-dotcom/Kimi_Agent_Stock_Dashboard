import { useState } from 'react';
import useSWR from 'swr';
import { cn, formatNumber, getChangeColor, formatLargeNumber, formatVolumeHand, formatMarketCap } from '@/lib/utils';
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
import { fetchStockListWithQuotes, type StockQuoteItem } from '@/services/stockDetailService';

type SortField = 'amount' | 'pct_chg' | 'turnover_rate' | 'total_mv';
type SortOrder = 'asc' | 'desc';

interface StockListTableProps {
  onSelectStock: (tsCode: string) => void;
}

export function StockListTable({ onSelectStock }: StockListTableProps) {
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>('amount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  const pageSize = 50;
  const queryParams = {
    keyword: keyword || undefined,
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    sortBy,
    sortOrder
  } as const;

  const { data, isLoading } = useSWR(
    ['stock:list:quotes', queryParams],
    () => fetchStockListWithQuotes(queryParams),
    {
      dedupingInterval: 10_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
    }
  );

  const stocks = (data?.data || []) as StockQuoteItem[];
  const totalCount = data?.total || 0;
  const loading = isLoading && !data;
  const totalPages = Math.ceil(totalCount / pageSize);

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
  const renderSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-muted-foreground" />;
    }
    return sortOrder === 'desc' 
      ? <ArrowDown className="w-4 h-4 ml-1 text-blue-500" />
      : <ArrowUp className="w-4 h-4 ml-1 text-blue-500" />;
  };

  // 分页组件
  const renderPagination = () => (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <div className="text-sm text-muted-foreground">
        共 <span className="font-medium text-foreground">{totalCount.toLocaleString()}</span> 只股票，
        第 <span className="font-medium text-foreground">{currentPage}</span> / {totalPages} 页
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
      <div className="p-4 border-b border-border bg-muted">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
          <div className="mt-2 text-sm text-muted-foreground">
            搜索 "<span className="font-medium text-foreground">{keyword}</span>" 的结果：{totalCount} 只股票
          </div>
        )}
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead className="w-28 font-semibold text-muted-foreground">代码</TableHead>
              <TableHead className="w-24 font-semibold text-muted-foreground">名称</TableHead>
              <TableHead className="w-24 text-right font-semibold text-muted-foreground">最新价</TableHead>
              <TableHead 
                className="w-24 text-right font-semibold text-muted-foreground cursor-pointer hover:bg-muted"
                onClick={() => handleSort('pct_chg')}
              >
                <div className="flex items-center justify-end">
                  涨跌幅
                  {renderSortIcon('pct_chg')}
                </div>
              </TableHead>
              <TableHead className="w-24 text-right font-semibold text-muted-foreground">涨跌额</TableHead>
              <TableHead className="w-24 text-right font-semibold text-muted-foreground">今开</TableHead>
              <TableHead className="w-24 text-right font-semibold text-muted-foreground">最高</TableHead>
              <TableHead className="w-24 text-right font-semibold text-muted-foreground">最低</TableHead>
              <TableHead className="w-28 text-right font-semibold text-muted-foreground">成交量</TableHead>
              <TableHead 
                className="w-28 text-right font-semibold text-muted-foreground cursor-pointer hover:bg-muted"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end">
                  成交额
                  {renderSortIcon('amount')}
                </div>
              </TableHead>
              <TableHead 
                className="w-24 text-right font-semibold text-muted-foreground cursor-pointer hover:bg-muted"
                onClick={() => handleSort('turnover_rate')}
              >
                <div className="flex items-center justify-end">
                  换手率
                  {renderSortIcon('turnover_rate')}
                </div>
              </TableHead>
              <TableHead className="w-24 text-right font-semibold text-muted-foreground">市盈率</TableHead>
              <TableHead 
                className="w-28 text-right font-semibold text-muted-foreground cursor-pointer hover:bg-muted"
                onClick={() => handleSort('total_mv')}
              >
                <div className="flex items-center justify-end">
                  总市值
                  {renderSortIcon('total_mv')}
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
                <TableCell colSpan={13} className="text-center py-10 text-muted-foreground">
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
                  <TableCell className="font-mono text-muted-foreground">{stock.ts_code}</TableCell>
                  <TableCell className="font-medium text-foreground">{stock.name}</TableCell>
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
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatVolumeHand(stock.vol)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatLargeNumber(stock.amount)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {stock.turnover_rate.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {stock.pe_ttm > 0 ? stock.pe_ttm.toFixed(2) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatMarketCap(stock.total_mv)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {!loading && totalCount > 0 && renderPagination()}
    </Card>
  );
}

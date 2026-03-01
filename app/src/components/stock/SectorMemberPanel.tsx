import { memo, useState, useMemo } from 'react';
import useSWR from 'swr';
import { cn, formatNumber, getChangeColor, formatLargeNumber, formatVolumeHand, formatMarketCap } from '@/lib/utils';
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
} from 'lucide-react';
import { fetchSectorMembers } from '@/services/sectorService';
import type { SectorMemberResult } from '@/services/sectorService';

type SortField = 'pct_chg' | 'amount' | 'turnover_rate' | 'total_mv';
type SortOrder = 'asc' | 'desc';
type FilterTab = 'all' | 'up' | 'down' | 'flat';

interface SectorMemberPanelProps {
  sectorCode: string;
  sectorName: string;
  onClose: () => void;
  onSelectStock?: (tsCode: string) => void;
}

export const SectorMemberPanel = memo(function SectorMemberPanel({
  sectorCode,
  sectorName,
  onClose: _onClose,
  onSelectStock,
}: SectorMemberPanelProps) {
  const [sortBy, setSortBy] = useState<SortField>('pct_chg');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const { data, isLoading } = useSWR(
    sectorCode ? `sector:members:${sectorCode}` : null,
    () => fetchSectorMembers(sectorCode, sectorName),
    {
      dedupingInterval: 30_000,
      revalidateOnFocus: false,
      keepPreviousData: true,
    }
  );

  const result = data as SectorMemberResult | undefined;
  const stocks = result?.stocks || [];
  const isPartial = result?.dataSource === 'partial';
  const loading = isLoading && !data;

  // 统计
  const upCount = stocks.filter(s => s.pct_chg > 0).length;
  const downCount = stocks.filter(s => s.pct_chg < 0).length;
  const flatCount = stocks.filter(s => s.pct_chg === 0).length;

  // 按分类过滤 + 排序
  const sortedStocks = useMemo(() => {
    let filtered = [...stocks];
    if (filterTab === 'up') {
      filtered = filtered.filter(s => s.pct_chg > 0);
    } else if (filterTab === 'down') {
      filtered = filtered.filter(s => s.pct_chg < 0);
    } else if (filterTab === 'flat') {
      filtered = filtered.filter(s => s.pct_chg === 0);
    }
    filtered.sort((a, b) => {
      const va = a[sortBy];
      const vb = b[sortBy];
      return sortOrder === 'desc' ? vb - va : va - vb;
    });
    return filtered;
  }, [stocks, sortBy, sortOrder, filterTab]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-muted-foreground" />;
    }
    return sortOrder === 'desc'
      ? <ArrowDown className="w-3.5 h-3.5 ml-1 text-blue-500" />
      : <ArrowUp className="w-3.5 h-3.5 ml-1 text-blue-500" />;
  };

  const filterTabs: { key: FilterTab; label: string; count: number; icon: React.ReactNode; color: string; activeColor: string }[] = [
    { key: 'all', label: '全部', count: stocks.length, icon: <Users className="w-3.5 h-3.5" />, color: 'text-muted-foreground', activeColor: 'bg-blue-600 text-white' },
    { key: 'up', label: '上涨', count: upCount, icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'text-red-600', activeColor: 'bg-red-600 text-white' },
    { key: 'down', label: '下跌', count: downCount, icon: <TrendingDown className="w-3.5 h-3.5" />, color: 'text-green-600', activeColor: 'bg-green-600 text-white' },
    { key: 'flat', label: '平盘', count: flatCount, icon: <Minus className="w-3.5 h-3.5" />, color: 'text-muted-foreground', activeColor: 'bg-secondary text-white' },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 头部 — pr-10 为 Sheet 关闭按钮留出空间 */}
      <div className="flex items-center justify-between pl-4 pr-10 py-3 bg-muted border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          {isPartial ? <Zap className="w-5 h-5 text-amber-500" /> : <Users className="w-5 h-5 text-blue-600" />}
          <h3 className="text-base font-semibold text-foreground">
            {sectorName}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {isPartial ? '近期关联个股' : '成分股'}
            </span>
          </h3>
        </div>
        {!loading && (
          <div className="flex items-center gap-3 text-xs shrink-0">
            <span className="text-muted-foreground">共 <span className="font-medium">{stocks.length}</span> 只</span>
            <span className="text-red-500">↑ {upCount}</span>
            <span className="text-green-600">↓ {downCount}</span>
            <span className="text-muted-foreground">— {flatCount}</span>
          </div>
        )}
      </div>

      {/* 概念板块数据来源提示 */}
      {!loading && isPartial && stocks.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-xs border-b border-border">
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span>以下为近期涨跌停数据中关联到的个股，非完整成分股列表</span>
        </div>
      )}

      {/* 分类标签栏 */}
      {!loading && stocks.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-background border-b border-border shrink-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                filterTab === tab.key
                  ? tab.activeColor
                  : `bg-muted ${tab.color} hover:bg-border`
              )}
            >
              {tab.icon}
              {tab.label}
              <span className={cn(
                'ml-0.5 font-mono',
                filterTab === tab.key ? 'opacity-90' : 'opacity-70'
              )}>
                {tab.count}
              </span>
            </button>
          ))}

        </div>
      )}

      {/* 表格 - 填充剩余空间 */}
      <div className={cn(
        'flex-1 overflow-auto min-h-0 transition-opacity duration-200',
        isLoading && data ? 'opacity-50' : 'opacity-100'
      )}>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <TableHead className="w-[88px] font-semibold text-muted-foreground text-xs sticky top-0 bg-muted z-10">代码</TableHead>
                <TableHead className="w-[72px] font-semibold text-muted-foreground text-xs sticky top-0 bg-muted z-10">名称</TableHead>
                <TableHead className="w-[68px] text-right font-semibold text-muted-foreground text-xs sticky top-0 bg-muted z-10">最新价</TableHead>
                <TableHead
                  className="w-20 text-right font-semibold text-muted-foreground text-xs cursor-pointer hover:bg-muted sticky top-0 bg-muted z-10"
                  onClick={() => handleSort('pct_chg')}
                >
                  <div className="flex items-center justify-end">
                    涨跌幅{renderSortIcon('pct_chg')}
                  </div>
                </TableHead>
                <TableHead className="w-[68px] text-right font-semibold text-muted-foreground text-xs sticky top-0 bg-muted z-10">涨跌额</TableHead>
                <TableHead className="w-[80px] text-right font-semibold text-muted-foreground text-xs sticky top-0 bg-muted z-10">成交量</TableHead>
                <TableHead
                  className="w-24 text-right font-semibold text-muted-foreground text-xs cursor-pointer hover:bg-muted sticky top-0 bg-muted z-10"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end">
                    成交额{renderSortIcon('amount')}
                  </div>
                </TableHead>
                <TableHead
                  className="w-20 text-right font-semibold text-muted-foreground text-xs cursor-pointer hover:bg-muted sticky top-0 bg-muted z-10"
                  onClick={() => handleSort('turnover_rate')}
                >
                  <div className="flex items-center justify-end">
                    换手率{renderSortIcon('turnover_rate')}
                  </div>
                </TableHead>
                <TableHead className="w-[68px] text-right font-semibold text-muted-foreground text-xs sticky top-0 bg-muted z-10">市盈率</TableHead>
                <TableHead
                  className="w-24 text-right font-semibold text-muted-foreground text-xs cursor-pointer hover:bg-muted sticky top-0 bg-muted z-10"
                  onClick={() => handleSort('total_mv')}
                >
                  <div className="flex items-center justify-end">
                    总市值{renderSortIcon('total_mv')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : sortedStocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    {filterTab === 'up' ? '暂无上涨个股' : filterTab === 'down' ? '暂无下跌个股' : filterTab === 'flat' ? '暂无平盘个股'
                      : isPartial ? '近期涨跌停数据中暂未找到该概念的关联个股' : '暂无成分股数据'}
                  </TableCell>
                </TableRow>
              ) : (
                sortedStocks.map((stock) => (
                  <TableRow
                    key={stock.ts_code}
                    className={cn(
                      'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors',
                      onSelectStock && 'active:bg-blue-100 dark:active:bg-blue-900/30'
                    )}
                    onClick={() => onSelectStock?.(stock.ts_code)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {stock.ts_code}
                    </TableCell>
                    <TableCell className="font-medium text-xs text-foreground">
                      {stock.name}
                    </TableCell>
                    <TableCell className={cn('text-right font-mono text-xs', getChangeColor(stock.pct_chg))}>
                      {formatNumber(stock.close)}
                    </TableCell>
                    <TableCell className={cn('text-right font-mono text-xs font-medium', getChangeColor(stock.pct_chg))}>
                      {stock.pct_chg > 0 ? '+' : ''}{stock.pct_chg.toFixed(2)}%
                    </TableCell>
                    <TableCell className={cn('text-right font-mono text-xs', getChangeColor(stock.change))}>
                      {stock.change > 0 ? '+' : ''}{formatNumber(stock.change)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {formatVolumeHand(stock.vol)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {formatLargeNumber(stock.amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {stock.turnover_rate.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {stock.pe_ttm > 0 ? stock.pe_ttm.toFixed(2) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {formatMarketCap(stock.total_mv)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </div>

      {/* 底部统计 */}
      {!loading && sortedStocks.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted border-t border-border text-xs text-muted-foreground shrink-0">
          <span>
            {filterTab === 'all' ? '全部' : filterTab === 'up' ? '上涨' : filterTab === 'down' ? '下跌' : '平盘'}
            {' '}{sortedStocks.length} 只
          </span>
        </div>
      )}
    </div>
  );
});

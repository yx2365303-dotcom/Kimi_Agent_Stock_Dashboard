import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Trophy,
    TrendingUp,
    TrendingDown,
    Building2,
    X,
    RefreshCw,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Info,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import {
    fetchDragonTigerList,
    fetchDragonTigerDetail,
    type DragonTigerItem,
    type DragonTigerInst
} from '@/services/dragonTigerService';

// 筛选类型
type FilterType = 'all' | 'net_buy' | 'net_sell';

// 格式化金额（元 -> 亿/万）
function formatAmount(value: number | null | undefined): string {
    if (value === null || value === undefined) return '-';
    if (Math.abs(value) >= 100000000) {
        return (value / 100000000).toFixed(2) + '亿';
    } else if (Math.abs(value) >= 10000) {
        return (value / 10000).toFixed(0) + '万';
    }
    return value.toFixed(0);
}

// 格式化日期 YYYYMMDD -> YYYY-MM-DD
function formatDate(dateStr: string): string {
    if (dateStr.length === 8) {
        return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
    }
    return dateStr;
}

// 获取前/后交易日（简化版）
function getAdjacentDate(dateStr: string, direction: 'prev' | 'next'): string {
    if (dateStr.length !== 8) return dateStr;
    const year = parseInt(dateStr.slice(0, 4));
    const month = parseInt(dateStr.slice(4, 6)) - 1;
    const day = parseInt(dateStr.slice(6, 8));
    const date = new Date(year, month, day);
    date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    // 跳过周末
    while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + (direction === 'next' ? 1 : -1));
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
}

export function DragonTigerPage() {
    const [filter, setFilter] = useState<FilterType>('all');
    const [tradeDate, setTradeDate] = useState<string>('');

    // 详情弹窗状态
    const [selectedStock, setSelectedStock] = useState<DragonTigerItem | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailData, setDetailData] = useState<{ buyers: DragonTigerInst[]; sellers: DragonTigerInst[] }>({ buyers: [], sellers: [] });

    // 使用 SWR 管理龙虎榜数据（带缓存 + 去重 + 自动重验证）
    const swrKey = `dragon-tiger:${filter}:${tradeDate}`;
    const { data = [], isLoading: loading, isValidating: refreshing, mutate } = useSWR<DragonTigerItem[]>(
        swrKey,
        async () => {
            const result = await fetchDragonTigerList({
                tradeDate: tradeDate || undefined,
                filter,
                limit: 100
            });
            // 自动设置交易日期
            if (result.length > 0 && !tradeDate) {
                setTradeDate(result[0].trade_date);
            }
            return result;
        },
        {
            dedupingInterval: 15_000,
            revalidateOnFocus: false,
            keepPreviousData: true,
        }
    );

    // 加载机构明细
    const loadDetail = useCallback(async (item: DragonTigerItem) => {
        setSelectedStock(item);
        setDetailLoading(true);

        try {
            const result = await fetchDragonTigerDetail(item.ts_code, item.trade_date);
            setDetailData(result);
        } catch (error) {
            logger.error('加载机构明细失败:', error);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    // 切换日期
    const handleDateChange = (direction: 'prev' | 'next') => {
        if (!tradeDate) return;
        const newDate = getAdjacentDate(tradeDate, direction);
        setTradeDate(newDate);
    };

    // 统计数据
    const stats = {
        total: data.length,
        netBuy: data.filter(d => d.net_amount > 0).length,
        netSell: data.filter(d => d.net_amount < 0).length,
        totalNetBuy: data.filter(d => d.net_amount > 0).reduce((sum, d) => sum + d.net_amount, 0),
        totalNetSell: Math.abs(data.filter(d => d.net_amount < 0).reduce((sum, d) => sum + d.net_amount, 0)),
        totalBuy: data.reduce((sum, d) => sum + (d.l_buy || 0), 0),
        totalSell: data.reduce((sum, d) => sum + (d.l_sell || 0), 0)
    };

    return (
        <div className="space-y-4">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">龙虎榜</h1>
                        <p className="text-sm text-muted-foreground">每日交易异动股票及机构席位明细</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={() => mutate()}
                    disabled={refreshing}
                    className="gap-2"
                >
                    <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                    刷新
                </Button>
            </div>

            {/* 日期选择器与统计概览 */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* 日期选择 */}
                <Card className="p-4 border-border">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDateChange('prev')}
                            disabled={loading}
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="font-mono font-medium text-lg">
                                {tradeDate ? formatDate(tradeDate) : '加载中...'}
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDateChange('next')}
                            disabled={loading}
                        >
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                </Card>

                {/* 上榜股票数 */}
                <Card className="p-4 border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                            <div className="text-sm text-muted-foreground">上榜股票</div>
                        </div>
                    </div>
                </Card>

                {/* 净买入统计 */}
                <Card className="p-4 border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                            <ArrowUpRight className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-red-600">{stats.netBuy}</div>
                            <div className="text-sm text-muted-foreground">净买入 · {formatAmount(stats.totalNetBuy)}</div>
                        </div>
                    </div>
                </Card>

                {/* 净卖出统计 */}
                <Card className="p-4 border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <ArrowDownRight className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-600">{stats.netSell}</div>
                            <div className="text-sm text-muted-foreground">净卖出 · {formatAmount(stats.totalNetSell)}</div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* 筛选按钮 */}
            <Card className="p-4 border-border">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">筛选:</span>
                    <div className="flex gap-2">
                        <Badge
                            className={cn(
                                'cursor-pointer transition-colors px-3 py-1',
                                filter === 'all' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-border text-muted-foreground hover:bg-muted'
                            )}
                            onClick={() => setFilter('all')}
                        >
                            全部 ({stats.total})
                        </Badge>
                        <Badge
                            className={cn(
                                'cursor-pointer transition-colors px-3 py-1',
                                filter === 'net_buy' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-100 text-red-700 hover:bg-red-200'
                            )}
                            onClick={() => setFilter('net_buy')}
                        >
                            <TrendingUp className="w-3 h-3 mr-1" />
                            净买入 ({stats.netBuy})
                        </Badge>
                        <Badge
                            className={cn(
                                'cursor-pointer transition-colors px-3 py-1',
                                filter === 'net_sell' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-100 text-green-700 hover:bg-green-200'
                            )}
                            onClick={() => setFilter('net_sell')}
                        >
                            <TrendingDown className="w-3 h-3 mr-1" />
                            净卖出 ({stats.netSell})
                        </Badge>
                    </div>
                </div>
            </Card>

            {/* 龙虎榜表格 */}
            <Card className="border-border overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full rounded-lg" />
                        ))}
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                        <Trophy className="w-12 h-12 text-muted-foreground mb-3" />
                        <p>暂无龙虎榜数据</p>
                        <p className="text-sm">请尝试切换其他日期</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm table-auto">
                            <thead>
                                <tr className="bg-muted border-b border-border">
                                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">股票</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">收盘价</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">涨跌幅</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">换手率</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">总成交额</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">龙虎买入</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">龙虎卖出</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">净买入</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">净买占比</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">上榜理由</th>
                                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground whitespace-nowrap">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {data.map((item) => (
                                    <tr
                                        key={`${item.ts_code}_${item.trade_date}`}
                                        className="hover:bg-muted transition-colors"
                                    >
                                        <td className="px-3 py-2 text-center">
                                            <div className="font-medium text-foreground text-sm">{item.name}</div>
                                            <div className="text-xs text-muted-foreground">{item.ts_code}</div>
                                        </td>
                                        <td className="px-3 py-2 text-center font-mono text-sm text-foreground whitespace-nowrap">
                                            {item.close?.toFixed(2) || '-'}
                                        </td>
                                        <td className="px-3 py-2 text-center whitespace-nowrap">
                                            <span className={cn(
                                                'font-mono text-sm font-medium',
                                                item.pct_change >= 0 ? 'text-red-600' : 'text-green-600'
                                            )}>
                                                {item.pct_change >= 0 ? '+' : ''}{item.pct_change?.toFixed(2) || '0.00'}%
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-center font-mono text-sm text-muted-foreground whitespace-nowrap">
                                            {item.turnover_rate?.toFixed(2) || '-'}%
                                        </td>
                                        <td className="px-3 py-2 text-center font-mono text-sm text-muted-foreground whitespace-nowrap">
                                            {formatAmount(item.amount)}
                                        </td>
                                        <td className="px-3 py-2 text-center font-mono text-sm text-red-600 whitespace-nowrap">
                                            {formatAmount(item.l_buy)}
                                        </td>
                                        <td className="px-3 py-2 text-center font-mono text-sm text-green-600 whitespace-nowrap">
                                            {formatAmount(item.l_sell)}
                                        </td>
                                        <td className="px-3 py-2 text-center whitespace-nowrap">
                                            <span className={cn(
                                                'font-mono text-sm font-medium',
                                                item.net_amount >= 0 ? 'text-red-600' : 'text-green-600'
                                            )}>
                                                {item.net_amount >= 0 ? '+' : ''}{formatAmount(item.net_amount)}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-center whitespace-nowrap">
                                            <span className={cn(
                                                'font-mono text-xs',
                                                item.net_rate >= 0 ? 'text-red-600' : 'text-green-600'
                                            )}>
                                                {item.net_rate >= 0 ? '+' : ''}{item.net_rate?.toFixed(2) || '0.00'}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            {item.reasons && item.reasons.length > 0 ? (
                                                <div className="flex flex-col gap-0.5 items-center">
                                                    {item.reasons.slice(0, 2).map((reason, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded inline-block"
                                                            title={reason}
                                                        >
                                                            {reason.length > 20 ? reason.slice(0, 20) + '...' : reason}
                                                        </span>
                                                    ))}
                                                    {item.reasons.length > 2 && (
                                                        <span className="text-xs text-muted-foreground">+{item.reasons.length - 2}个理由</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 px-2 text-xs"
                                                onClick={() => loadDetail(item)}
                                            >
                                                <Building2 className="w-3.5 h-3.5 mr-1" />
                                                席位
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* 机构明细弹窗 */}
            {selectedStock && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedStock(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 头部 */}
                        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-muted to-white">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                    <Building2 className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl font-bold text-foreground">{selectedStock.name}</span>
                                        <span className="text-sm text-muted-foreground">{selectedStock.ts_code}</span>
                                        <span className={cn(
                                            'font-mono font-medium px-2 py-0.5 rounded',
                                            selectedStock.pct_change >= 0 ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'
                                        )}>
                                            {selectedStock.pct_change >= 0 ? '+' : ''}{selectedStock.pct_change?.toFixed(2)}%
                                        </span>
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {formatDate(selectedStock.trade_date)} · 净买入
                                        <span className={cn(
                                            'font-mono font-medium ml-1',
                                            selectedStock.net_amount >= 0 ? 'text-red-600' : 'text-green-600'
                                        )}>
                                            {selectedStock.net_amount >= 0 ? '+' : ''}{formatAmount(selectedStock.net_amount)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedStock(null)}
                                className="p-2 hover:bg-muted rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* 上榜理由 */}
                        {selectedStock.reasons && selectedStock.reasons.length > 0 && (
                            <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                                <div className="flex items-start gap-2">
                                    <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <span className="text-sm font-medium text-amber-800">上榜理由：</span>
                                        <div className="mt-1 space-y-1">
                                            {selectedStock.reasons.map((reason, idx) => (
                                                <div key={idx} className="text-sm text-amber-700 flex items-start gap-1">
                                                    <span className="text-amber-500">•</span>
                                                    <span>{reason}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 交易概况 */}
                        <div className="p-4 border-b border-border">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="text-center p-3 rounded-lg bg-muted">
                                    <div className="text-xs text-muted-foreground mb-1">收盘价</div>
                                    <div className="font-mono font-medium text-foreground">¥{selectedStock.close?.toFixed(2)}</div>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-muted">
                                    <div className="text-xs text-muted-foreground mb-1">换手率</div>
                                    <div className="font-mono font-medium text-foreground">{selectedStock.turnover_rate?.toFixed(2)}%</div>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-red-50">
                                    <div className="text-xs text-muted-foreground mb-1">龙虎榜买入</div>
                                    <div className="font-mono font-medium text-red-600">{formatAmount(selectedStock.l_buy)}</div>
                                </div>
                                <div className="text-center p-3 rounded-lg bg-green-50">
                                    <div className="text-xs text-muted-foreground mb-1">龙虎榜卖出</div>
                                    <div className="font-mono font-medium text-green-600">{formatAmount(selectedStock.l_sell)}</div>
                                </div>
                            </div>
                        </div>

                        {/* 机构明细内容 */}
                        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 280px)' }}>
                            {detailLoading ? (
                                <div className="p-6 space-y-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Skeleton key={i} className="h-14 w-full rounded-lg" />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 grid grid-cols-2 gap-6">
                                    {/* 买方席位 */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                                <TrendingUp className="w-4 h-4 text-red-600" />
                                            </div>
                                            <span className="font-semibold text-red-600">买入席位 TOP5</span>
                                        </div>
                                        {detailData.buyers.length === 0 ? (
                                            <div className="text-sm text-muted-foreground text-center py-8 bg-muted rounded-lg">
                                                暂无买入席位数据
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {detailData.buyers.slice(0, 5).map((inst, idx) => (
                                                    <div key={idx} className="p-3 rounded-lg bg-red-50 border border-red-100 hover:shadow-sm transition-shadow">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn(
                                                                    'w-5 h-5 flex items-center justify-center text-xs font-bold rounded',
                                                                    idx < 3 ? 'bg-red-500 text-white' : 'bg-red-200 text-red-700'
                                                                )}>
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="text-sm text-muted-foreground font-medium truncate max-w-[200px]" title={inst.exalter}>
                                                                    {inst.exalter}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                                            <div>
                                                                <span className="text-muted-foreground">买入</span>
                                                                <div className="font-mono text-red-600">{formatAmount(inst.buy)}</div>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">卖出</span>
                                                                <div className="font-mono text-green-600">{formatAmount(inst.sell)}</div>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">净买</span>
                                                                <div className={cn(
                                                                    'font-mono',
                                                                    inst.net_buy >= 0 ? 'text-red-600' : 'text-green-600'
                                                                )}>
                                                                    {inst.net_buy >= 0 ? '+' : ''}{formatAmount(inst.net_buy)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* 卖方席位 */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                                                <TrendingDown className="w-4 h-4 text-green-600" />
                                            </div>
                                            <span className="font-semibold text-green-600">卖出席位 TOP5</span>
                                        </div>
                                        {detailData.sellers.length === 0 ? (
                                            <div className="text-sm text-muted-foreground text-center py-8 bg-muted rounded-lg">
                                                暂无卖出席位数据
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {detailData.sellers.slice(0, 5).map((inst, idx) => (
                                                    <div key={idx} className="p-3 rounded-lg bg-green-50 border border-green-100 hover:shadow-sm transition-shadow">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn(
                                                                    'w-5 h-5 flex items-center justify-center text-xs font-bold rounded',
                                                                    idx < 3 ? 'bg-green-500 text-white' : 'bg-green-200 text-green-700'
                                                                )}>
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="text-sm text-muted-foreground font-medium truncate max-w-[200px]" title={inst.exalter}>
                                                                    {inst.exalter}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                                            <div>
                                                                <span className="text-muted-foreground">买入</span>
                                                                <div className="font-mono text-red-600">{formatAmount(inst.buy)}</div>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">卖出</span>
                                                                <div className="font-mono text-green-600">{formatAmount(inst.sell)}</div>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground">净买</span>
                                                                <div className={cn(
                                                                    'font-mono',
                                                                    inst.net_buy >= 0 ? 'text-red-600' : 'text-green-600'
                                                                )}>
                                                                    {inst.net_buy >= 0 ? '+' : ''}{formatAmount(inst.net_buy)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

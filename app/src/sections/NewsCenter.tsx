import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import useSWR from 'swr';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Newspaper,
  Zap,
  Building2,
  FileText,
  Calendar as CalendarIcon,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { fetchRealTimeNews, NEWS_SOURCES } from '@/services/newsService';
import { FEATURED_NEWS_TABLES, subscribeToNewsTables, getActiveSubscriptionCount } from '@/lib/supabase';
import { classifyNews, type NewsImportance, type NewsCategory } from '@/lib/newsClassifier';
import { NewsSidebar, NewsMobileFilters } from '@/components/news/NewsSidebar';
import { NewsStream } from '@/components/news/NewsStream';
import { NewsDetailModal, ImageLightbox } from '@/components/news/NewsDetailModal';
import { NewsSearchBar } from '@/components/news/NewsSearchBar';
import type { NewsCardItem } from '@/components/news/NewsItemCard';

// ── 表名 ↔ 来源 key 双向映射 ─────────────────────────────

const TABLE_TO_SOURCE_KEY: Record<string, string> = {
  'snowball_influencer_tb': 'snowball_influencer',
  'weibo_influencer_tb': 'weibo_influencer',
  'clscntelegraph_tb': 'cls',
  'eastmoney724_tb': 'eastmoney',
  'jin10data724_tb': 'jin10',
  'gelonghui724_tb': 'gelonghui',
  'sina724_tb': 'sina',
  'jqka724_tb': 'jqka',
  'jrj724_tb': 'jrj',
  'futunn724_tb': 'futunn',
  'ifeng724_tb': 'ifeng',
  'jin10qihuo724_tb': 'jin10qihuo',
  'snowball724_tb': 'snowball',
  'wallstreetcn_tb': 'wallstreetcn',
  'xuangutong724_tb': 'xuangutong',
  'yicai724_tb': 'yicai',
  'yuncaijing724_tb': 'yuncaijing',
};

const SOURCE_TO_TABLE_MAP: Record<string, string> = Object.entries(TABLE_TO_SOURCE_KEY).reduce(
  (acc, [tableName, sourceKey]) => { acc[sourceKey] = tableName; return acc; },
  {} as Record<string, string>
);

// ── Mock 数据（公告/研报/日历，待接入真实数据） ─────────────

const mockAnnouncements = [
  { id: '1', title: '2024年度业绩预告', type: '业绩预告', date: '2024-01-15', code: '600519.SH', name: '贵州茅台' },
  { id: '2', title: '关于控股股东增持股份的公告', type: '增减持', date: '2024-01-14', code: '000858.SZ', name: '五粮液' },
  { id: '3', title: '2023年年度报告', type: '定期报告', date: '2024-01-13', code: '002230.SZ', name: '科大讯飞' },
  { id: '4', title: '关于签署战略合作协议的公告', type: '重大事项', date: '2024-01-12', code: '300750.SZ', name: '宁德时代' },
  { id: '5', title: '关于回购公司股份的进展公告', type: '回购', date: '2024-01-11', code: '600036.SH', name: '招商银行' },
];

const mockResearchReports = [
  { id: '1', title: '贵州茅台2024年业绩点评：稳健增长，长期价值凸显', org: '中信证券', rating: '买入', target: 1850 as number | null, date: '2024-01-15' },
  { id: '2', title: '白酒行业深度报告：集中度提升，龙头优势巩固', org: '中金公司', rating: '推荐', target: null as number | null, date: '2024-01-14' },
  { id: '3', title: '宁德时代：技术领先，全球布局加速', org: '华泰证券', rating: '买入', target: 200 as number | null, date: '2024-01-13' },
  { id: '4', title: 'AI行业跟踪：大模型商业化加速', org: '招商证券', rating: '推荐', target: null as number | null, date: '2024-01-12' },
];

const mockCalendar = [
  { date: '01-16', time: '09:30', event: '1月LPR报价公布', type: '宏观', importance: 'high' },
  { date: '01-16', time: '10:00', event: '贵州茅台财报披露', type: '财报', importance: 'high', code: '600519.SH', name: '贵州茅台' },
  { date: '01-17', time: '09:30', event: '新股申购：某某科技', type: '新股', importance: 'normal' },
  { date: '01-18', time: '15:00', event: '宁德时代股东大会', type: '股东大会', importance: 'normal', code: '300750.SZ', name: '宁德时代' },
  { date: '01-19', time: '09:30', event: '12月经济数据发布', type: '宏观', importance: 'high' },
];

// ── 工具函数 ────────────────────────────────────────────

function formatNewsTime(timestamp: number): { time: string; date: string } {
  const d = new Date(timestamp * 1000);
  return {
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    date: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  };
}

function getAnnouncementTypeColor(type: string) {
  switch (type) {
    case '业绩预告': return 'bg-green-100 text-green-700';
    case '定期报告': return 'bg-blue-100 text-blue-700';
    case '重大事项': return 'bg-red-100 text-red-700';
    case '增减持': return 'bg-yellow-100 text-yellow-700';
    case '回购': return 'bg-purple-100 text-purple-700';
    default: return 'bg-muted text-muted-foreground';
  }
}

// ══════════════════════════════════════════════════════════
//  NewsCenter — 主组件
// ══════════════════════════════════════════════════════════

export function NewsCenter() {
  // ── Tab 切换 ──
  const [activeTab, setActiveTab] = useState('flash');

  // ── 实时快讯数据 ──
  const [flashNews, setFlashNews] = useState<NewsCardItem[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentLimit, setCurrentLimit] = useState(200);

  // ── 筛选状态 ──
  const [searchKeyword, setSearchKeyword] = useState('');
  const [importanceFilter, setImportanceFilter] = useState<NewsImportance[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<NewsCategory[]>([]);

  // ── 模态框 ──
  const [selectedNews, setSelectedNews] = useState<NewsCardItem | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // ── Realtime ──
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const realtimeConnected = realtimeEnabled && getActiveSubscriptionCount() > 0;
  const selectedSources = selectedSource === 'all' ? undefined : [selectedSource];

  // ── SWR 数据拉取（不加日期限制，直接取最新数据） ──

  const { isLoading, mutate } = useSWR(
    ['news:realtime:v2', selectedSource, currentLimit],
    () => fetchRealTimeNews({
      sources: selectedSources,
      limit: selectedSource === 'all' ? 50 : 80,
      totalLimit: currentLimit,
    }),
    {
      dedupingInterval: 5_000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: activeTab === 'flash' && !realtimeEnabled ? 30_000 : 0,
      onSuccess: (news) => {
        const enriched = enrichNews(news);
        setFlashNews(enriched);
        setHasMore(news.length >= currentLimit);
        setLoadingMore(false);
      },
    }
  );

  /** 给原始数据附加 importance(三级) + categories */
  const enrichNews = useCallback((items: Array<Record<string, unknown>>): NewsCardItem[] => {
    return (items as NewsCardItem[]).map(item => {
      const { importance, categories } = classifyNews(item.title, item.content, item.sourceKey);
      return { ...item, importance, categories };
    });
  }, []);

  // ── Realtime 订阅：新数据直接插入主列表 ──

  useEffect(() => {
    if (!realtimeEnabled) {
      if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; }
      return;
    }

    const targetTables = selectedSource === 'all'
      ? FEATURED_NEWS_TABLES
      : (SOURCE_TO_TABLE_MAP[selectedSource] ? [SOURCE_TO_TABLE_MAP[selectedSource]] : []);

    if (targetTables.length === 0) return;

    const unsubscribe = subscribeToNewsTables(targetTables, (tableName, payload) => {
      const newData = payload.new as Record<string, unknown>;
      const sourceKey = TABLE_TO_SOURCE_KEY[tableName] || 'unknown';
      const sourceName = NEWS_SOURCES.find(s => s.key === sourceKey)?.name || tableName;
      const { time, date } = formatNewsTime(newData.display_time as number);
      const { importance, categories } = classifyNews(
        (newData.title as string) || '',
        (newData.content as string) || '',
        sourceKey,
      );

      let parsedImages: string[] | undefined;
      if (typeof newData.images === 'string' && (newData.images as string).trim()) {
        try { parsedImages = JSON.parse(newData.images as string); } catch { /* noop */ }
      }

      const newsItem: NewsCardItem = {
        id: `${sourceKey}_${newData.id}`,
        title: (newData.title as string) || '',
        content: (newData.content as string) || '',
        source: sourceName,
        sourceKey,
        display_time: newData.display_time as number,
        time,
        date,
        importance,
        categories,
        images: parsedImages,
      };

      if (selectedSource !== 'all' && sourceKey !== selectedSource) return;

      // 直接插入主列表顶部（去重）
      setFlashNews(prev => {
        if (prev.some(n => n.id === newsItem.id)) return prev;
        return [newsItem, ...prev];
      });

      // 标记为新条目（用于高亮动画），3 秒后移除标记
      setNewItemIds(prev => new Set(prev).add(newsItem.id));
      setTimeout(() => {
        setNewItemIds(prev => {
          const next = new Set(prev);
          next.delete(newsItem.id);
          return next;
        });
      }, 3000);

      logger.log('[Realtime] 自动合并新新闻:', newsItem.title || newsItem.content.substring(0, 50));
    });

    unsubscribeRef.current = unsubscribe;
    logger.log('[Realtime] 已启用实时订阅，订阅数:', getActiveSubscriptionCount(), '订阅表:', targetTables);

    return () => {
      if (unsubscribeRef.current) { unsubscribeRef.current(); unsubscribeRef.current = null; }
    };
  }, [realtimeEnabled, selectedSource]);

  // ── 前端筛选（只展示最近 7 天数据） ──

  const filteredNews = useMemo(() => {
    // 计算 7 天前的时间戳（秒）
    const now = new Date();
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
    const sevenDaysAgoTs = Math.floor(sevenDaysAgo.getTime() / 1000);

    // 先按 7 天筛选
    let result = flashNews.filter(n => n.display_time >= sevenDaysAgoTs);

    // 关键词搜索
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      result = result.filter(n =>
        n.title.toLowerCase().includes(kw) || n.content.toLowerCase().includes(kw)
      );
    }

    // 重要性筛选（多选 OR）
    if (importanceFilter.length > 0) {
      result = result.filter(n => importanceFilter.includes(n.importance));
    }

    // 分类筛选（多选 OR：只要新闻包含任一选中分类即可）
    if (categoryFilter.length > 0) {
      result = result.filter(n =>
        n.categories.some(c => categoryFilter.includes(c as NewsCategory))
      );
    }

    return result;
  }, [flashNews, searchKeyword, importanceFilter, categoryFilter]);

  // ── 加载更多 ──
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setCurrentLimit(prev => prev + 200);
  }, [loadingMore, hasMore]);

  // ── 切换来源时重置 ──
  const handleSourceChange = useCallback((source: string) => {
    setSelectedSource(source);
    setCurrentLimit(200);
  }, []);

  const loading = isLoading && flashNews.length === 0;

  // ═══════════════════════════════════════════════════════
  //  渲染
  // ═══════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-foreground">财经资讯</h2>
        </div>
        {/* Realtime 状态 */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRealtimeEnabled(!realtimeEnabled)}
            className={cn('gap-1 text-xs', realtimeConnected ? 'text-green-600' : 'text-muted-foreground')}
          >
            {realtimeConnected ? (
              <>
                <Wifi className="w-4 h-4" />
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                实时连接中
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                实时已关闭
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tab 切换 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-muted overflow-x-auto">
          <TabsTrigger value="flash" className="data-[state=active]:bg-white gap-1">
            <Zap className="w-4 h-4" />
            实时快讯
          </TabsTrigger>
          <TabsTrigger value="announcement" className="data-[state=active]:bg-white gap-1">
            <Building2 className="w-4 h-4" />
            公司公告
          </TabsTrigger>
          <TabsTrigger value="report" className="data-[state=active]:bg-white gap-1">
            <FileText className="w-4 h-4" />
            研究报告
          </TabsTrigger>
          <TabsTrigger value="calendar" className="data-[state=active]:bg-white gap-1">
            <CalendarIcon className="w-4 h-4" />
            财经日历
          </TabsTrigger>
        </TabsList>

        {/* ═══ 实时快讯 Tab ═══ */}
        <TabsContent value="flash" className="mt-4">
          {/* 头部：标题 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              <h3 className="text-lg font-semibold text-foreground">7×24小时快讯</h3>
              <span className="text-xs text-muted-foreground">
                {filteredNews.length > 0 && `(最近7天 · ${filteredNews.length}条)`}
              </span>
            </div>
          </div>

          {/* 移动端搜索框 + 来源 Badge（md 以下显示） */}
          <div className="md:hidden space-y-3 mb-4">
            <NewsSearchBar
              value={searchKeyword}
              onChange={setSearchKeyword}
              resultCount={searchKeyword ? filteredNews.length : undefined}
            />
            <NewsMobileFilters
              sources={NEWS_SOURCES}
              selectedSource={selectedSource}
              onSourceChange={handleSourceChange}
            />
          </div>

          {/* 双栏布局：侧边栏 + 新闻流 */}
          <div className="flex gap-4">
            {/* 左侧侧边栏（桌面端） */}
            <div className="hidden md:block">
              <NewsSidebar
                searchKeyword={searchKeyword}
                onSearchChange={setSearchKeyword}
                searchResultCount={searchKeyword ? filteredNews.length : undefined}
                sources={NEWS_SOURCES}
                selectedSource={selectedSource}
                onSourceChange={handleSourceChange}
                importanceFilter={importanceFilter}
                onImportanceFilterChange={setImportanceFilter}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
              />
            </div>

            {/* 右侧新闻流 */}
            <Card className="flex-1 p-4 bg-background border-border min-w-0">
              <NewsStream
                news={filteredNews}
                loading={loading}
                hasMore={hasMore && !searchKeyword}
                loadingMore={loadingMore}
                searchKeyword={searchKeyword}
                newItemIds={newItemIds}
                onLoadMore={loadMore}
                onRetry={() => mutate()}
                onSelectNews={setSelectedNews}
                onZoomImage={setZoomedImage}
              />
            </Card>
          </div>
        </TabsContent>

        {/* ═══ 公司公告 Tab ═══ */}
        <TabsContent value="announcement" className="mt-4">
          <Card className="p-4 bg-background border-border">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-foreground">公司公告</h3>
              <span className="text-xs text-muted-foreground">(示例数据，待接入)</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-border text-muted-foreground cursor-pointer hover:bg-muted">全部</Badge>
              <Badge className="bg-green-100 text-green-700 cursor-pointer">业绩预告</Badge>
              <Badge className="bg-blue-100 text-blue-700 cursor-pointer">定期报告</Badge>
              <Badge className="bg-red-100 text-red-700 cursor-pointer">重大事项</Badge>
              <Badge className="bg-yellow-100 text-yellow-700 cursor-pointer">增减持</Badge>
              <Badge className="bg-purple-100 text-purple-700 cursor-pointer">回购</Badge>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {mockAnnouncements.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Badge className={getAnnouncementTypeColor(a.type)}>{a.type}</Badge>
                      <div>
                        <p className="text-sm text-foreground">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.name} ({a.code})</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{a.date}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* ═══ 研究报告 Tab ═══ */}
        <TabsContent value="report" className="mt-4">
          <Card className="p-4 bg-background border-border">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-foreground">研究报告</h3>
              <span className="text-xs text-muted-foreground">(示例数据，待接入)</span>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {mockResearchReports.map((r) => (
                  <div key={r.id} className="p-4 rounded-lg bg-muted hover:bg-muted transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-foreground flex-1">{r.title}</h4>
                      <Badge className={cn('ml-2', r.rating === '买入' ? 'bg-red-100 text-red-700' : r.rating === '推荐' ? 'bg-yellow-100 text-yellow-700' : 'bg-muted text-muted-foreground')}>
                        {r.rating}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{r.org}</span>
                      {r.target && <span>目标价: <span className="text-red-600 font-mono">{r.target}</span></span>}
                      <span>{r.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        {/* ═══ 财经日历 Tab ═══ */}
        <TabsContent value="calendar" className="mt-4">
          <Card className="p-4 bg-background border-border">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-foreground">财经日历</h3>
              <span className="text-xs text-muted-foreground">(示例数据，待接入)</span>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {mockCalendar.map((event, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted hover:bg-muted transition-colors">
                    <div className="flex flex-col items-center min-w-16">
                      <span className="text-sm font-bold text-foreground">{event.date}</span>
                      <span className="text-xs text-muted-foreground">{event.time}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{event.event}</p>
                      {'name' in event && event.name && (
                        <p className="text-xs text-muted-foreground">{event.name} ({(event as { code: string }).code})</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-xs', event.type === '宏观' ? 'bg-red-100 text-red-700' : event.type === '财报' ? 'bg-blue-100 text-blue-700' : event.type === '新股' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground')}>
                        {event.type}
                      </Badge>
                      <Badge className={cn('text-xs', event.importance === 'high' ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground')}>
                        {event.importance === 'high' ? '重要' : '普通'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 新闻详情模态框 */}
      {selectedNews && (
        <NewsDetailModal
          news={selectedNews}
          onClose={() => setSelectedNews(null)}
          onZoomImage={setZoomedImage}
        />
      )}

      {/* 图片放大 */}
      {zoomedImage && (
        <ImageLightbox src={zoomedImage} onClose={() => setZoomedImage(null)} />
      )}
    </div>
  );
}

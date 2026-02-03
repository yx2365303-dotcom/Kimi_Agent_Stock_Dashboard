import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Newspaper,
  Zap,
  Building2,
  FileText,
  Calendar,
  RefreshCw,
  ChevronDown,
  Radio,
  Wifi,
  WifiOff,
  X,
  ZoomIn,
  Image as ImageIcon
} from 'lucide-react';
import { fetchRealTimeNews, NEWS_SOURCES } from '@/services/stockService';
import { subscribeToAllNewsTables, getActiveSubscriptionCount } from '@/lib/supabase';

// 实时快讯类型
interface FlashNewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceKey: string;
  display_time: number;
  time: string;
  date: string;
  importance: 'high' | 'normal';
  images?: string[];
}

// 模拟公告数据（后续接入真实数据）
const mockAnnouncements = [
  { id: '1', title: '2024年度业绩预告', type: '业绩预告', date: '2024-01-15', code: '600519.SH', name: '贵州茅台' },
  { id: '2', title: '关于控股股东增持股份的公告', type: '增减持', date: '2024-01-14', code: '000858.SZ', name: '五粮液' },
  { id: '3', title: '2023年年度报告', type: '定期报告', date: '2024-01-13', code: '002230.SZ', name: '科大讯飞' },
  { id: '4', title: '关于签署战略合作协议的公告', type: '重大事项', date: '2024-01-12', code: '300750.SZ', name: '宁德时代' },
  { id: '5', title: '关于回购公司股份的进展公告', type: '回购', date: '2024-01-11', code: '600036.SH', name: '招商银行' },
];

// 模拟研报数据（后续接入真实数据）
const mockResearchReports = [
  { id: '1', title: '贵州茅台2024年业绩点评：稳健增长，长期价值凸显', org: '中信证券', rating: '买入', target: 1850, date: '2024-01-15' },
  { id: '2', title: '白酒行业深度报告：集中度提升，龙头优势巩固', org: '中金公司', rating: '推荐', target: null, date: '2024-01-14' },
  { id: '3', title: '宁德时代：技术领先，全球布局加速', org: '华泰证券', rating: '买入', target: 200, date: '2024-01-13' },
  { id: '4', title: 'AI行业跟踪：大模型商业化加速', org: '招商证券', rating: '推荐', target: null, date: '2024-01-12' },
];

// 模拟财经日历（后续接入真实数据）
const mockCalendar = [
  { date: '01-16', time: '09:30', event: '1月LPR报价公布', type: '宏观', importance: 'high' },
  { date: '01-16', time: '10:00', event: '贵州茅台财报披露', type: '财报', importance: 'high', code: '600519.SH', name: '贵州茅台' },
  { date: '01-17', time: '09:30', event: '新股申购：某某科技', type: '新股', importance: 'normal' },
  { date: '01-18', time: '15:00', event: '宁德时代股东大会', type: '股东大会', importance: 'normal', code: '300750.SZ', name: '宁德时代' },
  { date: '01-19', time: '09:30', event: '12月经济数据发布', type: '宏观', importance: 'high' },
];

// 新闻源颜色映射
const sourceColorMap: Record<string, string> = {
  // 大V渠道 - 使用醒目颜色
  snowball_influencer: 'bg-blue-500 text-white border-blue-600',
  weibo_influencer: 'bg-orange-500 text-white border-orange-600',

  // 主流平台
  cls: 'bg-red-100 text-red-700 border-red-200',
  eastmoney: 'bg-teal-100 text-teal-700 border-teal-200',
  jin10: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  gelonghui: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  sina: 'bg-rose-100 text-rose-700 border-rose-200',
  jqka: 'bg-purple-100 text-purple-700 border-purple-200',
  jrj: 'bg-blue-100 text-blue-700 border-blue-200',
  futunn: 'bg-green-100 text-green-700 border-green-200',
  ifeng: 'bg-orange-100 text-orange-700 border-orange-200',
  jin10qihuo: 'bg-amber-100 text-amber-700 border-amber-200',
  chinastar: 'bg-indigo-100 text-indigo-700 border-indigo-200',

  // 其他平台
  snowball: 'bg-blue-100 text-blue-700 border-blue-200',
  wallstreetcn: 'bg-slate-100 text-slate-700 border-slate-200',
  xuangutong: 'bg-violet-100 text-violet-700 border-violet-200',
  yicai: 'bg-sky-100 text-sky-700 border-sky-200',
  yuncaijing: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

export function NewsCenter() {
  const [activeTab, setActiveTab] = useState('flash');
  const [flashNews, setFlashNews] = useState<FlashNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  // refreshing state removed - was declared but never read
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentLimit, setCurrentLimit] = useState(50);

  // 模态框状态
  const [selectedNews, setSelectedNews] = useState<FlashNewsItem | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Realtime 相关状态
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [newNewsCount, setNewNewsCount] = useState(0);
  const [realtimeNews, setRealtimeNews] = useState<FlashNewsItem[]>([]);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // 表名到 sourceKey 的映射
  const tableToSourceKey: Record<string, string> = {
    // 大V渠道
    'snowball_influencer_tb': 'snowball_influencer',
    'weibo_influencer_tb': 'weibo_influencer',

    // 主流平台
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
    'chinastarmarkettelegraph724_tb': 'chinastar',

    // 其他平台
    'snowball724_tb': 'snowball',
    'wallstreetcn_tb': 'wallstreetcn',
    'xuangutong724_tb': 'xuangutong',
    'yicai724_tb': 'yicai',
    'yuncaijing724_tb': 'yuncaijing',
  };

  // 格式化时间戳
  const formatNewsTime = (timestamp: number) => {
    const d = new Date(timestamp * 1000);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return {
      time: `${hours}:${minutes}`,
      date: `${month}-${day}`
    };
  };

  // 判断新闻重要性
  const getNewsImportance = (title: string, content: string): 'high' | 'normal' => {
    const importantKeywords = [
      '央行', '降准', '降息', '利率', 'LPR', '国务院', '证监会', '银保监',
      '重磅', '突发', '重要', '紧急', '官宣', '发布会',
      '涨停', '跌停', '暴涨', '暴跌', '大涨', '大跌',
      '特朗普', '美联储', 'Fed', '鲍威尔', 'GDP', 'CPI', 'PPI', 'PMI',
      '战争', '制裁', '关税', '贸易战',
    ];
    const text = (title + content).toLowerCase();
    return importantKeywords.some(keyword => text.includes(keyword.toLowerCase())) ? 'high' : 'normal';
  };

  // 设置 Realtime 订阅
  useEffect(() => {
    if (!realtimeEnabled) {
      // 如果禁用实时更新，取消订阅
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        setRealtimeConnected(false);
      }
      return;
    }

    // 订阅所有新闻表
    const unsubscribe = subscribeToAllNewsTables((tableName, payload) => {
      const newData = payload.new as Record<string, unknown>;
      const sourceKey = tableToSourceKey[tableName] || 'unknown';
      const sourceName = NEWS_SOURCES.find(s => s.key === sourceKey)?.name || tableName;

      const { time, date } = formatNewsTime(newData.display_time as number);

      const newsItem: FlashNewsItem = {
        id: `${sourceKey}_${newData.id}`,
        title: (newData.title as string) || '',
        content: (newData.content as string) || '',
        source: sourceName,
        sourceKey,
        display_time: newData.display_time as number,
        time,
        date,
        importance: getNewsImportance(
          (newData.title as string) || '',
          (newData.content as string) || ''
        ),
      };

      // 如果选择了特定来源，只显示该来源的新闻
      if (selectedSource !== 'all' && sourceKey !== selectedSource) {
        return;
      }

      // 添加到实时新闻队列
      setRealtimeNews(prev => [newsItem, ...prev].slice(0, 50));
      setNewNewsCount(prev => prev + 1);

      console.log('[Realtime] 收到新新闻:', newsItem.title || newsItem.content.substring(0, 50));
    });

    unsubscribeRef.current = unsubscribe;
    setRealtimeConnected(true);
    console.log('[Realtime] 已启用实时订阅，订阅数:', getActiveSubscriptionCount());

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        setRealtimeConnected(false);
      }
    };
  }, [realtimeEnabled, selectedSource]);

  // 合并实时新闻到主列表
  const mergeRealtimeNews = useCallback(() => {
    if (realtimeNews.length === 0) return;

    setFlashNews(prev => {
      // 合并并去重
      const merged = [...realtimeNews, ...prev];
      const seen = new Set<string>();
      const unique = merged.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      // 按时间排序
      unique.sort((a, b) => b.display_time - a.display_time);
      return unique;
    });

    setRealtimeNews([]);
    setNewNewsCount(0);
  }, [realtimeNews]);

  // 加载实时新闻
  const loadNews = useCallback(async (isRefresh = false, limit = 50) => {
    if (!isRefresh && flashNews.length === 0) {
      setLoading(true);
    }

    try {
      const sources = selectedSource === 'all' ? undefined : [selectedSource];
      const data = await fetchRealTimeNews({
        sources,
        limit: 30, // 每个源获取30条
        totalLimit: limit
      });

      setFlashNews(data);
      setHasMore(data.length >= limit);
      setCurrentLimit(limit);
    } catch (error) {
      console.error('加载新闻失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedSource, flashNews.length]);

  // 加载更多
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const newLimit = currentLimit + 50;
      const sources = selectedSource === 'all' ? undefined : [selectedSource];
      const data = await fetchRealTimeNews({
        sources,
        limit: 30,
        totalLimit: newLimit
      });

      setFlashNews(data);
      setHasMore(data.length >= newLimit);
      setCurrentLimit(newLimit);
    } catch (error) {
      console.error('加载更多失败:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [currentLimit, selectedSource, loadingMore, hasMore]);

  // 初始加载和切换源时重新加载
  useEffect(() => {
    loadNews(false, 50);
  }, [selectedSource]);

  // 自动刷新（每30秒）
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeTab === 'flash') {
        loadNews(true, currentLimit);
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [activeTab, currentLimit, loadNews]);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'normal': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getAnnouncementTypeColor = (type: string) => {
    switch (type) {
      case '业绩预告': return 'bg-green-100 text-green-700';
      case '定期报告': return 'bg-blue-100 text-blue-700';
      case '重大事项': return 'bg-red-100 text-red-700';
      case '增减持': return 'bg-yellow-100 text-yellow-700';
      case '回购': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  // 按日期分组新闻
  const groupNewsByDate = (news: FlashNewsItem[]) => {
    const groups: Record<string, FlashNewsItem[]> = {};
    news.forEach(item => {
      if (!groups[item.date]) {
        groups[item.date] = [];
      }
      groups[item.date].push(item);
    });
    return groups;
  };

  const newsGroups = groupNewsByDate(flashNews);

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-slate-900">财经资讯</h2>
        </div>
        {/* Realtime 状态指示器 */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRealtimeEnabled(!realtimeEnabled)}
            className={cn(
              "gap-1 text-xs",
              realtimeConnected ? "text-green-600" : "text-slate-400"
            )}
          >
            {realtimeConnected ? (
              <>
                <Wifi className="w-4 h-4" />
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
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

      {/* Tab切换 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-slate-100 overflow-x-auto">
          <TabsTrigger value="flash" className="data-[state=active]:bg-white gap-1 relative">
            <Zap className="w-4 h-4" />
            实时快讯
            {newNewsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                {newNewsCount > 99 ? '99+' : newNewsCount}
              </span>
            )}
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
            <Calendar className="w-4 h-4" />
            财经日历
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flash" className="mt-4">
          <Card className="p-4 bg-white border-slate-200">
            {/* 头部：标题 */}
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-yellow-600" />
              <h3 className="text-lg font-semibold text-slate-900">7×24小时快讯</h3>
              <span className="text-xs text-slate-500">
                {flashNews.length > 0 && `(${flashNews.length}条)`}
              </span>
            </div>

            {/* 新消息提示条 */}
            {newNewsCount > 0 && (
              <div
                className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={mergeRealtimeNews}
              >
                <Radio className="w-4 h-4 text-blue-600 animate-pulse" />
                <span className="text-sm text-blue-700">
                  收到 <span className="font-bold">{newNewsCount}</span> 条新消息，点击查看
                </span>
              </div>
            )}

            {/* 来源筛选器 - 默认展示 */}
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 rounded-lg">
              <Badge
                className={cn(
                  'cursor-pointer transition-colors',
                  selectedSource === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                )}
                onClick={() => setSelectedSource('all')}
              >
                全部
              </Badge>
              {NEWS_SOURCES.map((source) => (
                <Badge
                  key={source.key}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selectedSource === source.key
                      ? 'bg-blue-600 text-white'
                      : sourceColorMap[source.key] || 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  )}
                  onClick={() => setSelectedSource(source.key)}
                >
                  {source.name}
                </Badge>
              ))}
            </div>

            {/* 新闻列表 */}
            <ScrollArea className="h-[550px]">
              {loading ? (
                // 加载骨架屏
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                      <div className="flex flex-col items-center min-w-14">
                        <Skeleton className="h-4 w-10 mb-1" />
                        <Skeleton className="h-5 w-8" />
                      </div>
                      <div className="flex-1">
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : flashNews.length === 0 ? (
                // 空状态
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <Newspaper className="w-12 h-12 mb-2 opacity-50" />
                  <p>暂无新闻数据</p>
                  <Button
                    variant="link"
                    onClick={() => loadNews(true, 50)}
                    className="mt-2"
                  >
                    点击重试
                  </Button>
                </div>
              ) : (
                // 新闻内容
                <div className="space-y-4">
                  {Object.entries(newsGroups).map(([date, items]) => (
                    <div key={date}>
                      {/* 日期分隔 */}
                      <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1 z-10">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-xs font-medium text-slate-500 px-2">{date}</span>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>

                      {/* 该日期下的新闻 */}
                      <div className="space-y-2">
                        {items.map((news) => (
                          <div
                            key={news.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer hover:shadow-sm"
                            onClick={() => setSelectedNews(news)}
                          >
                            <div className="flex flex-col items-center min-w-14">
                              <span className="text-sm font-mono text-slate-600">{news.time}</span>
                              <Badge className={cn('text-xs mt-1', getImportanceColor(news.importance))}>
                                {news.importance === 'high' ? '重要' : '普通'}
                              </Badge>
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* 标题或内容 */}
                              {news.title ? (
                                <>
                                  <p className="text-sm font-medium text-slate-900 mb-1">{news.title}</p>
                                  {news.content && news.content !== news.title && (
                                    <p className="text-xs text-slate-600 line-clamp-2">{news.content}</p>
                                  )}
                                </>
                              ) : (
                                <p className="text-sm text-slate-900 line-clamp-3">{news.content}</p>
                              )}

                              {/* 图片缩略图 */}
                              {news.images && news.images.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                  {news.images.slice(0, 3).map((img, idx) => (
                                    <div
                                      key={idx}
                                      className="relative w-12 h-12 rounded overflow-hidden border border-slate-200 flex-shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setZoomedImage(img);
                                      }}
                                    >
                                      <img
                                        src={img}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  ))}
                                  {news.images.length > 3 && (
                                    <div className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs text-slate-600">+{news.images.length - 3}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 来源和图片数量 */}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-xs',
                                    sourceColorMap[news.sourceKey] || 'bg-slate-100 text-slate-600'
                                  )}
                                >
                                  {news.source}
                                </Badge>
                                {news.images && news.images.length > 0 && (
                                  <span className="text-xs text-slate-400 flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" />
                                    {news.images.length}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* 加载更多 */}
                  {hasMore && (
                    <div className="flex justify-center py-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="gap-1"
                      >
                        {loadingMore ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            加载中...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            加载更多
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="announcement" className="mt-4">
          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-slate-900">公司公告</h3>
              <span className="text-xs text-slate-400">(示例数据，待接入)</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge className="bg-slate-200 text-slate-700 cursor-pointer hover:bg-slate-300">全部</Badge>
              <Badge className="bg-green-100 text-green-700 cursor-pointer">业绩预告</Badge>
              <Badge className="bg-blue-100 text-blue-700 cursor-pointer">定期报告</Badge>
              <Badge className="bg-red-100 text-red-700 cursor-pointer">重大事项</Badge>
              <Badge className="bg-yellow-100 text-yellow-700 cursor-pointer">增减持</Badge>
              <Badge className="bg-purple-100 text-purple-700 cursor-pointer">回购</Badge>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {mockAnnouncements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={getAnnouncementTypeColor(announcement.type)}>
                        {announcement.type}
                      </Badge>
                      <div>
                        <p className="text-sm text-slate-900">{announcement.title}</p>
                        <p className="text-xs text-slate-600">
                          {announcement.name} ({announcement.code})
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-600">{announcement.date}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="report" className="mt-4">
          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-slate-900">研究报告</h3>
              <span className="text-xs text-slate-400">(示例数据，待接入)</span>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {mockResearchReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-slate-900 flex-1">{report.title}</h4>
                      <Badge className={cn(
                        'ml-2',
                        report.rating === '买入' ? 'bg-red-100 text-red-700' :
                          report.rating === '推荐' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-600'
                      )}>
                        {report.rating}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                      <span>{report.org}</span>
                      {report.target && (
                        <span>目标价: <span className="text-red-600 font-mono">{report.target}</span></span>
                      )}
                      <span>{report.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <Card className="p-4 bg-white border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-slate-900">财经日历</h3>
              <span className="text-xs text-slate-400">(示例数据，待接入)</span>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {mockCalendar.map((event, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex flex-col items-center min-w-16">
                      <span className="text-sm font-bold text-slate-900">{event.date}</span>
                      <span className="text-xs text-slate-600">{event.time}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-900">{event.event}</p>
                      {event.name && (
                        <p className="text-xs text-slate-600">
                          {event.name} ({event.code})
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn(
                        'text-xs',
                        event.type === '宏观' ? 'bg-red-100 text-red-700' :
                          event.type === '财报' ? 'bg-blue-100 text-blue-700' :
                            event.type === '新股' ? 'bg-green-100 text-green-700' :
                              'bg-slate-100 text-slate-600'
                      )}>
                        {event.type}
                      </Badge>
                      <Badge className={cn(
                        'text-xs',
                        event.importance === 'high' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'
                      )}>
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
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedNews(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <Badge
                  className={cn(
                    'text-xs',
                    sourceColorMap[selectedNews.sourceKey] || 'bg-slate-100 text-slate-600'
                  )}
                >
                  {selectedNews.source}
                </Badge>
                <span className="text-sm text-slate-500">{selectedNews.date} {selectedNews.time}</span>
                <Badge className={cn('text-xs', getImportanceColor(selectedNews.importance))}>
                  {selectedNews.importance === 'high' ? '重要' : '普通'}
                </Badge>
              </div>
              <button
                onClick={() => setSelectedNews(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* 内容 */}
            <ScrollArea className="max-h-[calc(85vh-120px)]">
              <div className="p-6">
                {selectedNews.title && (
                  <h2 className="text-xl font-bold text-slate-900 mb-4">{selectedNews.title}</h2>
                )}
                <p className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedNews.content}
                </p>

                {/* 图片展示 */}
                {selectedNews.images && selectedNews.images.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-500">相关图片 ({selectedNews.images.length})</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedNews.images.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative group cursor-pointer rounded-lg overflow-hidden border border-slate-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setZoomedImage(img);
                          }}
                        >
                          <img
                            src={img}
                            alt={`图片 ${idx + 1}`}
                            className="w-full h-40 object-cover transition-transform group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* 图片放大模态框 */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <button
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            onClick={() => setZoomedImage(null)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={zoomedImage}
            alt="放大图片"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

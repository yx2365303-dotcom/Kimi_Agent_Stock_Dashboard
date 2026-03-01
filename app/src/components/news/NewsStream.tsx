import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Newspaper, RefreshCw, ChevronDown } from 'lucide-react';
import { NewsItemCard, type NewsCardItem } from './NewsItemCard';

interface NewsStreamProps {
  news: NewsCardItem[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  searchKeyword?: string;
  newItemIds?: Set<string>;  // 最近通过 realtime 到达的新闻 id
  onLoadMore: () => void;
  onRetry: () => void;
  onSelectNews: (news: NewsCardItem) => void;
  onZoomImage: (url: string) => void;
}

/** 按日期分组新闻 */
function groupByDate(news: NewsCardItem[]): Record<string, NewsCardItem[]> {
  const groups: Record<string, NewsCardItem[]> = {};
  for (const item of news) {
    if (!groups[item.date]) groups[item.date] = [];
    groups[item.date].push(item);
  }
  return groups;
}

export function NewsStream({
  news,
  loading,
  hasMore,
  loadingMore,
  searchKeyword = '',
  newItemIds,
  onLoadMore,
  onRetry,
  onSelectNews,
  onZoomImage,
}: NewsStreamProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
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
    );
  }

  if (news.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Newspaper className="w-12 h-12 mb-2 opacity-50" />
        <p>{searchKeyword ? '无匹配结果' : '暂无新闻数据'}</p>
        {!searchKeyword && (
          <Button variant="link" onClick={onRetry} className="mt-2">
            点击重试
          </Button>
        )}
      </div>
    );
  }

  // 有搜索词时平铺展示，否则按日期分组
  if (searchKeyword.trim()) {
    return (
      <ScrollArea className="h-[calc(100vh-260px)]">
        <div className="space-y-2">
          {news.map(item => (
            <NewsItemCard
              key={item.id}
              news={item}
              searchKeyword={searchKeyword}
              onSelect={onSelectNews}
              onZoomImage={onZoomImage}
              isNew={newItemIds?.has(item.id)}
            />
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-260px)]">
      <div className="space-y-2">
        {news.map(item => (
          <NewsItemCard
            key={item.id}
            news={item}
            searchKeyword=""
            onSelect={onSelectNews}
            onZoomImage={onZoomImage}
            isNew={newItemIds?.has(item.id)}
          />
        ))}

        {/* 加载更多 */}
        {hasMore && (
          <div className="flex justify-center py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
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
    </ScrollArea>
  );
}

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, ZoomIn } from 'lucide-react';
import { IMPORTANCE_CONFIG, CATEGORY_CONFIG, type NewsImportance, type NewsCategory } from '@/lib/newsClassifier';
import { HighlightText } from './NewsSearchBar';

// 新闻源颜色映射（从原 NewsCenter 提取）
export const sourceColorMap: Record<string, string> = {
  snowball_influencer: 'bg-blue-500 text-white border-blue-600',
  weibo_influencer: 'bg-orange-500 text-white border-orange-600',
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
  snowball: 'bg-blue-100 text-blue-700 border-blue-200',
  wallstreetcn: 'bg-muted text-muted-foreground border-border',
  xuangutong: 'bg-violet-100 text-violet-700 border-violet-200',
  yicai: 'bg-sky-100 text-sky-700 border-sky-200',
  yuncaijing: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

export interface NewsCardItem {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceKey: string;
  display_time: number;
  time: string;
  date: string;
  importance: NewsImportance;
  categories: string[];
  images?: string[];
}

interface NewsItemCardProps {
  news: NewsCardItem;
  searchKeyword?: string;
  onSelect: (news: NewsCardItem) => void;
  onZoomImage: (url: string) => void;
  isNew?: boolean; // 新到达的实时数据，加动画
}

export function NewsItemCard({ news, searchKeyword = '', onSelect, onZoomImage, isNew }: NewsItemCardProps) {
  const impCfg = IMPORTANCE_CONFIG[news.importance] || IMPORTANCE_CONFIG.normal;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer hover:shadow-sm',
        isNew && 'animate-in fade-in slide-in-from-top-2 duration-500',
        news.importance === 'urgent' && 'ring-1 ring-red-300 bg-red-50/50 dark:bg-red-950/20',
      )}
      onClick={() => onSelect(news)}
    >
      {/* 左侧：日期时间 + 重要性 */}
      <div className="flex flex-col items-center min-w-14 gap-1">
        <span className="text-xs text-muted-foreground/70">{news.date}</span>
        <span className="text-sm font-mono text-muted-foreground">{news.time}</span>
        <Badge className={cn('text-xs', impCfg.color)}>
          {impCfg.label}
        </Badge>
      </div>

      {/* 中间：内容 */}
      <div className="flex-1 min-w-0">
        {news.title ? (
          <>
            <p className="text-sm font-medium text-foreground mb-1">
              <HighlightText text={news.title} keyword={searchKeyword} />
            </p>
            {news.content && news.content !== news.title && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                <HighlightText text={news.content} keyword={searchKeyword} />
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-foreground line-clamp-3">
            <HighlightText text={news.content} keyword={searchKeyword} />
          </p>
        )}

        {/* 图片缩略图 */}
        {news.images && news.images.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            {news.images.slice(0, 3).map((img, idx) => (
              <div
                key={idx}
                className="relative w-12 h-12 rounded overflow-hidden border border-border flex-shrink-0 group"
                onClick={(e) => { e.stopPropagation(); onZoomImage(img); }}
              >
                <img
                  src={img}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
            {news.images.length > 3 && (
              <div className="w-12 h-12 rounded bg-border flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-muted-foreground">+{news.images.length - 3}</span>
              </div>
            )}
          </div>
        )}

        {/* 底部标签行：来源 + 分类 + 图片数 */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <Badge
            variant="outline"
            className={cn('text-xs', sourceColorMap[news.sourceKey] || 'bg-muted text-muted-foreground')}
          >
            {news.source}
          </Badge>
          {news.categories.map((cat) => {
            const cfg = CATEGORY_CONFIG[cat as NewsCategory];
            if (!cfg) return null;
            return (
              <Badge key={cat} className={cn('text-xs', cfg.color)}>
                {cfg.label}
              </Badge>
            );
          })}
          {news.images && news.images.length > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <ImageIcon className="w-3 h-3" />
              {news.images.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

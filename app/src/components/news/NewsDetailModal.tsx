import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ZoomIn, ImageIcon } from 'lucide-react';
import { IMPORTANCE_CONFIG, CATEGORY_CONFIG, type NewsCategory } from '@/lib/newsClassifier';
import { sourceColorMap, type NewsCardItem } from './NewsItemCard';

interface NewsDetailModalProps {
  news: NewsCardItem;
  onClose: () => void;
  onZoomImage: (url: string) => void;
}

export function NewsDetailModal({ news, onClose, onZoomImage }: NewsDetailModalProps) {
  const impCfg = IMPORTANCE_CONFIG[news.importance] || IMPORTANCE_CONFIG.normal;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn('text-xs', sourceColorMap[news.sourceKey] || 'bg-muted text-muted-foreground')}>
              {news.source}
            </Badge>
            <span className="text-sm text-muted-foreground">{news.date} {news.time}</span>
            <Badge className={cn('text-xs', impCfg.color)}>
              {impCfg.label}
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
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* 内容 */}
        <ScrollArea className="max-h-[calc(85vh-120px)]">
          <div className="p-6">
            {news.title && (
              <h2 className="text-xl font-bold text-foreground mb-4">{news.title}</h2>
            )}
            <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {news.content}
            </p>

            {/* 图片展示 */}
            {news.images && news.images.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">相关图片 ({news.images.length})</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {news.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative group cursor-pointer rounded-lg overflow-hidden border border-border"
                      onClick={(e) => { e.stopPropagation(); onZoomImage(img); }}
                    >
                      <img
                        src={img}
                        alt={`图片 ${idx + 1}`}
                        className="w-full h-40 object-cover transition-transform group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
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
  );
}

/** 图片放大 Lightbox */
export function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
        onClick={onClose}
      >
        <X className="w-6 h-6 text-white" />
      </button>
      <img
        src={src}
        alt="放大图片"
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

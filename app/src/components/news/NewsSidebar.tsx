import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { NewsSearchBar } from './NewsSearchBar';
import {
  type NewsImportance,
  type NewsCategory,
  IMPORTANCE_CONFIG,
  CATEGORY_CONFIG,
  ALL_CATEGORIES,
} from '@/lib/newsClassifier';
import type { NewsSource } from '@/types';

interface NewsSidebarProps {
  // 搜索
  searchKeyword: string;
  onSearchChange: (keyword: string) => void;
  searchResultCount?: number;

  // 数据源
  sources: NewsSource[];
  selectedSource: string;
  onSourceChange: (source: string) => void;

  // 重要性筛选
  importanceFilter: NewsImportance[];
  onImportanceFilterChange: (filter: NewsImportance[]) => void;

  // 分类筛选
  categoryFilter: NewsCategory[];
  onCategoryFilterChange: (filter: NewsCategory[]) => void;
}

// 数据源分组
const SOURCE_GROUPS: { label: string; keys: string[] }[] = [
  { label: '大V渠道', keys: ['snowball_influencer', 'weibo_influencer'] },
  {
    label: '主流平台',
    keys: [
      'cls', 'eastmoney', 'jin10', 'gelonghui', 'sina',
      'jqka', 'jrj', 'futunn', 'ifeng', 'jin10qihuo',
    ],
  },
  { label: '其他平台', keys: ['snowball', 'wallstreetcn', 'xuangutong', 'yicai', 'yuncaijing'] },
];

// 小圆点颜色映射
const dotColorMap: Record<string, string> = {
  snowball_influencer: 'bg-blue-500',
  weibo_influencer: 'bg-orange-500',
  cls: 'bg-red-400',
  eastmoney: 'bg-teal-400',
  jin10: 'bg-yellow-400',
  gelonghui: 'bg-emerald-400',
  sina: 'bg-rose-400',
  jqka: 'bg-purple-400',
  jrj: 'bg-blue-400',
  futunn: 'bg-green-400',
  ifeng: 'bg-orange-400',
  jin10qihuo: 'bg-amber-400',
  snowball: 'bg-blue-400',
  wallstreetcn: 'bg-gray-400',
  xuangutong: 'bg-violet-400',
  yicai: 'bg-sky-400',
  yuncaijing: 'bg-cyan-400',
};

const ALL_IMPORTANCES: NewsImportance[] = ['urgent', 'high', 'normal'];

export function NewsSidebar({
  searchKeyword,
  onSearchChange,
  searchResultCount,
  sources,
  selectedSource,
  onSourceChange,
  importanceFilter,
  onImportanceFilterChange,
  categoryFilter,
  onCategoryFilterChange,
}: NewsSidebarProps) {
  const sourceMap = new Map(sources.map(s => [s.key, s]));

  const toggleImportance = (imp: NewsImportance) => {
    if (importanceFilter.includes(imp)) {
      onImportanceFilterChange(importanceFilter.filter(i => i !== imp));
    } else {
      onImportanceFilterChange([...importanceFilter, imp]);
    }
  };

  const toggleCategory = (cat: NewsCategory) => {
    if (categoryFilter.includes(cat)) {
      onCategoryFilterChange(categoryFilter.filter(c => c !== cat));
    } else {
      onCategoryFilterChange([...categoryFilter, cat]);
    }
  };

  return (
    <div className="w-56 shrink-0 flex flex-col gap-0 border border-border rounded-lg bg-background overflow-hidden h-[calc(100vh-260px)]">
      {/* 搜索框 */}
      <div className="p-3 pb-2 shrink-0">
        <NewsSearchBar
          value={searchKeyword}
          onChange={onSearchChange}
          resultCount={searchKeyword ? searchResultCount : undefined}
        />
      </div>

      <Separator className="shrink-0" />

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          {/* 数据源 */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">数据源</h4>
            {/* 全部 */}
            <button
              className={cn(
                'w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors',
                selectedSource === 'all'
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'hover:bg-muted text-foreground'
              )}
              onClick={() => onSourceChange('all')}
            >
              全部来源
            </button>

            {SOURCE_GROUPS.map(group => (
              <div key={group.label} className="mt-2">
                <span className="text-xs text-muted-foreground pl-2">{group.label}</span>
                <div className="mt-0.5 space-y-0.5">
                  {group.keys.map(key => {
                    const src = sourceMap.get(key);
                    if (!src) return null;
                    const active = selectedSource === key;
                    return (
                      <button
                        key={key}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2',
                          active
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'hover:bg-muted text-foreground'
                        )}
                        onClick={() => onSourceChange(key)}
                      >
                        <span className={cn('w-2 h-2 rounded-full shrink-0', dotColorMap[key] || 'bg-gray-400')} />
                        <span className="truncate">{src.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* 重要性筛选 */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">重要性</h4>
            <div className="space-y-1.5">
              {ALL_IMPORTANCES.map(imp => {
                const cfg = IMPORTANCE_CONFIG[imp];
                const checked = importanceFilter.includes(imp);
                return (
                  <label
                    key={imp}
                    className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleImportance(imp)}
                      className="h-4 w-4"
                    />
                    <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dotColor)} />
                    <span className="text-sm text-foreground">{cfg.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* 内容分类筛选 */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">内容分类</h4>
            <div className="space-y-1.5">
              {ALL_CATEGORIES.map(cat => {
                const cfg = CATEGORY_CONFIG[cat];
                const checked = categoryFilter.includes(cat);
                return (
                  <label
                    key={cat}
                    className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleCategory(cat)}
                      className="h-4 w-4"
                    />
                    <Badge className={cn('text-xs', cfg.color)}>{cfg.label}</Badge>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

/** 移动端：水平筛选 Badge 行（作为侧边栏的简化替代） */
export function NewsMobileFilters({
  sources,
  selectedSource,
  onSourceChange,
}: {
  sources: NewsSource[];
  selectedSource: string;
  onSourceChange: (source: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 p-2 bg-muted rounded-lg">
      <Badge
        className={cn(
          'cursor-pointer transition-colors text-xs',
          selectedSource === 'all'
            ? 'bg-primary text-primary-foreground'
            : 'bg-border text-muted-foreground hover:bg-muted-foreground/20'
        )}
        onClick={() => onSourceChange('all')}
      >
        全部
      </Badge>
      {sources.map(src => (
        <Badge
          key={src.key}
          className={cn(
            'cursor-pointer transition-colors text-xs',
            selectedSource === src.key
              ? 'bg-primary text-primary-foreground'
              : 'bg-border text-muted-foreground hover:bg-muted-foreground/20'
          )}
          onClick={() => onSourceChange(src.key)}
        >
          {src.name}
        </Badge>
      ))}
    </div>
  );
}

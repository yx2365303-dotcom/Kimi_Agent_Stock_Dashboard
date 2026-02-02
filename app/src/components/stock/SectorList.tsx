import { Card } from '@/components/ui/card';
import { cn, formatPercent, getChangeColor } from '@/lib/utils';
import type { SectorData } from '@/types';
import { Flame } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SectorListProps {
  sectors: SectorData[];
  title?: string;
  className?: string;
  showHeat?: boolean;
}

export function SectorList({ sectors, title = '板块排行', className, showHeat = true }: SectorListProps) {
  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>

      <ScrollArea className="h-64">
        <div className="space-y-1">
          {sectors.map((sector, index) => (
            <div 
              key={sector.ts_code}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  'w-5 h-5 flex items-center justify-center text-xs font-bold rounded',
                  index < 3 ? 'bg-yellow-100 text-yellow-700' : 'text-slate-500'
                )}>
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-slate-900">{sector.name}</span>
                {showHeat && sector.heat_score >= 80 && (
                  <Flame className="w-3 h-3 text-red-600" />
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={cn('text-sm font-mono font-medium', getChangeColor(sector.pct_change))}>
                    {formatPercent(sector.pct_change)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {sector.limit_up_count}只涨停
                  </div>
                </div>
                
                <div className="text-right min-w-16">
                  <div className="text-xs text-slate-500">
                    {sector.net_inflow > 0 ? '+' : ''}{sector.net_inflow.toFixed(1)}亿
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

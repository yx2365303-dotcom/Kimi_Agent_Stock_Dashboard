import { Suspense, lazy, useState, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { Toaster } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';

const MarketOverview = lazy(() => import('@/sections/MarketOverview').then((m) => ({ default: m.MarketOverview })));
const StockDetail = lazy(() => import('@/sections/StockDetail').then((m) => ({ default: m.StockDetail })));
const SectorHeat = lazy(() => import('@/sections/SectorHeat').then((m) => ({ default: m.SectorHeat })));
const StockScreener = lazy(() => import('@/sections/StockScreener').then((m) => ({ default: m.StockScreener })));
const AIAnalysis = lazy(() => import('@/sections/AIAnalysis').then((m) => ({ default: m.AIAnalysis })));
const NewsCenter = lazy(() => import('@/sections/NewsCenter').then((m) => ({ default: m.NewsCenter })));
const DragonTigerPage = lazy(() => import('@/sections/DragonTigerPage').then((m) => ({ default: m.DragonTigerPage })));

function SectionFallback() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('market');
  const [selectedStockCode, setSelectedStockCode] = useState<string | null>(null);

  // 从其他模块跳转到个股详情
  const handleSelectStock = useCallback((tsCode: string) => {
    setSelectedStockCode(tsCode);
    setActiveTab('stock');
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'market':
        return <MarketOverview />;
      case 'stock':
        return <StockDetail initialStockCode={selectedStockCode} />;
      case 'sector':
        return <SectorHeat onSelectStock={handleSelectStock} />;
      case 'dragon':
        return <DragonTigerPage />;
      case 'screener':
        return <StockScreener />;
      case 'ai':
        return <AIAnalysis />;
      case 'news':
        return <NewsCenter />;
      default:
        return <MarketOverview />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} onSelectStock={handleSelectStock} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Suspense fallback={<SectionFallback />}>
          {renderContent()}
        </Suspense>
      </main>
      <Toaster />
    </div>
  );
}

export default App;

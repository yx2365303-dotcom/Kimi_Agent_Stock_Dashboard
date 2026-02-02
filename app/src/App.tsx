import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { MarketOverview } from '@/sections/MarketOverview';
import { StockDetail } from '@/sections/StockDetail';
import { SectorHeat } from '@/sections/SectorHeat';
import { StockScreener } from '@/sections/StockScreener';
import { AIAnalysis } from '@/sections/AIAnalysis';
import { NewsCenter } from '@/sections/NewsCenter';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const [activeTab, setActiveTab] = useState('market');

  const renderContent = () => {
    switch (activeTab) {
      case 'market':
        return <MarketOverview />;
      case 'stock':
        return <StockDetail />;
      case 'sector':
        return <SectorHeat />;
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
    <div className="min-h-screen bg-white">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderContent()}
      </main>
      <Toaster />
    </div>
  );
}

export default App;

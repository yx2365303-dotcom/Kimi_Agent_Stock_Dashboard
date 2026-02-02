import type { IndexData, StockBasic, SectorData, LimitUpData, NewsItem, MarketSentiment } from '@/types';

// 大盘指数数据
export const mockIndices: IndexData[] = [
  { code: '000001.SH', name: '上证指数', current: 2950.50, change: 15.30, pct_change: 0.52, volume: 285000000, amount: 32500000000, high: 2960.80, low: 2935.20, pre_close: 2935.20 },
  { code: '399001.SZ', name: '深证成指', current: 9450.30, change: 79.50, pct_change: 0.85, volume: 365000000, amount: 42500000000, high: 9480.60, low: 9370.80, pre_close: 9370.80 },
  { code: '399006.SZ', name: '创业板指', current: 1850.20, change: 21.90, pct_change: 1.20, volume: 125000000, amount: 18500000000, high: 1860.50, low: 1828.30, pre_close: 1828.30 },
  { code: '000688.SH', name: '科创50', current: 850.60, change: 2.95, pct_change: 0.35, volume: 25000000, amount: 8500000000, high: 855.30, low: 847.65, pre_close: 847.65 },
  { code: '899050.BJ', name: '北证50', current: 750.80, change: 1.10, pct_change: 0.15, volume: 8000000, amount: 1200000000, high: 755.40, low: 749.70, pre_close: 749.70 },
];

// 涨跌分布
export const mockUpDownDistribution = {
  up_count: 2850,
  down_count: 1850,
  flat_count: 300,
  limit_up: 45,
  limit_down: 8,
  distribution: [
    { range: '>9.9%', count: 45, type: 'limit_up' as const },
    { range: '7%~9.9%', count: 85, type: 'up' as const },
    { range: '5%~7%', count: 180, type: 'up' as const },
    { range: '3%~5%', count: 420, type: 'up' as const },
    { range: '1%~3%', count: 850, type: 'up' as const },
    { range: '-1%~1%', count: 300, type: 'flat' as const },
    { range: '-3%~-1%', count: 520, type: 'down' as const },
    { range: '-5%~-3%', count: 380, type: 'down' as const },
    { range: '-7%~-5%', count: 180, type: 'down' as const },
    { range: '-9.9%~-7%', count: 120, type: 'down' as const },
    { range: '<-9.9%', count: 8, type: 'limit_down' as const },
  ]
};

// 北向资金
export const mockNorthFlow = {
  net_inflow: 25.8,
  sh_inflow: 15.2,
  sz_inflow: 10.6,
  cumulative_30d: 185.5,
  time_series: Array.from({ length: 30 }, (_, i) => ({
    date: `01-${String(i + 1).padStart(2, '0')}`,
    amount: Math.random() * 50 - 15
  }))
};

// 市场情绪
export const mockSentiment: MarketSentiment = {
  overall: 65,
  label: '乐观',
  up_down_ratio: 1.54,
  avg_change: 0.42,
  limit_up_success_rate: 78.5
};

// 涨跌停数据
export const mockLimitUpList: LimitUpData[] = [
  { ts_code: '000938.SZ', name: '中芯国际', trade_date: '2024-01-15', close: 58.80, pct_chg: 10.01, limit_amount: 125000, first_time: '09:35:00', last_time: '15:00:00', open_times: 0, limit_times: 1, tag: '芯片', theme: '国产替代' },
  { ts_code: '600756.SH', name: '浪潮信息', trade_date: '2024-01-15', close: 35.20, pct_chg: 10.00, limit_amount: 89000, first_time: '09:42:00', last_time: '15:00:00', open_times: 1, limit_times: 2, tag: '算力', theme: 'AI算力' },
  { ts_code: '002230.SZ', name: '科大讯飞', trade_date: '2024-01-15', close: 52.80, pct_chg: 9.99, limit_amount: 156000, first_time: '09:38:00', last_time: '15:00:00', open_times: 0, limit_times: 1, tag: 'AI', theme: '人工智能' },
  { ts_code: '300750.SZ', name: '宁德时代', trade_date: '2024-01-15', close: 165.80, pct_chg: 9.98, limit_amount: 234000, first_time: '10:15:00', last_time: '15:00:00', open_times: 2, limit_times: 1, tag: '新能源', theme: '锂电池' },
  { ts_code: '000858.SZ', name: '五粮液', trade_date: '2024-01-15', close: 145.60, pct_chg: 9.97, limit_amount: 78000, first_time: '11:20:00', last_time: '15:00:00', open_times: 0, limit_times: 1, tag: '白酒', theme: '消费' },
];

// 板块数据
export const mockSectors: SectorData[] = [
  { ts_code: 'BK0475', name: '半导体', pct_change: 5.23, volume: 85000000, amount: 12500000000, up_count: 45, down_count: 5, limit_up_count: 8, net_inflow: 25.8, heat_score: 95 },
  { ts_code: 'BK0480', name: '人工智能', pct_change: 4.85, volume: 92000000, amount: 15800000000, up_count: 42, down_count: 8, limit_up_count: 6, net_inflow: 22.3, heat_score: 92 },
  { ts_code: 'BK0485', name: '芯片概念', pct_change: 4.62, volume: 78000000, amount: 11200000000, up_count: 40, down_count: 10, limit_up_count: 5, net_inflow: 18.5, heat_score: 88 },
  { ts_code: 'BK0490', name: '新能源', pct_change: 3.78, volume: 105000000, amount: 18500000000, up_count: 38, down_count: 12, limit_up_count: 4, net_inflow: 15.2, heat_score: 82 },
  { ts_code: 'BK0495', name: '5G通信', pct_change: 3.45, volume: 65000000, amount: 8500000000, up_count: 35, down_count: 15, limit_up_count: 3, net_inflow: 8.6, heat_score: 75 },
  { ts_code: 'BK0500', name: '银行', pct_change: -1.95, volume: 45000000, amount: 5200000000, up_count: 5, down_count: 25, limit_up_count: 0, net_inflow: -15.2, heat_score: 25 },
  { ts_code: 'BK0505', name: '房地产', pct_change: -2.81, volume: 38000000, amount: 4200000000, up_count: 3, down_count: 27, limit_up_count: 0, net_inflow: -12.8, heat_score: 18 },
  { ts_code: 'BK0510', name: '煤炭', pct_change: -3.52, volume: 28000000, amount: 3200000000, up_count: 2, down_count: 28, limit_up_count: 0, net_inflow: -10.5, heat_score: 12 },
];

// 开盘啦题材
export const mockKplConcepts = [
  { name: 'ChatGPT', limit_up_count: 12, up_count: 45, total: 50, leading_stock: '科大讯飞', leading_change: 10.02, heat_score: 98 },
  { name: '算力概念', limit_up_count: 8, up_count: 38, total: 42, leading_stock: '浪潮信息', leading_change: 10.00, heat_score: 92 },
  { name: '芯片封装', limit_up_count: 7, up_count: 35, total: 40, leading_stock: '长电科技', leading_change: 9.98, heat_score: 88 },
  { name: 'CPO概念', limit_up_count: 6, up_count: 32, total: 38, leading_stock: '中际旭创', leading_change: 9.95, heat_score: 85 },
  { name: '数据要素', limit_up_count: 5, up_count: 28, total: 35, leading_stock: '人民网', leading_change: 9.90, heat_score: 80 },
];

// 沪深股通Top10
export const mockHsgtTop10 = {
  buy: [
    { rank: 1, code: '600519.SH', name: '贵州茅台', price: 1680.00, change: 0.90, amount: 15.8, net_amount: 8.5 },
    { rank: 2, code: '000858.SZ', name: '五粮液', price: 145.60, change: 9.97, amount: 12.5, net_amount: 6.8 },
    { rank: 3, code: '300750.SZ', name: '宁德时代', price: 165.80, change: 9.98, amount: 18.2, net_amount: 5.6 },
    { rank: 4, code: '000938.SZ', name: '中芯国际', price: 58.80, change: 10.01, amount: 8.5, net_amount: 4.2 },
    { rank: 5, code: '600036.SH', name: '招商银行', price: 32.50, change: -0.5, amount: 6.8, net_amount: 3.5 },
  ],
  sell: [
    { rank: 1, code: '601318.SH', name: '中国平安', price: 42.30, change: -1.2, amount: 8.5, net_amount: -5.2 },
    { rank: 2, code: '000001.SZ', name: '平安银行', price: 10.50, change: -0.8, amount: 6.2, net_amount: -4.8 },
    { rank: 3, code: '600276.SH', name: '恒瑞医药', price: 45.80, change: -0.5, amount: 5.8, net_amount: -3.5 },
    { rank: 4, code: '002415.SZ', name: '海康威视', price: 32.80, change: -0.3, amount: 4.5, net_amount: -2.8 },
    { rank: 5, code: '600887.SH', name: '伊利股份', price: 26.50, change: -0.2, amount: 3.8, net_amount: -2.2 },
  ]
};

// 新闻资讯
export const mockNews: NewsItem[] = [
  { id: '1', title: '央行宣布降准0.5个百分点，释放流动性约1万亿元', content: '中国人民银行决定下调金融机构存款准备金率0.5个百分点...', source: '财联社', publish_time: '2024-01-15 14:30:00', importance: 'high', related_stocks: ['600036.SH', '000001.SZ'], category: '宏观' },
  { id: '2', title: '贵州茅台发布2024年业绩预告，净利润同比增长15%', content: '贵州茅台公告，预计2024年实现净利润...', source: '证券时报', publish_time: '2024-01-15 14:25:00', importance: 'high', related_stocks: ['600519.SH'], category: '公司' },
  { id: '3', title: '半导体板块异动，多股涨停', content: '受国产替代加速影响，半导体板块今日表现强势...', source: '华尔街见闻', publish_time: '2024-01-15 14:20:00', importance: 'normal', related_stocks: ['000938.SZ', '600756.SH'], category: '行业' },
  { id: '4', title: '新能源车企1月销量超预期，产业链公司受益', content: '多家新能源车企公布1月销量数据，同比增长显著...', source: '中国证券报', publish_time: '2024-01-15 14:15:00', importance: 'normal', related_stocks: ['300750.SZ', '002594.SZ'], category: '行业' },
  { id: '5', title: 'AI大模型竞赛升温，算力需求持续增长', content: '随着ChatGPT等AI应用爆发，算力需求呈现爆发式增长...', source: '科技日报', publish_time: '2024-01-15 14:10:00', importance: 'normal', related_stocks: ['002230.SZ', '600756.SH'], category: '科技' },
];

// 股票列表
export const mockStocks: StockBasic[] = [
  { ts_code: '000001.SZ', symbol: '000001', name: '平安银行', industry: '银行', market: '主板', list_date: '19910403' },
  { ts_code: '000858.SZ', symbol: '000858', name: '五粮液', industry: '白酒', market: '主板', list_date: '19980427' },
  { ts_code: '002230.SZ', symbol: '002230', name: '科大讯飞', industry: '软件', market: '中小板', list_date: '20080512' },
  { ts_code: '300750.SZ', symbol: '300750', name: '宁德时代', industry: '新能源', market: '创业板', list_date: '20180611' },
  { ts_code: '600519.SH', symbol: '600519', name: '贵州茅台', industry: '白酒', market: '主板', list_date: '20010827' },
  { ts_code: '600036.SH', symbol: '600036', name: '招商银行', industry: '银行', market: '主板', list_date: '20020409' },
  { ts_code: '000938.SZ', symbol: '000938', name: '中芯国际', industry: '半导体', market: '主板', list_date: '20200716' },
  { ts_code: '600756.SH', symbol: '600756', name: '浪潮信息', industry: '计算机', market: '主板', list_date: '19960923' },
  { ts_code: '601318.SH', symbol: '601318', name: '中国平安', industry: '保险', market: '主板', list_date: '20070301' },
  { ts_code: '600276.SH', symbol: '600276', name: '恒瑞医药', industry: '医药', market: '主板', list_date: '20001018' },
];

// K线数据生成器
export function generateKLineData(days: number = 60): Array<{ date: string; open: number; high: number; low: number; close: number; volume: number }> {
  const data = [];
  let basePrice = 50;
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const change = (Math.random() - 0.48) * 4;
    basePrice = Math.max(10, basePrice * (1 + change / 100));
    
    const open = basePrice * (1 + (Math.random() - 0.5) * 0.02);
    const close = basePrice;
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = Math.floor(Math.random() * 1000000) + 500000;
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: volume
    });
  }
  
  return data;
}

// 分时数据生成器
export function generateTimeSeriesData(): Array<{ time: string; price: number; volume: number; avg_price: number }> {
  const data = [];
  let price = 50;
  const basePrice = 49.5;
  
  for (let hour = 9; hour <= 15; hour++) {
    for (let minute = (hour === 9 ? 30 : 0); minute < 60; minute += 1) {
      if (hour === 11 && minute > 30) continue;
      if (hour === 12) continue;
      if (hour === 15 && minute > 0) break;
      
      const change = (Math.random() - 0.5) * 0.2;
      price = Math.max(basePrice * 0.98, Math.min(basePrice * 1.02, price + change));
      
      data.push({
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        price: Number(price.toFixed(2)),
        volume: Math.floor(Math.random() * 10000) + 1000,
        avg_price: Number((basePrice * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2))
      });
    }
  }
  
  return data;
}

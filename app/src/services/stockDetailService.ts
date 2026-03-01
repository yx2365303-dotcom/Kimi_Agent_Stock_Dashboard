/**
 * 个股详情服务 — 从 stockService 按需导出
 */
export {
  // 接口类型
  type StockDetailBundle,
  type StockQuoteItem,
  // 数据获取函数
  fetchStockList,
  fetchStockListWithQuotes,
  fetchStockDetail,
  fetchRealtimeQuote,
  fetchKLineData,
  fetchStockFullDetail,
  fetchStockMoneyFlow,
  fetchTimeSeriesData,
  fetchStockDetailBundle,
  fetchMoneyFlow,
  fetchStrategies,
  saveStrategy,
  searchStocks,
} from './stockService';

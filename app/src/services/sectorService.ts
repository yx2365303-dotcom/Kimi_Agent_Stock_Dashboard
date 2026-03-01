/**
 * 板块热点服务 — 从 stockService 按需导出
 */
export {
  // 接口类型
  type SectorHeatBundle,
  type SectorMemberStock,
  type SectorMemberResult,
  type ThsHotItem,
  type SectorHotData,
  type HotStockData,
  // 数据获取函数
  fetchThsHot,
  fetchIndustryHotList,
  fetchConceptHotList,
  fetchHotStockList,
  fetchSectorHeatmapData,
  fetchSectorHeatBundle,
  fetchSectorCodeByName,
  fetchSectorMembers,
} from './stockService';

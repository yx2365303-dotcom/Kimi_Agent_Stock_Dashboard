import type { IndexData, StockBasic, SectorData, LimitUpData, MarketSentiment, DailyData, MoneyFlowData } from '@/types';
import {
  supabaseStock,
  supabaseNews,
  requestWithCache,
  logger,
  USE_MOCK_FALLBACK,
  isRpcTemporarilyDisabled,
  disableRpcTemporarily,
  clearRpcDisableFlag,
  shouldDisableRpcAfterError,
  getRecentTradeDates,
  stableStringify,
  mapWithConcurrency,
  fetchNewShareNames,
  getFormattedUpdateTime,
} from './serviceUtils';
import {
  mockIndices,
  mockUpDownDistribution,
  mockNorthFlow,
  mockSentiment,
  mockLimitUpList,
  mockSectors,
  mockKplConcepts,
  mockHsgtTop10,
  mockStocks,
  generateKLineData,
  generateTimeSeriesData
} from '@/data/mock';

// ===========================================
// 接口定义
// ===========================================

export interface NorthFlowPayload {
  net_inflow: number;
  sh_inflow: number;
  sz_inflow: number;
  cumulative_30d: number;
  cumulative_week?: number;
  change_from_yesterday?: number;
  change_percent?: number;
  sh_buy?: number;
  sh_sell?: number;
  sz_buy?: number;
  sz_sell?: number;
  time_series: { date: string; amount: number; hgt?: number; sgt?: number }[];
}

export interface UpDownDistributionPayload {
  up_count: number;
  down_count: number;
  flat_count: number;
  limit_up: number;
  limit_down: number;
  distribution: { range: string; count: number; color?: string; type?: 'limit_up' | 'up' | 'flat' | 'down' | 'limit_down' }[];
  lianbanStats?: {
    oneBoard: number;
    twoBoard: number;
    threeBoard: number;
    fourBoard: number;
    fivePlus: number;
  };
  zhabanCount?: number;
  fengbanRate?: number;
  topIndustries?: { name: string; count: number }[];
  maxLianban?: number;
  totalAttempts?: number;
}

export interface HsgtTop10PayloadItem {
  ts_code: string;
  name: string;
  amount: number;
  close: number;
  change: number;
  rank: number;
  market_type: string;
  net_amount: number | null;
}

export interface MarketOverviewBundle {
  indices: IndexData[];
  sectors: SectorData[];
  limitUpList: LimitUpData[];
  upDownDistribution: UpDownDistributionPayload | null;
  enhancedSentiment: EnhancedSentimentData | null;
  northFlow: NorthFlowPayload | null;
  hsgtTop10: HsgtTop10PayloadItem[];
  updateTime: string;
}

export interface SectorHeatBundle {
  heatmapData: { name: string; value: number; size: number; type: string }[];
  industryHotList: SectorHotData[];
  conceptHotList: SectorHotData[];
  hotStockList: HotStockData[];
  kplConcepts: Array<{
    ts_code?: string;
    name: string;
    limit_up_count: number;
    up_count: number;
    trade_date?: string;
    heat_score?: number;
    leading_stock?: string;
    leading_change?: number;
    total?: number;
  }>;
}

export interface StockDetailBundle {
  detail: Awaited<ReturnType<typeof fetchStockFullDetail>>;
  kLineData: Awaited<ReturnType<typeof fetchKLineData>>;
  moneyFlowData: Awaited<ReturnType<typeof fetchStockMoneyFlow>>;
  timeSeriesData: Awaited<ReturnType<typeof fetchTimeSeriesData>>;
}

// ===========================================
// 指数数据服务
// ===========================================

/**
 * 获取主要指数数据
 */
export async function fetchIndices(): Promise<IndexData[]> {
  try {
    const targetCodes = ['000001.SH', '399001.SZ', '399006.SZ', '000688.SH', '899050.BJ'];

    // 先获取指数基础信息
    const { data: indexBasicData, error: basicError } = await supabaseStock
      .from('index_basic')
      .select('ts_code, name')
      .in('ts_code', targetCodes);

    if (basicError) {
      logger.warn('获取指数基础信息失败:', basicError);
    }

    const nameMap = new Map<string, string>();
    if (indexBasicData) {
      indexBasicData.forEach((item: { ts_code: string; name: string }) => {
        nameMap.set(item.ts_code, item.name);
      });
    }

    // 直接查询最新的指数日线数据（按日期降序，取每个指数的最新一条）
    const { data, error } = await supabaseStock
      .from('index_daily')
      .select('ts_code, trade_date, close, open, change, pct_chg, vol, amount, high, low, pre_close')
      .in('ts_code', targetCodes)
      .order('trade_date', { ascending: false })
      .limit(20); // 获取足够多的数据以确保每个指数都有

    if (error) {
      logger.warn('查询指数日线数据失败:', error);
      if (USE_MOCK_FALLBACK) return mockIndices;
      return [];
    }

    if (data && data.length > 0) {
      // 按 ts_code 分组，取每个指数最新的一条
      type IndexDailyRow = {
        ts_code: string;
        trade_date: string;
        close: number;
        open: number;
        change: number;
        pct_chg: number;
        vol: number;
        amount: number;
        high: number;
        low: number;
        pre_close: number;
      };
      const typedData = data as IndexDailyRow[];
      const latestByCode = new Map<string, IndexDailyRow>();
      typedData.forEach(item => {
        if (!latestByCode.has(item.ts_code)) {
          latestByCode.set(item.ts_code, item);
        }
      });

      logger.log(`获取到 ${latestByCode.size} 个指数的最新数据，日期: ${typedData[0].trade_date}`);

      return Array.from(latestByCode.values()).map((item: {
        ts_code: string;
        close: number;
        open: number;
        change: number;
        pct_chg: number;
        vol: number;
        amount: number;
        high: number;
        low: number;
        pre_close: number;
      }) => ({
        code: item.ts_code,
        name: nameMap.get(item.ts_code) || item.ts_code,
        current: item.close || 0,
        change: item.change || 0,
        pct_change: item.pct_chg || 0,
        volume: item.vol || 0,
        amount: item.amount || 0,
        high: item.high || 0,
        low: item.low || 0,
        open: item.open || 0,
        pre_close: item.pre_close || 0
      }));
    }

    logger.warn('未找到指数日线数据，使用模拟数据');
    if (USE_MOCK_FALLBACK) return mockIndices;
    return [];
  } catch (error) {
    logger.error('获取指数数据失败:', error);
    if (USE_MOCK_FALLBACK) return mockIndices;
    return [];
  }
}

// ===========================================
// 板块数据服务（使用同花顺板块数据）
// ===========================================

/**
 * 获取热门板块数据
 * 使用 ths_index（板块基础信息）和 ths_daily（板块日线）
 */
export async function fetchHotSectors(limit = 10): Promise<SectorData[]> {
  try {
    // 获取涨幅板块
    const { data: upData, error: upError } = await supabaseStock
      .from('ths_daily')
      .select('ts_code, trade_date, pct_change, vol, close, turnover_rate')
      .order('trade_date', { ascending: false })
      .order('pct_change', { ascending: false })
      .limit(200);

    // 获取跌幅板块
    const { data: downData, error: downError } = await supabaseStock
      .from('ths_daily')
      .select('ts_code, trade_date, pct_change, vol, close, turnover_rate')
      .order('trade_date', { ascending: false })
      .order('pct_change', { ascending: true })
      .limit(200);

    if (upError || downError) {
      logger.warn('查询板块日线失败:', upError || downError);
      if (USE_MOCK_FALLBACK) return mockSectors.slice(0, limit);
      return [];
    }

    if ((!upData || upData.length === 0) && (!downData || downData.length === 0)) {
      logger.warn('未找到板块日线数据，使用模拟数据');
      if (USE_MOCK_FALLBACK) return mockSectors.slice(0, limit);
      return [];
    }

    // 合并涨跌数据
    type ThsDailyRow = { ts_code: string; trade_date: string; pct_change: number; vol: number; close: number; turnover_rate: number };
    const typedUpData = (upData || []) as ThsDailyRow[];
    const typedDownData = (downData || []) as ThsDailyRow[];
    const allData = [...typedUpData, ...typedDownData];
    const latestDate = allData[0]?.trade_date;

    // 去重并筛选最新日期
    const seenCodes = new Set<string>();
    const latestData = allData
      .filter(item => {
        if (item.trade_date !== latestDate || seenCodes.has(item.ts_code)) {
          return false;
        }
        seenCodes.add(item.ts_code);
        return true;
      });

    logger.log(`板块数据: 涨幅 ${typedUpData.filter(d => d.trade_date === latestDate).length} 条, 跌幅 ${typedDownData.filter(d => d.trade_date === latestDate).length} 条, 去重后 ${latestData.length} 条`);

    // 只查询这些板块的基础信息
    const tsCodes = latestData.map(item => item.ts_code);
    const { data: sectorBasic, error: basicError } = await supabaseStock
      .from('ths_index')
      .select('ts_code, name, count, type')
      .in('ts_code', tsCodes);

    if (basicError) {
      logger.warn('获取板块基础信息失败:', basicError);
    }

    const basicMap = new Map<string, { name: string; count: number; type: string }>();
    if (sectorBasic) {
      sectorBasic.forEach((item: { ts_code: string; name: string; count: number; type: string }) => {
        basicMap.set(item.ts_code, { name: item.name, count: item.count, type: item.type });
      });
    }

    // 尝试从 kpl_concept 获取涨停数据
    const { data: kplData } = await supabaseStock
      .from('kpl_concept')
      .select('name, z_t_num, up_num')
      .eq('trade_date', latestDate);

    const kplMap = new Map<string, { z_t_num: number; up_num: number }>();
    if (kplData) {
      kplData.forEach((item: { name: string; z_t_num: number; up_num: string | number }) => {
        // up_num 可能是字符串，需要转换
        const upNum = typeof item.up_num === 'string' ? parseInt(item.up_num) || 0 : item.up_num || 0;
        kplMap.set(item.name, { z_t_num: item.z_t_num || 0, up_num: upNum });
      });
    }

    // 从 limit_list_ths 获取涨停股票的概念，按概念统计涨停数
    const { data: limitThsData } = await supabaseStock
      .from('limit_list_ths')
      .select('lu_desc')
      .eq('trade_date', latestDate);

    // 按概念统计涨停数量
    const conceptLimitUpMap = new Map<string, number>();
    if (limitThsData) {
      limitThsData.forEach((item: { lu_desc: string }) => {
        if (item.lu_desc) {
          const concepts = item.lu_desc.split('+');
          concepts.forEach(c => {
            const concept = c.trim();
            if (concept) {
              conceptLimitUpMap.set(concept, (conceptLimitUpMap.get(concept) || 0) + 1);
            }
          });
        }
      });
    }

    // 从 limit_list_d 按行业统计跌停数
    const { data: limitData } = await supabaseStock
      .from('limit_list_d')
      .select('industry, limit')
      .eq('trade_date', latestDate)
      .eq('limit', 'D');

    // 按行业统计跌停数量
    const industryLimitDownMap = new Map<string, number>();
    if (limitData) {
      limitData.forEach((item: { industry: string; limit: string }) => {
        const industry = item.industry || '其他';
        industryLimitDownMap.set(industry, (industryLimitDownMap.get(industry) || 0) + 1);
      });
    }

    logger.log(`使用交易日 ${latestDate} 的板块数据`);
    logger.log(`板块数据匹配: ${latestData.length} 个板块, ${basicMap.size} 个基础信息, ${conceptLimitUpMap.size} 个涨停概念, ${industryLimitDownMap.size} 个跌停行业`);

    // 辅助函数：尝试匹配板块名称到概念（涨停）
    const matchLimitUp = (sectorName: string): number => {
      // 精确匹配
      if (conceptLimitUpMap.has(sectorName)) {
        return conceptLimitUpMap.get(sectorName)!;
      }
      // 模糊匹配
      const cleanSector = sectorName.replace(/行业|板块|概念|指数|\(A股\)|\(港股\)/g, '').trim();
      for (const [concept, count] of conceptLimitUpMap.entries()) {
        if (cleanSector && (cleanSector.includes(concept) || concept.includes(cleanSector))) {
          return count;
        }
      }
      return 0;
    };

    // 辅助函数：尝试匹配板块名称到行业（跌停）
    const matchLimitDown = (sectorName: string): number => {
      // 精确匹配
      if (industryLimitDownMap.has(sectorName)) {
        return industryLimitDownMap.get(sectorName)!;
      }
      // 模糊匹配
      const cleanSector = sectorName.replace(/行业|板块|概念|指数|\(A股\)|\(港股\)/g, '').trim();
      for (const [industry, count] of industryLimitDownMap.entries()) {
        const cleanIndustry = industry.replace(/行业|板块|概念|指数/g, '').trim();
        if (cleanSector && cleanIndustry && (cleanSector.includes(cleanIndustry) || cleanIndustry.includes(cleanSector))) {
          return count;
        }
      }
      return 0;
    };

    return latestData.map((item: { ts_code: string; pct_change: number; vol: number; close: number; turnover_rate: number }) => {
      const basic = basicMap.get(item.ts_code);
      const sectorName = basic?.name || item.ts_code;
      const kplInfo = kplMap.get(sectorName);
      const limitUpCount = matchLimitUp(sectorName);
      const limitDownCount = matchLimitDown(sectorName);

      // 根据涨跌幅和成交量估算资金净流入（成交量单位：手，转换为亿元）
      // vol 单位是手（100股），需要换算：vol * 平均价格 / 100000000
      const avgPrice = item.close || 10; // 使用收盘价作为平均价格估算
      const estimatedNetInflow = (item.vol || 0) * avgPrice * (item.pct_change || 0) / 100 / 100000000;

      return {
        ts_code: item.ts_code,
        name: sectorName,
        pct_change: item.pct_change || 0,
        volume: item.vol || 0,
        amount: 0,
        up_count: kplInfo?.up_num || 0,
        down_count: limitDownCount,
        limit_up_count: limitUpCount || kplInfo?.z_t_num || 0,
        net_inflow: estimatedNetInflow,
        heat_score: 50 + (item.pct_change || 0) * 10,
        turnover_rate: item.turnover_rate || 0
      };
    });
  } catch (error) {
    logger.error('获取板块数据失败:', error);
    if (USE_MOCK_FALLBACK) return mockSectors.slice(0, limit);
    return [];
  }
}

/**
 * 获取所有板块数据（分类）
 */
export async function fetchAllSectors(sectorType?: 'industry' | 'concept' | 'region'): Promise<SectorData[]> {
  try {
    // 映射类型：industry -> I, concept -> N
    const typeMap: Record<string, string> = {
      'industry': 'I',
      'concept': 'N'
    };

    let query = supabaseStock
      .from('ths_index')
      .select('ts_code, name, count, type');

    if (sectorType && typeMap[sectorType]) {
      query = query.eq('type', typeMap[sectorType]);
    } else {
      query = query.in('type', ['N', 'I']);
    }

    const { data: basicData, error: basicError } = await query;

    if (basicError) {
      logger.warn('获取所有板块失败:', basicError);
      if (USE_MOCK_FALLBACK) return mockSectors;
      return [];
    }

    if (!basicData || basicData.length === 0) {
      if (USE_MOCK_FALLBACK) return mockSectors;
      return [];
    }

    // 获取日线数据
    const recentDates = getRecentTradeDates(3);
    const tsCodes = basicData.map((s: { ts_code: string }) => s.ts_code);

    for (const tradeDate of recentDates) {
      const { data: dailyData } = await supabaseStock
        .from('ths_daily')
        .select('ts_code, pct_change, vol')
        .in('ts_code', tsCodes.slice(0, 300))
        .eq('trade_date', tradeDate);

      if (dailyData && dailyData.length > 0) {
        const dailyMap = new Map<string, { pct_change: number; vol: number }>();
        dailyData.forEach((item: { ts_code: string; pct_change: number; vol: number }) => {
          dailyMap.set(item.ts_code, { pct_change: item.pct_change, vol: item.vol });
        });

        return basicData.map((item: { ts_code: string; name: string; count: number; type: string }) => {
          const daily = dailyMap.get(item.ts_code);
          return {
            ts_code: item.ts_code,
            name: item.name,
            pct_change: daily?.pct_change || 0,
            volume: daily?.vol || 0,
            amount: 0,
            up_count: 0,
            down_count: 0,
            limit_up_count: 0,
            net_inflow: 0,
            heat_score: 50
          };
        });
      }
    }

    // 返回基础数据（无涨跌幅）
    return basicData.map((item: { ts_code: string; name: string; count: number; type: string }) => ({
      ts_code: item.ts_code,
      name: item.name,
      pct_change: 0,
      volume: 0,
      amount: 0,
      up_count: 0,
      down_count: 0,
      limit_up_count: 0,
      net_inflow: 0,
      heat_score: 50
    }));
  } catch (error) {
    logger.error('获取所有板块数据失败:', error);
    if (USE_MOCK_FALLBACK) return mockSectors;
    return [];
  }
}

// ===========================================
// 涨跌停数据服务（使用 limit_list_d 表）
// ===========================================

/**
 * 获取涨停板数据
 */
export async function fetchLimitUpList(limit = 20): Promise<LimitUpData[]> {
  try {
    // 直接查询最新的涨停数据
    const { data, error } = await supabaseStock
      .from('limit_list_d')
      .select('ts_code, name, trade_date, close, pct_chg, limit_amount, first_time, last_time, open_times, limit_times, industry')
      .eq('limit', 'U')
      .order('trade_date', { ascending: false })
      .order('first_time')
      .limit(100); // 获取足够多的数据

    if (error) {
      logger.warn('查询涨停数据失败:', error);
      if (USE_MOCK_FALLBACK) return mockLimitUpList.slice(0, limit);
      return [];
    }

    if (data && data.length > 0) {
      // 获取最新日期的数据
      type LimitListRow = {
        ts_code: string;
        name: string;
        trade_date: string;
        close: number;
        pct_chg: number;
        limit_amount: number | null;
        first_time: string;
        last_time: string;
        open_times: number;
        limit_times: number;
        industry: string;
      };
      const typedData = data as LimitListRow[];
      const latestDate = typedData[0].trade_date;
      const latestData = typedData.filter(item => item.trade_date === latestDate).slice(0, limit);

      logger.log(`使用交易日 ${latestDate} 的涨停数据，共 ${latestData.length} 条`);
      return latestData.map((item: {
        ts_code: string;
        name: string;
        trade_date: string;
        close: number;
        pct_chg: number;
        limit_amount: number | null;
        first_time: string;
        last_time: string;
        open_times: number;
        limit_times: number;
        industry: string;
      }) => ({
        ts_code: item.ts_code,
        name: item.name || '',
        trade_date: item.trade_date,
        close: item.close || 0,
        pct_chg: item.pct_chg || 0,
        limit_amount: item.limit_amount || 0,
        first_time: item.first_time || '',
        last_time: item.last_time || '',
        open_times: item.open_times || 0,
        limit_times: item.limit_times || 0,
        tag: item.industry || '',
        theme: ''
      }));
    }

    logger.warn('未找到涨停数据，使用模拟数据');
    if (USE_MOCK_FALLBACK) return mockLimitUpList.slice(0, limit);
    return [];
  } catch (error) {
    logger.error('获取涨停数据失败:', error);
    if (USE_MOCK_FALLBACK) return mockLimitUpList.slice(0, limit);
    return [];
  }
}

/**
 * 获取跌停板数据
 */
export async function fetchLimitDownList(limit = 20): Promise<LimitUpData[]> {
  try {
    // 直接查询最新的跌停数据
    const { data, error } = await supabaseStock
      .from('limit_list_d')
      .select('ts_code, name, trade_date, close, pct_chg, limit_amount, first_time, last_time, open_times, limit_times, industry')
      .eq('limit', 'D')
      .order('trade_date', { ascending: false })
      .order('first_time')
      .limit(100);

    if (error) {
      logger.warn('查询跌停数据失败:', error);
      return [];
    }

    if (data && data.length > 0) {
      type LimitListRow = {
        ts_code: string;
        name: string;
        trade_date: string;
        close: number;
        pct_chg: number;
        limit_amount: number | null;
        first_time: string;
        last_time: string;
        open_times: number;
        limit_times: number;
        industry: string;
      };
      const typedData = data as LimitListRow[];
      const latestDate = typedData[0].trade_date;
      const latestData = typedData.filter(item => item.trade_date === latestDate).slice(0, limit);

      logger.log(`使用交易日 ${latestDate} 的跌停数据`);
      return latestData.map((item: {
        ts_code: string;
        name: string;
        trade_date: string;
        close: number;
        pct_chg: number;
        limit_amount: number | null;
        first_time: string;
        last_time: string;
        open_times: number;
        limit_times: number;
        industry: string;
      }) => ({
        ts_code: item.ts_code,
        name: item.name || '',
        trade_date: item.trade_date,
        close: item.close || 0,
        pct_chg: item.pct_chg || 0,
        limit_amount: item.limit_amount || 0,
        first_time: item.first_time || '',
        last_time: item.last_time || '',
        open_times: item.open_times || 0,
        limit_times: item.limit_times || 0,
        tag: item.industry || '',
        theme: ''
      }));
    }

    return [];
  } catch (error) {
    logger.error('获取跌停数据失败:', error);
    return [];
  }
}

// ===========================================
// 市场统计服务
// ===========================================

/**
 * 获取涨跌分布数据（增强版）
 * 优先走 RPC get_up_down_distribution（数据库端聚合），失败时降级前端聚合
 */
export async function fetchUpDownDistribution(): Promise<UpDownDistributionPayload | null> {
  try {
    // 优先尝试 RPC（数据库侧聚合，仅返回一行聚合结果，避免 5000+ 行全量传输）
    const rpcName = 'get_up_down_distribution';
    if (!isRpcTemporarilyDisabled(rpcName)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rpcData, error: rpcError } = await (supabaseStock as any).rpc(rpcName);
        if (!rpcError && rpcData) {
          clearRpcDisableFlag(rpcName);
          const payload = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
          return {
            up_count: payload.up_count || 0,
            down_count: payload.down_count || 0,
            flat_count: payload.flat_count || 0,
            limit_up: payload.limit_up || 0,
            limit_down: payload.limit_down || 0,
            distribution: Array.isArray(payload.distribution) ? payload.distribution : [],
            lianbanStats: payload.lianbanStats || { oneBoard: 0, twoBoard: 0, threeBoard: 0, fourBoard: 0, fivePlus: 0 },
            zhabanCount: payload.zhabanCount || 0,
            fengbanRate: payload.fengbanRate || 0,
            topIndustries: Array.isArray(payload.topIndustries) ? payload.topIndustries : [],
            maxLianban: payload.maxLianban || 0,
            totalAttempts: payload.totalAttempts || 0
          };
        }
        if (rpcError && shouldDisableRpcAfterError(rpcError)) {
          disableRpcTemporarily(rpcName);
        }
      } catch (rpcErr) {
        if (shouldDisableRpcAfterError(rpcErr)) {
          disableRpcTemporarily(rpcName);
        }
        logger.warn('RPC get_up_down_distribution 调用失败，降级前端聚合:', rpcErr);
      }
    }

    // 降级：前端聚合（原逻辑）
    const { data: latestData } = await supabaseStock
      .from('limit_list_d')
      .select('trade_date')
      .order('trade_date', { ascending: false })
      .limit(1);

    if (!latestData || latestData.length === 0) {
      if (USE_MOCK_FALLBACK) return mockUpDownDistribution;
      return null;
    }

    const latestDate = (latestData as { trade_date: string }[])[0].trade_date;

    const { data: dailyLatest } = await supabaseStock
      .from('daily')
      .select('trade_date')
      .order('trade_date', { ascending: false })
      .limit(1);

    const dailyDate = (dailyLatest as { trade_date: string }[] | null)?.[0]?.trade_date || latestDate;

    const { data: allDailyData } = await supabaseStock
      .from('daily')
      .select('pct_chg')
      .eq('trade_date', dailyDate);

    let up_count = 0;
    let down_count = 0;
    let flat_count = 0;

    const distribution = [
      { range: '涨停', count: 0, color: '#ef4444' },
      { range: '7-10%', count: 0, color: '#f87171' },
      { range: '5-7%', count: 0, color: '#fb923c' },
      { range: '3-5%', count: 0, color: '#fbbf24' },
      { range: '1-3%', count: 0, color: '#a3e635' },
      { range: '0-1%', count: 0, color: '#4ade80' },
      { range: '平', count: 0, color: '#9ca3af' },
      { range: '-1-0%', count: 0, color: '#38bdf8' },
      { range: '-3--1%', count: 0, color: '#60a5fa' },
      { range: '-5--3%', count: 0, color: '#818cf8' },
      { range: '-7--5%', count: 0, color: '#a78bfa' },
      { range: '-10--7%', count: 0, color: '#c084fc' },
      { range: '跌停', count: 0, color: '#22c55e' }
    ];

    if (allDailyData && allDailyData.length > 0) {
      allDailyData.forEach((item: { pct_chg: number }) => {
        const pct = item.pct_chg || 0;
        if (pct > 0) up_count++;
        else if (pct < 0) down_count++;
        else flat_count++;

        if (pct >= 9.9) distribution[0].count++;
        else if (pct >= 7) distribution[1].count++;
        else if (pct >= 5) distribution[2].count++;
        else if (pct >= 3) distribution[3].count++;
        else if (pct >= 1) distribution[4].count++;
        else if (pct > 0) distribution[5].count++;
        else if (pct === 0) distribution[6].count++;
        else if (pct > -1) distribution[7].count++;
        else if (pct > -3) distribution[8].count++;
        else if (pct > -5) distribution[9].count++;
        else if (pct > -7) distribution[10].count++;
        else if (pct > -9.9) distribution[11].count++;
        else distribution[12].count++;
      });
    }

    const { data: allLimitData } = await supabaseStock
      .from('limit_list_d')
      .select('ts_code, name, limit_times, open_times, industry, limit_amount, first_time, limit')
      .eq('trade_date', latestDate);

    const limitUpList = (allLimitData || []).filter((d: { limit: string }) => d.limit === 'U');
    const limitDownList = (allLimitData || []).filter((d: { limit: string }) => d.limit === 'D');
    const zhabanList = (allLimitData || []).filter((d: { limit: string }) => d.limit === 'Z');

    const lianbanStats = { oneBoard: 0, twoBoard: 0, threeBoard: 0, fourBoard: 0, fivePlus: 0 };
    limitUpList.forEach((item: { limit_times: number }) => {
      const times = item.limit_times || 1;
      if (times === 1) lianbanStats.oneBoard++;
      else if (times === 2) lianbanStats.twoBoard++;
      else if (times === 3) lianbanStats.threeBoard++;
      else if (times === 4) lianbanStats.fourBoard++;
      else lianbanStats.fivePlus++;
    });

    const totalAttempts = limitUpList.length + zhabanList.length;
    const zhabanCount = zhabanList.length;
    const fengbanRate = totalAttempts > 0 ? ((totalAttempts - zhabanCount) / totalAttempts * 100) : 0;

    const industryMap = new Map<string, number>();
    limitUpList.forEach((item: { industry: string }) => {
      const industry = item.industry || '其他';
      industryMap.set(industry, (industryMap.get(industry) || 0) + 1);
    });

    const topIndustries = Array.from(industryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    const maxLianban = Math.max(...limitUpList.map((item: { limit_times: number }) => item.limit_times || 1), 0);

    return {
      up_count, down_count, flat_count,
      limit_up: limitUpList.length, limit_down: limitDownList.length,
      distribution, lianbanStats, zhabanCount, fengbanRate,
      topIndustries, maxLianban, totalAttempts
    };
  } catch (error) {
    logger.error('获取涨跌分布失败:', error);
    if (USE_MOCK_FALLBACK) return mockUpDownDistribution;
    return null;
  }
}

/**
 * 增强版市场情绪数据类型
 */
export interface EnhancedSentimentData {
  // 情绪仪表盘
  sentiment: {
    score: number;        // 0-100 综合得分
    label: string;        // 标签：极度恐惧/恐惧/中性/贪婪/极度贪婪
    trend: 'up' | 'down' | 'flat';  // 相比昨日趋势
  };

  // 市场温度计
  thermometer: {
    upCount: number;
    downCount: number;
    flatCount: number;
    limitUp: number;
    limitDown: number;
    upRatio: number;      // 上涨占比 (0-100)
  };

  // 资金活跃度
  capital: {
    totalAmount: number;      // 今日成交额（亿）
    amountChange: number;     // 较昨日变化%
    avgTurnover: number;      // 平均换手率
    northFlow: number;        // 北向净流入（亿）
  };

  // 连板/炸板统计
  limitStats: {
    lianbanStats: {
      oneBoard: number;
      twoBoard: number;
      threeBoard: number;
      fourBoard: number;
      fivePlus: number;
    };
    zhabanCount: number;
    fengbanRate: number;
    maxLianban: number;
    topIndustries: { name: string; count: number }[];
  };
}

function buildEnhancedSentiment(
  distribution: UpDownDistributionPayload | null,
  northFlowData: NorthFlowPayload | null,
  dailyAmountData: { totalAmount: number; amountChange: number; avgTurnover: number } | null
): EnhancedSentimentData | null {
  if (!distribution) {
    return null;
  }

  const {
    up_count,
    down_count,
    flat_count,
    limit_up,
    limit_down,
    lianbanStats,
    zhabanCount,
    fengbanRate,
    maxLianban,
    topIndustries,
  } = distribution;

  const totalStocks = up_count + down_count + flat_count;
  const upRatio = totalStocks > 0 ? (up_count / totalStocks) * 100 : 50;
  const limitRatio = (limit_up + limit_down) > 0 ? (limit_up / (limit_up + limit_down)) * 100 : 50;
  const fengRate = fengbanRate || 50;

  const score = Math.round(upRatio * 0.4 + limitRatio * 0.3 + fengRate * 0.3);
  const clampedScore = Math.min(100, Math.max(0, score));

  let label = '中性';
  if (clampedScore >= 80) label = '极度贪婪';
  else if (clampedScore >= 65) label = '贪婪';
  else if (clampedScore >= 55) label = '偏多';
  else if (clampedScore <= 20) label = '极度恐惧';
  else if (clampedScore <= 35) label = '恐惧';
  else if (clampedScore <= 45) label = '偏空';

  const trend: 'up' | 'down' | 'flat' = upRatio > 55 ? 'up' : upRatio < 45 ? 'down' : 'flat';

  return {
    sentiment: {
      score: clampedScore,
      label,
      trend,
    },
    thermometer: {
      upCount: up_count,
      downCount: down_count,
      flatCount: flat_count,
      limitUp: limit_up,
      limitDown: limit_down,
      upRatio: Math.round(upRatio),
    },
    capital: {
      totalAmount: dailyAmountData?.totalAmount || 0,
      amountChange: dailyAmountData?.amountChange || 0,
      avgTurnover: dailyAmountData?.avgTurnover || 0,
      northFlow: northFlowData?.net_inflow || 0,
    },
    limitStats: {
      lianbanStats: lianbanStats || { oneBoard: 0, twoBoard: 0, threeBoard: 0, fourBoard: 0, fivePlus: 0 },
      zhabanCount: zhabanCount || 0,
      fengbanRate: fengbanRate || 0,
      maxLianban: maxLianban || 0,
      topIndustries: topIndustries || [],
    },
  };
}

/**
 * 获取增强版市场情绪数据（多维度）
 */
export async function fetchEnhancedSentiment(params?: {
  distribution?: UpDownDistributionPayload | null;
  northFlowData?: NorthFlowPayload | null;
  dailyAmountData?: { totalAmount: number; amountChange: number; avgTurnover: number } | null;
  signal?: AbortSignal;
}): Promise<EnhancedSentimentData | null> {
  try {
    const [distribution, northFlowData, dailyAmountData] = await Promise.all([
      params?.distribution !== undefined ? params.distribution : fetchUpDownDistribution(),
      params?.northFlowData !== undefined ? params.northFlowData : fetchNorthFlow(2),
      params?.dailyAmountData !== undefined ? params.dailyAmountData : fetchDailyTotalAmount(params?.signal),
    ]);

    const sentiment = buildEnhancedSentiment(distribution as UpDownDistributionPayload | null, northFlowData as NorthFlowPayload | null, dailyAmountData);
    if (!sentiment) {
      logger.warn('无法获取涨跌分布数据');
      return null;
    }

    return sentiment;
  } catch (error) {
    logger.error('获取增强版市场情绪失败:', error);
    return null;
  }
}

/**
 * 获取每日成交额统计
 * 优先走 RPC get_daily_total_amount（数据库端 SUM/AVG），失败时降级前端聚合
 */
async function fetchDailyTotalAmount(signal?: AbortSignal): Promise<{ totalAmount: number; amountChange: number; avgTurnover: number } | null> {
  try {
    // 优先尝试 RPC（数据库侧聚合，避免传输约 10000 行 amount 数据）
    const rpcName = 'get_daily_total_amount';
    if (!isRpcTemporarilyDisabled(rpcName)) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let rpcQuery = (supabaseStock as any).rpc(rpcName);
        if (signal && typeof rpcQuery?.abortSignal === 'function') {
          rpcQuery = rpcQuery.abortSignal(signal);
        }
        const { data: rpcData, error: rpcError } = await rpcQuery;
        if (!rpcError && rpcData) {
          clearRpcDisableFlag(rpcName);
          const payload = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
          return {
            totalAmount: Number(payload.totalAmount) || 0,
            amountChange: Number(payload.amountChange) || 0,
            avgTurnover: Number(payload.avgTurnover) || 0
          };
        }
        if (rpcError && shouldDisableRpcAfterError(rpcError)) {
          disableRpcTemporarily(rpcName);
        }
      } catch (rpcErr) {
        if (shouldDisableRpcAfterError(rpcErr)) {
          disableRpcTemporarily(rpcName);
        }
        logger.warn('RPC get_daily_total_amount 调用失败，降级前端聚合:', rpcErr);
      }
    }

    // 降级：前端聚合（原逻辑）
    const requestSignal = signal ?? new AbortController().signal;

    const { data: latestDates } = await supabaseStock
      .from('daily')
      .select('trade_date')
      .abortSignal(requestSignal)
      .order('trade_date', { ascending: false })
      .limit(1);

    if (!latestDates || latestDates.length === 0) return null;

    const latestDate = (latestDates as { trade_date: string }[])[0].trade_date;

    const { data: todayData } = await supabaseStock
      .from('daily')
      .select('amount')
      .abortSignal(requestSignal)
      .eq('trade_date', latestDate);

    const totalAmount = todayData
      ? (todayData as { amount: number }[]).reduce((sum, item) => sum + (item.amount || 0), 0) / 100000000
      : 0;

    const prevDate = getPreviousTradingDate(latestDate);
    const { data: prevData } = await supabaseStock
      .from('daily')
      .select('amount')
      .abortSignal(requestSignal)
      .eq('trade_date', prevDate);

    const prevAmount = prevData
      ? (prevData as { amount: number }[]).reduce((sum, item) => sum + (item.amount || 0), 0) / 100000000
      : 0;

    const amountChange = prevAmount > 0 ? ((totalAmount - prevAmount) / prevAmount) * 100 : 0;

    let avgTurnover = 0;
    try {
      const { data: turnoverData, error: turnoverError } = await supabaseStock
        .from('daily_basic')
        .select('turnover_rate')
        .abortSignal(requestSignal)
        .eq('trade_date', latestDate)
        .not('turnover_rate', 'is', null)
        .limit(1000);

      if (!turnoverError && turnoverData && turnoverData.length > 0) {
        const validData = (turnoverData as { turnover_rate: number }[]).filter(item => item.turnover_rate > 0);
        if (validData.length > 0) {
          avgTurnover = validData.reduce((sum, item) => sum + item.turnover_rate, 0) / validData.length;
        }
      }
    } catch (err) {
      logger.warn('获取平均换手率失败:', err);
    }

    return { totalAmount, amountChange, avgTurnover };
  } catch (error) {
    logger.error('获取成交额统计失败:', error);
    return null;
  }
}

/**
 * 获取前一个交易日期（简化版）
 */
function getPreviousTradingDate(dateStr: string): string {
  // YYYYMMDD 格式
  const year = parseInt(dateStr.slice(0, 4));
  const month = parseInt(dateStr.slice(4, 6)) - 1;
  const day = parseInt(dateStr.slice(6, 8));

  const date = new Date(year, month, day);
  date.setDate(date.getDate() - 1);

  // 跳过周末
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() - 1);
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}${m}${d}`;
}

/**
 * 获取市场情绪数据（保留旧接口兼容）
 */
export async function fetchMarketSentiment(): Promise<MarketSentiment | null> {
  try {
    const enhanced = await fetchEnhancedSentiment();

    if (enhanced) {
      return {
        overall: enhanced.sentiment.score,
        label: enhanced.sentiment.label,
        up_down_ratio: enhanced.thermometer.upCount / Math.max(enhanced.thermometer.downCount, 1),
        avg_change: 0,
        limit_up_success_rate: enhanced.limitStats.fengbanRate
      };
    }

    if (USE_MOCK_FALLBACK) return mockSentiment;
    return null;
  } catch (error) {
    logger.error('获取市场情绪失败:', error);
    if (USE_MOCK_FALLBACK) return mockSentiment;
    return null;
  }
}

// ===========================================
// 北向资金服务（使用 hsgt_top10 表）
// ===========================================

/**
 * 获取北向资金数据
 * 使用 moneyflow_hsgt 表（沪深港通资金流向）
 */
export async function fetchNorthFlow(days = 30): Promise<NorthFlowPayload | null> {
  try {
    const { data, error } = await supabaseStock
      .from('moneyflow_hsgt')
      .select('trade_date, hgt, sgt, north_money, south_money')
      .order('trade_date', { ascending: false })
      .limit(days);

    if (error) {
      logger.warn('获取北向资金数据失败:', error);
      if (USE_MOCK_FALLBACK) return mockNorthFlow;
      return null;
    }

    if (data && data.length > 0) {
      type MoneyflowHsgtRow = {
        trade_date: string;
        hgt: string;
        sgt: string;
        north_money: string;
        south_money: string;
      };
      const typedData = data as MoneyflowHsgtRow[];
      logger.log(`获取到 ${typedData.length} 条北向资金数据，最新日期: ${typedData[0].trade_date}`);

      // 数据是按日期降序的，需要反转为升序用于图表显示
      const sortedData = [...typedData].reverse();

      // 转换为时间序列（金额单位：万元 -> 亿元）
      const timeSeries = sortedData.map(item => ({
        date: item.trade_date.slice(4, 6) + '-' + item.trade_date.slice(6, 8), // YYYYMMDD -> MM-DD
        amount: parseFloat(item.north_money) / 10000, // 万元转亿元
        hgt: parseFloat(item.hgt) / 10000,
        sgt: parseFloat(item.sgt) / 10000
      }));

      // 最新一天的数据
      const latest = typedData[0];
      const latestNorthMoney = parseFloat(latest.north_money) / 10000; // 亿元
      const latestHgt = parseFloat(latest.hgt) / 10000; // 沪股通，亿元
      const latestSgt = parseFloat(latest.sgt) / 10000; // 深股通，亿元

      // 计算30日累计（取时间序列中的数据求和）
      const cumulative = timeSeries.reduce((sum, item) => sum + item.amount, 0);

      // 计算本周累计（最近5个交易日）
      const weekData = typedData.slice(0, 5);
      const weekCumulative = weekData.reduce((sum, item) => sum + parseFloat(item.north_money) / 10000, 0);

      // 计算昨日数据用于对比
      const yesterday = typedData[1];
      const yesterdayNorthMoney = yesterday ? parseFloat(yesterday.north_money) / 10000 : 0;
      const changeFromYesterday = latestNorthMoney - yesterdayNorthMoney;
      const changePercent = yesterdayNorthMoney !== 0 ? (changeFromYesterday / Math.abs(yesterdayNorthMoney)) * 100 : 0;

      // 计算沪股通和深股通的买入卖出（这里用净额的正负来模拟，实际数据可能需要更详细的表）
      // 假设净额为正表示买入大于卖出，净额为负表示卖出大于买入
      const shBuy = latestHgt > 0 ? latestHgt : 0;
      const shSell = latestHgt < 0 ? Math.abs(latestHgt) : 0;
      const szBuy = latestSgt > 0 ? latestSgt : 0;
      const szSell = latestSgt < 0 ? Math.abs(latestSgt) : 0;

      return {
        net_inflow: latestNorthMoney,
        sh_inflow: latestHgt,
        sz_inflow: latestSgt,
        cumulative_30d: cumulative,
        cumulative_week: weekCumulative,
        change_from_yesterday: changeFromYesterday,
        change_percent: changePercent,
        sh_buy: shBuy,
        sh_sell: shSell,
        sz_buy: szBuy,
        sz_sell: szSell,
        time_series: timeSeries
      };
    }

    if (USE_MOCK_FALLBACK) return mockNorthFlow;
    return null;
  } catch (error) {
    logger.error('获取北向资金失败:', error);
    if (USE_MOCK_FALLBACK) return mockNorthFlow;
    return null;
  }
}

// ===========================================
// ===========================================
// 实时新闻聚合服务
// ===========================================

/**
 * 新闻源配置
 * 包含所有财经资讯平台和大V渠道
 */
export const NEWS_SOURCES = [
  // 重要大V渠道 - 放在最前面的醒目位置
  { key: 'snowball_influencer', name: '雪球大V', tableName: 'snowball_influencer_tb', color: '#3B82F6', icon: '❄️', featured: true },
  { key: 'weibo_influencer', name: '微博大V', tableName: 'weibo_influencer_tb', color: '#FF5722', icon: '🔥', featured: true },

  // 主流财经资讯平台
  { key: 'cls', name: '财联社', tableName: 'clscntelegraph_tb', color: '#FF6B6B' },
  { key: 'eastmoney', name: '东方财富', tableName: 'eastmoney724_tb', color: '#4ECDC4' },
  { key: 'jin10', name: '金十数据', tableName: 'jin10data724_tb', color: '#FFE66D' },
  { key: 'gelonghui', name: '格隆汇', tableName: 'gelonghui724_tb', color: '#95E1D3' },
  { key: 'sina', name: '新浪财经', tableName: 'sina724_tb', color: '#F38181' },
  { key: 'jqka', name: '同花顺', tableName: 'jqka724_tb', color: '#AA96DA' },
  { key: 'jrj', name: '金融界', tableName: 'jrj724_tb', color: '#74B9FF' },
  { key: 'futunn', name: '富途牛牛', tableName: 'futunn724_tb', color: '#00B894' },
  { key: 'ifeng', name: '凤凰财经', tableName: 'ifeng724_tb', color: '#E17055' },
  { key: 'jin10qihuo', name: '金十期货', tableName: 'jin10qihuo724_tb', color: '#FDCB6E' },

  // 其他平台
  { key: 'snowball', name: '雪球', tableName: 'snowball724_tb', color: '#3B82F6' },
  { key: 'wallstreetcn', name: '华尔街见闻', tableName: 'wallstreetcn_tb', color: '#1E3A5F' },
  { key: 'xuangutong', name: '选股通', tableName: 'xuangutong724_tb', color: '#9C27B0' },
  { key: 'yicai', name: '第一财经', tableName: 'yicai724_tb', color: '#2196F3' },
  { key: 'yuncaijing', name: '云财经', tableName: 'yuncaijing724_tb', color: '#00BCD4' },
];

/** 新闻数据行类型 */
type NewsRow = {
  id: string | number;
  title: string;
  content: string;
  display_time: number;
  images: unknown; // jsonb 可能是字符串或已解析的数组
};

/** 新闻输出类型 */
export interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceKey: string;
  display_time: number;
  time: string;
  date: string;
  importance: 'high' | 'normal';
  images?: string[];
}

/**
 * 格式化 Unix 时间戳为时间字符串
 */
function formatNewsTime(timestamp: number): { time: string; date: string } {
  const d = new Date(timestamp * 1000);
  return {
    time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    date: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  };
}

/**
 * 判断新闻重要性
 */
function getNewsImportance(title: string, content: string): 'high' | 'normal' {
  const importantKeywords = [
    '央行', '降准', '降息', '利率', 'LPR', '国务院', '证监会', '银保监',
    '重磅', '突发', '重要', '紧急', '官宣', '发布会',
    '涨停', '跌停', '暴涨', '暴跌', '大涨', '大跌',
    '特朗普', '美联储', 'Fed', '鲍威尔', 'GDP', 'CPI', 'PPI', 'PMI',
    '战争', '制裁', '关税', '贸易战',
    '茅台', '比亚迪', '宁德时代', '华为', '特斯拉', '英伟达', '苹果',
  ];
  const text = (title + content).toLowerCase();
  return importantKeywords.some(keyword => text.includes(keyword.toLowerCase())) ? 'high' : 'normal';
}

/**
 * 安全解析 images 字段
 * 数据库 jsonb 列可能返回已解析的数组，也可能返回 JSON 字符串
 */
function parseImages(images: unknown): string[] | undefined {
  if (!images) return undefined;
  if (Array.isArray(images)) {
    return images.length > 0 ? images : undefined;
  }
  if (typeof images === 'string') {
    const trimmed = images.trim();
    if (!trimmed || trimmed === '[]' || trimmed === 'null') return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * 归一化时间戳（秒）
 * 部分表的 display_time 是毫秒级（13位），需要转换为秒级（10位）
 * 同时过滤掉明显异常的值（负数、0、远未来）
 */
function normalizeTimestamp(ts: number): number {
  if (!ts || ts <= 0) return 0;
  // 13位数字(毫秒)转换为秒：大于 10_000_000_000 表示秒级已超过 2286年，肯定是毫秒
  if (ts > 10_000_000_000) {
    return Math.floor(ts / 1000);
  }
  return ts;
}

/**
 * 从单个新闻源获取数据
 * 使用 ORDER BY id DESC（主键索引，稳定快速）替代 ORDER BY display_time DESC（无索引，大表超时）
 * 客户端按 display_time 排序
 */
async function fetchFromSource(
  source: typeof NEWS_SOURCES[0],
  limit: number,
  signal?: AbortSignal
): Promise<NewsItem[]> {
  try {
    let query = supabaseNews
      .from(source.tableName)
      .select('id, title, content, display_time, images');

    if (signal) {
      query = query.abortSignal(signal);
    }

    // 使用 ORDER BY id DESC —— 主键索引，查询稳定 300-500ms
    // 而 ORDER BY display_time DESC 无索引，大表需要 1.5-2.6s，并发时容易超时
    const { data, error } = await query
      .order('id', { ascending: false })
      .limit(limit);

    if (error) {
      logger.warn(`[News] ✖ ${source.name}(${source.tableName}): ${error.message}`);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const typedData = data as NewsRow[];
    return typedData.map((item) => {
      const ts = normalizeTimestamp(item.display_time);
      const { time, date } = formatNewsTime(ts);
      return {
        id: `${source.key}_${item.id}`,
        title: item.title || '',
        content: item.content || '',
        source: source.name,
        sourceKey: source.key,
        display_time: ts,
        time,
        date,
        importance: getNewsImportance(item.title || '', item.content || ''),
        images: parseImages(item.images),
      };
    });
  } catch (err) {
    logger.error(`[News] ✖ ${source.name}(${source.tableName}) 异常:`, err);
    return [];
  }
}

/**
 * 获取实时新闻聚合数据
 * 不做任何服务端日期过滤，直接从每个表取最新 N 条，客户端按日期分组/筛选
 *
 * @param params.sources  - 指定新闻源 key 数组，不传则获取全部
 * @param params.limit    - 每个源获取条数，默认 50
 * @param params.totalLimit - 返回最大总条数，默认 500
 */
export async function fetchRealTimeNews(params: {
  sources?: string[];
  limit?: number;
  totalLimit?: number;
} = {}): Promise<NewsItem[]> {
  const { sources, limit = 50, totalLimit = 500 } = params;
  const cacheKey = `news:realtime:v2:${stableStringify({ sources: sources || null, limit, totalLimit })}`;

  return requestWithCache(
    cacheKey,
    'fetchRealTimeNews',
    async (signal) => {
      const targetSources = sources
        ? NEWS_SOURCES.filter(s => sources.includes(s.key))
        : NEWS_SOURCES;

      if (targetSources.length === 0) {
        logger.warn('[News] 未指定有效的新闻源');
        return [];
      }

      logger.log(`[News] 开始聚合 ${targetSources.length} 个新闻源, 每源取 ${limit} 条`);

      // 并发度降到 3，避免数据库过载
      const results = await mapWithConcurrency(
        targetSources,
        3,
        (source) => fetchFromSource(source, limit, signal)
      );

      // 合并所有源，过滤掉时间戳异常的记录（未来时间或无效值）
      const nowTs = Math.floor(Date.now() / 1000) + 86400; // 允许未来 1 天容差
      const allNews = results.flat().filter(item => item.display_time > 0 && item.display_time <= nowTs);

      // 统计各源结果
      const statsMap = new Map<string, number>();
      allNews.forEach(item => {
        statsMap.set(item.source, (statsMap.get(item.source) || 0) + 1);
      });
      const stats = Array.from(statsMap.entries()).map(([name, count]) => `${name}:${count}`);
      logger.log(`[News] 聚合完成: 共 ${allNews.length} 条 [${stats.join(', ')}]`);

      // 客户端按 display_time 降序排列
      allNews.sort((a, b) => b.display_time - a.display_time);
      return allNews.slice(0, totalLimit);
    },
    { ttlMs: 5_000 }
  );
}

/**
 * 获取指定新闻源的数据
 */
export async function fetchNewsBySource(
  sourceKey: string,
  limit = 80
): Promise<NewsItem[]> {
  const source = NEWS_SOURCES.find(s => s.key === sourceKey);
  if (!source) {
    logger.warn(`未找到新闻源: ${sourceKey}`);
    return [];
  }
  return fetchFromSource(source, limit);
}

// ===========================================
// 股票数据服务
// ===========================================

/**
 * 获取股票列表
 */
export async function fetchStockList(params: {
  industry?: string;
  market?: string;
  keyword?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<StockBasic[]> {
  try {
    const { industry, market, keyword, limit = 100, offset = 0 } = params;

    let query = supabaseStock
      .from('stock_basic')
      .select('ts_code, symbol, name, area, industry, market, list_date')
      .range(offset, offset + limit - 1);

    if (industry) {
      query = query.eq('industry', industry);
    }
    if (market) {
      query = query.eq('market', market);
    }
    if (keyword) {
      query = query.or(`name.ilike.%${keyword}%,ts_code.ilike.%${keyword}%,symbol.ilike.%${keyword}%`);
    }

    const { data, error } = await query;

    if (error) {
      logger.warn('获取股票列表失败:', error);
      if (USE_MOCK_FALLBACK) return mockStocks;
      return [];
    }

    if (data && data.length > 0) {
      logger.log(`获取到 ${data.length} 只股票`);
      return data.map((item: {
        ts_code: string;
        symbol: string;
        name: string;
        area: string | null;
        industry: string | null;
        market: string | null;
        list_date: string | null;
      }) => ({
        ts_code: item.ts_code,
        symbol: item.symbol,
        name: item.name,
        industry: item.industry || '',
        market: item.market || '',
        list_date: item.list_date || ''
      }));
    }

    if (USE_MOCK_FALLBACK) return mockStocks;
    return [];
  } catch (error) {
    logger.error('获取股票列表失败:', error);
    if (USE_MOCK_FALLBACK) return mockStocks;
    return [];
  }
}

/**
 * 股票列表行情数据接口
 */
export interface StockQuoteItem {
  ts_code: string;
  symbol: string;
  name: string;
  industry: string;
  close: number;        // 最新价
  change: number;       // 涨跌额
  pct_chg: number;      // 涨跌幅
  vol: number;          // 成交量(手)
  amount: number;       // 成交额(千元)
  open: number;         // 今开
  high: number;         // 最高
  low: number;          // 最低
  pre_close: number;    // 昨收
  turnover_rate: number;// 换手率
  pe_ttm: number;       // 市盈率
  pb: number;           // 市净率
  total_mv: number;     // 总市值(万元)
  trade_date: string;   // 交易日期
}

/**
 * 获取股票列表带行情数据（分页）
 * 通过 daily_basic 表获取，按成交额降序
 */
async function fetchStockListWithQuotesRaw(params: {
  keyword?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'amount' | 'pct_chg' | 'turnover_rate' | 'total_mv';
  sortOrder?: 'asc' | 'desc';
} = {}, signal?: AbortSignal): Promise<{ data: StockQuoteItem[]; total: number }> {
  try {
    const requestSignal = signal ?? new AbortController().signal;

    const {
      keyword,
      limit = 50,
      offset = 0,
      sortBy = 'amount',
      sortOrder = 'desc'
    } = params;

    // 获取最新交易日期
    const { data: latestData } = await supabaseStock
      .from('daily_basic')
      .select('trade_date')
      .abortSignal(requestSignal)
      .order('trade_date', { ascending: false })
      .limit(1);

    const latestDate = (latestData as { trade_date: string }[] | null)?.[0]?.trade_date;
    if (!latestDate) {
      logger.warn('未找到最新交易日期');
      return { data: [], total: 0 };
    }

    logger.log('最新交易日期:', latestDate);

    // 如果有关键词搜索，先从 stock_basic 表获取匹配的股票代码
    let matchedCodes: string[] | null = null;
    if (keyword) {
      const { data: basicData } = await supabaseStock
        .from('stock_basic')
        .select('ts_code')
        .abortSignal(requestSignal)
        .or(`name.ilike.%${keyword}%,ts_code.ilike.%${keyword}%,symbol.ilike.%${keyword}%`);

      if (basicData && basicData.length > 0) {
        matchedCodes = basicData.map((item: { ts_code: string }) => item.ts_code);
      } else {
        return { data: [], total: 0 };
      }
    }

    // 获取总数
    let countQuery = supabaseStock
      .from('daily_basic')
      .select('ts_code', { count: 'exact', head: true })
      .abortSignal(requestSignal)
      .eq('trade_date', latestDate);

    if (matchedCodes) {
      countQuery = countQuery.in('ts_code', matchedCodes);
    }

    const { count } = await countQuery;
    const total = count || 0;

    // 判断排序字段在哪个表
    // pct_chg 和 amount 在 daily 表，turnover_rate 和 total_mv 在 daily_basic 表
    const dailyFields = ['pct_chg', 'amount'];
    const sortFromDaily = dailyFields.includes(sortBy);

    let tsCodes: string[] = [];

    if (sortFromDaily) {
      // 从 daily 表排序获取数据
      let dailyQuery = supabaseStock
        .from('daily')
        .select('ts_code, open, high, low, close, pre_close, change, pct_chg, vol, amount')
        .abortSignal(requestSignal)
        .eq('trade_date', latestDate)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      if (matchedCodes) {
        dailyQuery = dailyQuery.in('ts_code', matchedCodes);
      }

      const { data: dailyData, error: dailyError } = await dailyQuery;

      if (dailyError) {
        logger.error('获取daily数据失败:', dailyError);
        return { data: [], total: 0 };
      }

      if (!dailyData || dailyData.length === 0) {
        return { data: [], total: 0 };
      }

      tsCodes = dailyData.map((item: { ts_code: string }) => item.ts_code);

      // 获取 daily_basic 数据
      const { data: basicData, error: basicError } = await supabaseStock
        .from('daily_basic')
        .select(`
          ts_code,
          trade_date,
          close,
          turnover_rate,
          turnover_rate_f,
          volume_ratio,
          pe,
          pe_ttm,
          pb,
          ps,
          ps_ttm,
          dv_ratio,
          dv_ttm,
          total_share,
          float_share,
          free_share,
          total_mv,
          circ_mv
        `)
        .abortSignal(requestSignal)
        .eq('trade_date', latestDate)
        .in('ts_code', tsCodes);

      if (basicError) {
        logger.error('获取daily_basic数据失败:', basicError);
      }

      // 获取股票基本信息
      const { data: stockBasicData, error: stockBasicError } = await supabaseStock
        .from('stock_basic')
        .select('ts_code, symbol, name, industry')
        .abortSignal(requestSignal)
        .in('ts_code', tsCodes);

      if (stockBasicError) {
        logger.error('获取stock_basic数据失败:', stockBasicError);
      }

      // 构建映射
      const basicMap = new Map(
        (basicData || []).map((item: { ts_code: string }) => [item.ts_code, item])
      );

      const stockBasicMap = new Map(
        (stockBasicData || []).map((item: { ts_code: string }) => [item.ts_code, item])
      );

      // 找出 stock_basic 中没有的股票代码（可能是新股）
      const missingCodes = tsCodes.filter(code => !stockBasicMap.has(code));

      // 从 new_share 表获取新股名称
      const newShareNameMap = missingCodes.length > 0
        ? await fetchNewShareNames(missingCodes)
        : new Map<string, { name: string; industry: string }>();

      // 按 dailyData 的顺序合并数据（保持排序）
      const result: StockQuoteItem[] = dailyData.map((daily: {
        ts_code: string;
        open: number;
        high: number;
        low: number;
        close: number;
        pre_close: number;
        change: number;
        pct_chg: number;
        vol: number;
        amount: number;
      }) => {
        const basic = basicMap.get(daily.ts_code) as {
          trade_date: string;
          close: number;
          turnover_rate: number;
          pe_ttm: number;
          pb: number;
          total_mv: number;
        } | undefined;
        const stockBasic = stockBasicMap.get(daily.ts_code) as {
          symbol: string;
          name: string;
          industry: string | null;
        } | undefined;

        // 降级获取新股名称
        const newShareInfo = newShareNameMap.get(daily.ts_code);

        return {
          ts_code: daily.ts_code,
          symbol: stockBasic?.symbol || daily.ts_code.split('.')[0],
          name: stockBasic?.name || newShareInfo?.name || daily.ts_code,
          industry: stockBasic?.industry || newShareInfo?.industry || '',
          close: daily.close || 0,
          change: daily.change || 0,
          pct_chg: daily.pct_chg || 0,
          vol: daily.vol || 0,
          amount: daily.amount || 0,
          open: daily.open || 0,
          high: daily.high || 0,
          low: daily.low || 0,
          pre_close: daily.pre_close || 0,
          turnover_rate: basic?.turnover_rate || 0,
          pe_ttm: basic?.pe_ttm || 0,
          pb: basic?.pb || 0,
          total_mv: basic?.total_mv || 0,
          trade_date: basic?.trade_date || latestDate
        };
      });

      logger.log(`获取到 ${result.length} 只股票行情数据，共 ${total} 只`);
      return { data: result, total };

    } else {
      // 从 daily_basic 表排序获取数据
      let query = supabaseStock
        .from('daily_basic')
        .select(`
          ts_code,
          trade_date,
          close,
          turnover_rate,
          turnover_rate_f,
          volume_ratio,
          pe,
          pe_ttm,
          pb,
          ps,
          ps_ttm,
          dv_ratio,
          dv_ttm,
          total_share,
          float_share,
          free_share,
          total_mv,
          circ_mv
        `)
        .abortSignal(requestSignal)
        .eq('trade_date', latestDate)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      if (matchedCodes) {
        query = query.in('ts_code', matchedCodes);
      }

      const { data: basicData, error: basicError } = await query;

      if (basicError) {
        logger.error('获取daily_basic数据失败:', basicError);
        return { data: [], total: 0 };
      }

      if (!basicData || basicData.length === 0) {
        return { data: [], total: 0 };
      }

      tsCodes = basicData.map((item: { ts_code: string }) => item.ts_code);

      // 获取日线数据
      const { data: dailyData, error: dailyError } = await supabaseStock
        .from('daily')
        .select('ts_code, open, high, low, close, pre_close, change, pct_chg, vol, amount')
        .abortSignal(requestSignal)
        .eq('trade_date', latestDate)
        .in('ts_code', tsCodes);

      if (dailyError) {
        logger.error('获取daily数据失败:', dailyError);
      }

      // 获取股票基本信息
      const { data: stockBasicData, error: stockBasicError } = await supabaseStock
        .from('stock_basic')
        .select('ts_code, symbol, name, industry')
        .abortSignal(requestSignal)
        .in('ts_code', tsCodes);

      if (stockBasicError) {
        logger.error('获取stock_basic数据失败:', stockBasicError);
      }

      // 构建映射
      const dailyMap = new Map(
        (dailyData || []).map((item: { ts_code: string }) => [item.ts_code, item])
      );

      const stockBasicMap = new Map(
        (stockBasicData || []).map((item: { ts_code: string }) => [item.ts_code, item])
      );

      // 找出 stock_basic 中没有的股票代码（可能是新股）
      const missingCodes = tsCodes.filter(code => !stockBasicMap.has(code));

      // 从 new_share 表获取新股名称
      const newShareNameMap = missingCodes.length > 0
        ? await fetchNewShareNames(missingCodes)
        : new Map<string, { name: string; industry: string }>();

      // 按 basicData 的顺序合并数据（保持排序）
      const result: StockQuoteItem[] = basicData.map((basic: {
        ts_code: string;
        trade_date: string;
        close: number;
        turnover_rate: number;
        pe_ttm: number;
        pb: number;
        total_mv: number;
      }) => {
        const daily = dailyMap.get(basic.ts_code) as {
          open: number;
          high: number;
          low: number;
          close: number;
          pre_close: number;
          change: number;
          pct_chg: number;
          vol: number;
          amount: number;
        } | undefined;
        const stockBasic = stockBasicMap.get(basic.ts_code) as {
          symbol: string;
          name: string;
          industry: string | null;
        } | undefined;

        // 降级获取新股名称
        const newShareInfo = newShareNameMap.get(basic.ts_code);

        return {
          ts_code: basic.ts_code,
          symbol: stockBasic?.symbol || basic.ts_code.split('.')[0],
          name: stockBasic?.name || newShareInfo?.name || basic.ts_code,
          industry: stockBasic?.industry || newShareInfo?.industry || '',
          close: daily?.close || basic.close || 0,
          change: daily?.change || 0,
          pct_chg: daily?.pct_chg || 0,
          vol: daily?.vol || 0,
          amount: daily?.amount || 0,
          open: daily?.open || 0,
          high: daily?.high || 0,
          low: daily?.low || 0,
          pre_close: daily?.pre_close || 0,
          turnover_rate: basic.turnover_rate || 0,
          pe_ttm: basic.pe_ttm || 0,
          pb: basic.pb || 0,
          total_mv: basic.total_mv || 0,
          trade_date: basic.trade_date
        };
      });

      logger.log(`获取到 ${result.length} 只股票行情数据，共 ${total} 只`);
      return { data: result, total };
    }
  } catch (error) {
    logger.error('获取股票列表行情失败:', error);
    return { data: [], total: 0 };
  }
}

export async function fetchStockListWithQuotes(params: {
  keyword?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'amount' | 'pct_chg' | 'turnover_rate' | 'total_mv';
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<{ data: StockQuoteItem[]; total: number }> {
  const cacheKey = `stock:list:quotes:${stableStringify(params)}`;
  return requestWithCache(
    cacheKey,
    'fetchStockListWithQuotes',
    (signal) => fetchStockListWithQuotesRaw(params, signal),
    { ttlMs: 10_000 }
  );
}

/**
 * 获取股票详情
 */
export async function fetchStockDetail(tsCode: string): Promise<StockBasic | null> {
  try {
    const { data, error } = await supabaseStock
      .from('stock_basic')
      .select('ts_code, symbol, name, area, industry, market, list_date')
      .eq('ts_code', tsCode)
      .single();

    if (error) {
      logger.warn('获取股票详情失败:', error);
      return null;
    }

    if (data) {
      const item = data as { ts_code: string; symbol: string; name: string; area: string | null; industry: string | null; market: string | null; list_date: string | null };
      return {
        ts_code: item.ts_code,
        symbol: item.symbol,
        name: item.name,
        industry: item.industry || '',
        market: item.market || '',
        list_date: item.list_date || ''
      };
    }

    return null;
  } catch (error) {
    logger.error('获取股票详情失败:', error);
    return null;
  }
}

/**
 * 获取单只股票的实时行情数据
 * 从 realtime_quote_cache 表获取最新一条数据
 */
export async function fetchRealtimeQuote(tsCode: string) {
  try {
    const { data, error } = await supabaseStock
      .from('realtime_quote_cache')
      .select('ts_code, name, date, time, open, high, low, price, volume, amount, pre_close, change_pct, change_amount')
      .eq('ts_code', tsCode)
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .limit(1);

    if (error) {
      logger.warn('获取实时行情失败:', error);
      return null;
    }

    if (data && data.length > 0) {
      const quote = data[0] as {
        ts_code: string;
        name: string;
        date: string;
        time: string;
        open: number;
        high: number;
        low: number;
        price: number;
        volume: number;
        amount: number;
        pre_close: number;
        change_pct: number;
        change_amount: number;
      };
      logger.log(`获取到 ${quote.name || quote.ts_code} 实时行情: ${quote.price} (${quote.date} ${quote.time})`);
      return quote;
    }

    return null;
  } catch (error) {
    logger.error('获取实时行情失败:', error);
    return null;
  }
}

/**
 * 格式化日期：YYYYMMDD -> YYYY-MM-DD 或保持原样
 */
function formatKLineDate(dateStr: string): string {
  if (dateStr.length === 8 && !dateStr.includes('-')) {
    // YYYYMMDD -> YYYY-MM-DD
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}

/**
 * 获取K线数据（用于图表）
 * 融合历史数据和实时行情数据
 */
export async function fetchKLineData(tsCode: string, days = 60) {
  try {
    // 1. 并行获取历史K线数据和实时行情
    const [historyResult, realtimeQuote] = await Promise.all([
      supabaseStock
        .from('daily')
        .select('trade_date, open, high, low, close, vol, amount')
        .eq('ts_code', tsCode)
        .order('trade_date', { ascending: false })
        .limit(days),
      fetchRealtimeQuote(tsCode)
    ]);

    const { data, error } = historyResult;

    if (error) {
      logger.warn('获取K线数据失败:', error);
      return generateKLineData(days);
    }

    if (data && data.length > 0) {
      logger.log(`获取到 ${data.length} 条历史K线数据`);

      // 转换历史数据格式
      const klineData = data.reverse().map((item: {
        trade_date: string;
        open: number;
        high: number;
        low: number;
        close: number;
        vol: number;
        amount: number;
      }) => ({
        date: item.trade_date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.vol
      }));

      // 2. 融合实时数据
      if (realtimeQuote) {
        const realtimeDate = formatKLineDate(realtimeQuote.date);
        const lastHistoryDate = klineData.length > 0 ? klineData[klineData.length - 1].date : '';

        // 构建实时K线条目
        const realtimeBar = {
          date: realtimeDate,
          open: realtimeQuote.open,
          high: realtimeQuote.high,
          low: realtimeQuote.low,
          close: realtimeQuote.price, // 现价作为收盘价
          volume: realtimeQuote.volume
        };

        if (realtimeDate > lastHistoryDate) {
          // 实时数据日期 > 历史最新日期：追加为新K线
          logger.log(`追加实时K线: ${realtimeDate}`);
          klineData.push(realtimeBar);
        } else if (realtimeDate === lastHistoryDate) {
          // 实时数据日期 = 历史最新日期：更新最新K线
          logger.log(`更新最新K线: ${realtimeDate}`);
          klineData[klineData.length - 1] = realtimeBar;
        }
        // 如果实时数据日期 < 历史最新日期，则忽略（可能是缓存过期数据）
      }

      return klineData;
    }

    // 降级到模拟数据
    return generateKLineData(days);
  } catch (error) {
    logger.error('获取K线数据失败:', error);
    return generateKLineData(days);
  }
}


/**
 * 获取股票完整详情（基本信息 + 行情数据 + 估值指标）
 * 支持新股降级：当 stock_basic 表中无数据时，从 new_share 表获取名称
 */
export async function fetchStockFullDetail(tsCode: string) {
  try {
    // 并行获取多个数据源
    const [basicResult, dailyResult, dailyBasicResult] = await Promise.all([
      // 股票基本信息
      supabaseStock
        .from('stock_basic')
        .select('ts_code, symbol, name, area, industry, market, list_date')
        .eq('ts_code', tsCode)
        .single(),
      // 最新日线数据
      supabaseStock
        .from('daily')
        .select('trade_date, open, high, low, close, pre_close, change, pct_chg, vol, amount')
        .eq('ts_code', tsCode)
        .order('trade_date', { ascending: false })
        .limit(1),
      // 最新估值指标
      supabaseStock
        .from('daily_basic')
        .select('turnover_rate, turnover_rate_f, volume_ratio, pe, pe_ttm, pb, ps, ps_ttm, dv_ratio, dv_ttm, total_share, float_share, free_share, total_mv, circ_mv')
        .eq('ts_code', tsCode)
        .order('trade_date', { ascending: false })
        .limit(1)
    ]);

    let basic = basicResult.data as {
      ts_code: string;
      symbol: string;
      name: string;
      area: string;
      industry: string;
      market: string;
      list_date: string;
    } | null;

    type DailyRow = {
      trade_date: string;
      open: number;
      high: number;
      low: number;
      close: number;
      pre_close: number;
      change: number;
      pct_chg: number;
      vol: number;
      amount: number;
    };
    const daily = (dailyResult.data as DailyRow[] | null)?.[0];

    type DailyBasicRow = {
      turnover_rate: number;
      turnover_rate_f: number;
      volume_ratio: number;
      pe: number;
      pe_ttm: number;
      pb: number;
      ps: number;
      ps_ttm: number;
      dv_ratio: number;
      dv_ttm: number;
      total_share: number;
      float_share: number;
      free_share: number;
      total_mv: number;
      circ_mv: number;
    };
    const dailyBasic = (dailyBasicResult.data as DailyBasicRow[] | null)?.[0];

    // 降级处理：如果 stock_basic 表中没有数据，尝试从 new_share 表获取新股信息
    if (!basic) {
      logger.warn(`stock_basic 表中未找到 ${tsCode}，尝试从 new_share 表获取新股信息...`);

      const { data: newShareData, error: newShareError } = await supabaseStock
        .from('new_share')
        .select('ts_code, name, issue_date, price, pe')
        .eq('ts_code', tsCode)
        .single();

      if (newShareError) {
        logger.warn('从 new_share 表获取新股信息失败:', newShareError);
      }

      if (newShareData) {
        const newShare = newShareData as {
          ts_code: string;
          name: string;
          issue_date: string | null;
          price: number | null;
          pe: number | null;
        };

        logger.log(`从 new_share 表获取到新股信息: ${newShare.name}(${tsCode})`);

        // 构建降级的 basic 数据
        basic = {
          ts_code: newShare.ts_code,
          symbol: newShare.ts_code.split('.')[0],
          name: newShare.name,
          area: '',
          industry: '新股',
          market: newShare.ts_code.includes('.SZ') ? '深市主板' :
            newShare.ts_code.includes('.SH') ? '沪市主板' :
              newShare.ts_code.includes('.BJ') ? '北交所' : '',
          list_date: newShare.issue_date || ''
        };
      }
    }

    // 如果仍然没有基本信息，返回 null
    if (!basic) {
      logger.warn('未找到股票基本信息:', tsCode);
      return null;
    }

    logger.log(`获取 ${basic.name}(${tsCode}) 详情成功`);

    return {
      // 基本信息
      ts_code: basic.ts_code,
      symbol: basic.symbol,
      name: basic.name,
      industry: basic.industry || '',
      market: basic.market || '',
      area: basic.area || '',
      list_date: basic.list_date || '',

      // 行情数据 (来自 daily 表)
      trade_date: daily?.trade_date || '',
      open: daily?.open || 0,
      high: daily?.high || 0,
      low: daily?.low || 0,
      close: daily?.close || 0,
      pre_close: daily?.pre_close || 0,
      change: daily?.change || 0,
      pct_chg: daily?.pct_chg || 0,
      vol: daily?.vol || 0,  // 成交量（手）
      amount: daily?.amount || 0,  // 成交额（千元）

      // 估值指标 (来自 daily_basic 表)
      turnover_rate: dailyBasic?.turnover_rate || 0,  // 换手率
      turnover_rate_f: dailyBasic?.turnover_rate_f || 0,  // 换手率(自由流通)
      volume_ratio: dailyBasic?.volume_ratio || 0,  // 量比
      pe: dailyBasic?.pe || 0,  // 市盈率(静态)
      pe_ttm: dailyBasic?.pe_ttm || 0,  // 市盈率(TTM)
      pb: dailyBasic?.pb || 0,  // 市净率
      ps: dailyBasic?.ps || 0,  // 市销率
      ps_ttm: dailyBasic?.ps_ttm || 0,  // 市销率(TTM)
      dv_ratio: dailyBasic?.dv_ratio || 0,  // 股息率
      dv_ttm: dailyBasic?.dv_ttm || 0,  // 股息率(TTM)
      total_share: dailyBasic?.total_share || 0,  // 总股本(万股)
      float_share: dailyBasic?.float_share || 0,  // 流通股本(万股)
      free_share: dailyBasic?.free_share || 0,  // 自由流通股本(万股)
      total_mv: dailyBasic?.total_mv || 0,  // 总市值(万元)
      circ_mv: dailyBasic?.circ_mv || 0  // 流通市值(万元)
    };
  } catch (error) {
    logger.error('获取股票完整详情失败:', error);
    return null;
  }
}

/**
 * 获取股票资金流向详情
 */
export async function fetchStockMoneyFlow(tsCode: string, days = 5) {
  try {
    const { data, error } = await supabaseStock
      .from('moneyflow')
      .select('trade_date, buy_sm_vol, buy_sm_amount, sell_sm_vol, sell_sm_amount, buy_md_vol, buy_md_amount, sell_md_vol, sell_md_amount, buy_lg_vol, buy_lg_amount, sell_lg_vol, sell_lg_amount, buy_elg_vol, buy_elg_amount, sell_elg_vol, sell_elg_amount, net_mf_vol, net_mf_amount')
      .eq('ts_code', tsCode)
      .order('trade_date', { ascending: false })
      .limit(days);

    if (error) {
      logger.warn('获取资金流向失败:', error);
      return [];
    }

    if (data && data.length > 0) {
      return data.map((item: {
        trade_date: string;
        buy_sm_vol: number;
        buy_sm_amount: number;
        sell_sm_vol: number;
        sell_sm_amount: number;
        buy_md_vol: number;
        buy_md_amount: number;
        sell_md_vol: number;
        sell_md_amount: number;
        buy_lg_vol: number;
        buy_lg_amount: number;
        sell_lg_vol: number;
        sell_lg_amount: number;
        buy_elg_vol: number;
        buy_elg_amount: number;
        sell_elg_vol: number;
        sell_elg_amount: number;
        net_mf_vol: number;
        net_mf_amount: number;
      }) => ({
        trade_date: item.trade_date,
        // 小单
        buy_sm_amount: item.buy_sm_amount || 0,
        sell_sm_amount: item.sell_sm_amount || 0,
        net_sm_amount: (item.buy_sm_amount || 0) - (item.sell_sm_amount || 0),
        // 中单
        buy_md_amount: item.buy_md_amount || 0,
        sell_md_amount: item.sell_md_amount || 0,
        net_md_amount: (item.buy_md_amount || 0) - (item.sell_md_amount || 0),
        // 大单
        buy_lg_amount: item.buy_lg_amount || 0,
        sell_lg_amount: item.sell_lg_amount || 0,
        net_lg_amount: (item.buy_lg_amount || 0) - (item.sell_lg_amount || 0),
        // 特大单
        buy_elg_amount: item.buy_elg_amount || 0,
        sell_elg_amount: item.sell_elg_amount || 0,
        net_elg_amount: (item.buy_elg_amount || 0) - (item.sell_elg_amount || 0),
        // 主力净流入（大单+特大单）
        net_main_amount: ((item.buy_lg_amount || 0) - (item.sell_lg_amount || 0)) +
          ((item.buy_elg_amount || 0) - (item.sell_elg_amount || 0)),
        // 总净流入
        net_mf_amount: item.net_mf_amount || 0
      }));
    }

    return [];
  } catch (error) {
    logger.error('获取资金流向失败:', error);
    return [];
  }
}

/**
 * 获取分时数据
 * 从 realtime_quote_cache 表获取当日分时数据
 */
export async function fetchTimeSeriesData(tsCode: string, preClose?: number) {
  try {
    // 获取当日日期 (YYYYMMDD 格式)
    const today = new Date();
    const todayStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    const { data, error } = await supabaseStock
      .from('realtime_quote_cache')
      .select('time, price, volume, amount, pre_close')
      .eq('ts_code', tsCode)
      .eq('date', todayStr)
      .order('time', { ascending: true });

    if (error) {
      logger.warn('获取分时数据失败:', error);
      return generateTimeSeriesData(preClose);
    }

    if (data && data.length > 0) {
      logger.log(`获取到 ${data.length} 条分时数据`);

      // 计算累计成交额和成交量，用于均价计算
      let cumulativeAmount = 0;
      let cumulativeVolume = 0;

      return data.map((item: {
        time: string;
        price: number;
        volume: number;
        amount: number;
        pre_close: number;
      }) => {
        cumulativeAmount += item.amount || 0;
        cumulativeVolume += item.volume || 0;

        // 分时均价 = 累计成交额 / 累计成交量
        const avg_price = cumulativeVolume > 0
          ? cumulativeAmount / cumulativeVolume
          : item.price;

        return {
          time: item.time.substring(0, 5), // HH:MM:SS -> HH:MM
          price: item.price,
          volume: item.volume,
          avg_price: Number(avg_price.toFixed(2))
        };
      });
    }

    // 降级到模拟数据
    logger.log('无分时数据，使用模拟数据');
    return generateTimeSeriesData(preClose);
  } catch (error) {
    logger.error('获取分时数据失败:', error);
    return generateTimeSeriesData(preClose);
  }
}

/**
 * 股票详情页面聚合数据
 */
export async function fetchStockDetailBundle(tsCode: string): Promise<StockDetailBundle> {
  const cacheKey = `stock:detail:bundle:${tsCode}`;
  return requestWithCache(
    cacheKey,
    'fetchStockDetailBundle',
    async () => {
      const [detail, kLineData, moneyFlowData] = await Promise.all([
        fetchStockFullDetail(tsCode),
        fetchKLineData(tsCode, 60),
        fetchStockMoneyFlow(tsCode, 5),
      ]);

      const preClose = (detail as { pre_close?: number } | null)?.pre_close || 0;
      const timeSeriesData = await fetchTimeSeriesData(tsCode, preClose || undefined);

      return {
        detail,
        kLineData,
        moneyFlowData,
        timeSeriesData,
      };
    },
    { ttlMs: 15_000 }
  );
}

/**
 * 获取资金流向数据
 * 使用 moneyflow 表
 */
export async function fetchMoneyFlow(tsCode: string, days = 10): Promise<MoneyFlowData[]> {
  try {
    const { data, error } = await supabaseStock
      .from('moneyflow')
      .select('ts_code, trade_date, buy_sm_vol, buy_sm_amount, sell_sm_vol, sell_sm_amount, buy_md_vol, buy_md_amount, sell_md_vol, sell_md_amount, buy_lg_vol, buy_lg_amount, sell_lg_vol, sell_lg_amount, buy_elg_vol, buy_elg_amount, sell_elg_vol, sell_elg_amount')
      .eq('ts_code', tsCode)
      .order('trade_date', { ascending: false })
      .limit(days);

    if (error) {
      logger.warn('获取资金流向失败:', error);
      return [];
    }

    if (data && data.length > 0) {
      logger.log(`获取到 ${data.length} 条资金流向数据`);
      return data.reverse().map((item: {
        ts_code: string;
        trade_date: string;
        buy_sm_vol: number;
        buy_sm_amount: number;
        sell_sm_vol: number;
        sell_sm_amount: number;
        buy_md_vol: number;
        buy_md_amount: number;
        sell_md_vol: number;
        sell_md_amount: number;
        buy_lg_vol: number;
        buy_lg_amount: number;
        sell_lg_vol: number;
        sell_lg_amount: number;
        buy_elg_vol: number;
        buy_elg_amount: number;
        sell_elg_vol: number;
        sell_elg_amount: number;
      }) => ({
        ts_code: item.ts_code,
        trade_date: item.trade_date,
        net_mf_amount: (item.buy_sm_amount - item.sell_sm_amount +
          item.buy_md_amount - item.sell_md_amount +
          item.buy_lg_amount - item.sell_lg_amount +
          item.buy_elg_amount - item.sell_elg_amount) || 0,
        buy_sm_amount: item.buy_sm_amount || 0,
        sell_sm_amount: item.sell_sm_amount || 0,
        buy_md_amount: item.buy_md_amount || 0,
        sell_md_amount: item.sell_md_amount || 0,
        buy_lg_amount: item.buy_lg_amount || 0,
        sell_lg_amount: item.sell_lg_amount || 0,
        buy_elg_amount: item.buy_elg_amount || 0,
        sell_elg_amount: item.sell_elg_amount || 0
      }));
    }

    return [];
  } catch (error) {
    logger.error('获取资金流向失败:', error);
    return [];
  }
}

// ===========================================
// 选股策略服务
// ===========================================

/**
 * 获取选股策略列表
 */
export async function fetchStrategies() {
  try {
    const { data, error } = await supabaseStock
      .from('picker_strategy')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) {
      logger.warn('获取策略列表失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error('获取策略列表失败:', error);
    return [];
  }
}

/**
 * 保存选股策略
 */
export async function saveStrategy(strategy: {
  name: string;
  description?: string;
  category?: string;
  filters: unknown[];
}) {
  try {
    const insertData = {
      name: strategy.name,
      description: strategy.description,
      category: (strategy.category as 'technical' | 'fundamental' | 'moneyflow' | 'pattern' | 'composite' | 'custom') || 'custom',
      stock_pool_config: { filters: strategy.filters }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabaseStock as any)
      .from('picker_strategy')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    logger.error('保存策略失败:', error);
    throw error;
  }
}

// ===========================================
// 开盘啦题材数据（使用 kpl_concept 和 kpl_list）
// ===========================================

/**
 * 获取开盘啦题材数据
 */
export async function fetchKplConcepts() {
  try {
    // 一次查询获取最新有数据的交易日（替代串行日期轮询）
    const { data, error } = await supabaseStock
      .from('kpl_concept')
      .select('ts_code, name, z_t_num, up_num, trade_date')
      .order('trade_date', { ascending: false })
      .order('z_t_num', { ascending: false })
      .limit(40);

    if (error) {
      logger.warn('查询开盘啦概念失败:', error);
      return mockKplConcepts;
    }

    if (data && data.length > 0) {
      // 找到最新交易日，只取该日数据
      const latestDate = (data as { trade_date: string }[])[0].trade_date;
      const latestData = (data as { ts_code: string; name: string; z_t_num: number; up_num: string; trade_date: string }[])
        .filter(item => item.trade_date === latestDate)
        .slice(0, 20);
      return latestData.map(item => ({
        ts_code: item.ts_code,
        name: item.name,
        limit_up_count: item.z_t_num || 0,
        up_count: parseInt(item.up_num) || 0,
        trade_date: item.trade_date
      }));
    }

    return mockKplConcepts;
  } catch (error) {
    logger.error('获取开盘啦题材失败:', error);
    return mockKplConcepts;
  }
}

/**
 * 获取沪深股通Top10
 */
export async function fetchHsgtTop10() {
  try {
    // 一次查询获取最新有数据的交易日（替代串行日期轮询）
    const { data, error } = await supabaseStock
      .from('hsgt_top10')
      .select('ts_code, name, close, change, rank, market_type, amount, net_amount, trade_date')
      .order('trade_date', { ascending: false })
      .order('rank', { ascending: true })
      .limit(20);

    if (error) {
      logger.warn('查询沪深股通Top10失败:', error);
      return mockHsgtTop10;
    }

    if (data && data.length > 0) {
      const latestDate = (data as { trade_date: string }[])[0].trade_date;
      const latestData = (data as { ts_code: string; name: string; close: number; change: number; rank: number; market_type: number; amount: number; net_amount: number | null; trade_date: string }[])
        .filter(item => item.trade_date === latestDate)
        .slice(0, 10);
      return latestData.map(item => ({
        ts_code: item.ts_code,
        name: item.name,
        close: item.close,
        change: item.change,
        rank: item.rank,
        market_type: item.market_type === 1 ? '沪股通' : item.market_type === 2 ? '深股通' : '港股通',
        amount: item.amount,
        net_amount: item.net_amount
      }));
    }

    return mockHsgtTop10;
  } catch (error) {
    logger.error('获取沪深股通Top10失败:', error);
    return mockHsgtTop10;
  }
}

/**
 * 市场概览聚合数据（优先走 RPC，失败时前端聚合）
 */
export async function fetchMarketOverviewBundle(forceRefresh = false): Promise<MarketOverviewBundle> {
  return requestWithCache(
    'market:overview:bundle',
    'fetchMarketOverviewBundle',
    async (signal) => {
      const rpcName = 'get_market_overview_bundle';
      const canTryRpc = forceRefresh || !isRpcTemporarilyDisabled(rpcName);

      if (canTryRpc) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rpcClient = supabaseStock as any;
          let rpcQuery = rpcClient.rpc(rpcName);
          if (typeof rpcQuery?.abortSignal === 'function') {
            rpcQuery = rpcQuery.abortSignal(signal);
          }

          const { data: rpcData, error: rpcError } = await rpcQuery;
          if (!rpcError && rpcData) {
            clearRpcDisableFlag(rpcName);
            const payload = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
            // RPC 内部错误时返回 {error: true, message: ...}，跳过
            if (payload?.error) {
              logger.warn('RPC get_market_overview_bundle 内部错误:', payload.message);
            } else {
              return {
                indices: payload.indices || [],
                sectors: payload.sectors || [],
                limitUpList: payload.limitUpList || [],
                upDownDistribution: payload.upDownDistribution || null,
                enhancedSentiment: payload.enhancedSentiment || null,
                northFlow: payload.northFlow || null,
                hsgtTop10: payload.hsgtTop10 || [],
                updateTime: payload.updateTime || getFormattedUpdateTime(),
              } as MarketOverviewBundle;
            }
          }

          if (rpcError && shouldDisableRpcAfterError(rpcError)) {
            disableRpcTemporarily(rpcName);
          }
        } catch (rpcErr) {
          if (shouldDisableRpcAfterError(rpcErr)) {
            disableRpcTemporarily(rpcName);
          }
          logger.warn('RPC get_market_overview_bundle 调用失败，降级前端聚合:', rpcErr);
        }
      }

      const [indices, sectors, limitUpList, upDownDistribution, northFlow, hsgtTop10] = await Promise.all([
        fetchIndices(),
        fetchHotSectors(20),
        fetchLimitUpList(20),
        fetchUpDownDistribution(),
        fetchNorthFlow(30),
        fetchHsgtTop10(),
      ]);

      const enhancedSentiment = await fetchEnhancedSentiment({
        distribution: upDownDistribution,
        northFlowData: northFlow,
        dailyAmountData: null,
        signal,
      });

      return {
        indices,
        sectors,
        limitUpList,
        upDownDistribution,
        enhancedSentiment,
        northFlow,
        hsgtTop10: hsgtTop10 as HsgtTop10PayloadItem[],
        updateTime: getFormattedUpdateTime(),
      };
    },
    {
      ttlMs: 120_000,
      allowCache: !forceRefresh,
    }
  );
}

// ===========================================
// 热榜数据服务（ths_hot表）
// ===========================================

// 热榜数据类型
export interface ThsHotItem {
  trade_date: string;
  data_type: string;
  ts_code: string;
  ts_name: string;
  rank: number;
  pct_change: number;
  hot: number;
  concept?: string;
}

// 概念/行业板块热榜数据（用于SectorHeat页面）
export interface SectorHotData {
  ts_code: string;
  ts_name: string;
  rank: number;
  pct_change: number;
  hot: number;
}

// 热股数据
export interface HotStockData {
  ts_code: string;
  ts_name: string;
  rank: number;
  pct_change: number;
  hot: number;
  concepts: string[];  // 相关概念
}

/**
 * 获取同花顺热榜数据（按类型）
 * @param dataType 数据类型：行业板块、概念板块、热股 等
 * @param limit 数量限制
 */
export async function fetchThsHot(dataType: '行业板块' | '概念板块' | '热股' | 'ETF', limit = 20): Promise<ThsHotItem[]> {
  try {
    // 获取最新交易日的数据
    const { data, error } = await supabaseStock
      .from('ths_hot')
      .select('trade_date, data_type, ts_code, ts_name, rank, pct_change, hot, concept')
      .eq('data_type', dataType)
      .order('trade_date', { ascending: false })
      .order('rank', { ascending: true })
      .limit(limit * 3); // 多获取一些以确保有足够的最新数据

    if (error) {
      logger.error('获取热榜数据失败:', error);
      return [];
    }

    if (!data || data.length === 0) {
      logger.warn('未找到热榜数据:', dataType);
      return [];
    }

    // 类型断言
    const typedData = data as ThsHotItem[];

    // 找到最新交易日
    const latestDate = typedData[0].trade_date;
    logger.log(`热榜 [${dataType}] 最新日期: ${latestDate}`);

    // 只返回最新交易日的数据
    const latestData = typedData
      .filter(item => item.trade_date === latestDate)
      .slice(0, limit);

    logger.log(`热榜 [${dataType}] 返回 ${latestData.length} 条数据`);
    return latestData;
  } catch (error) {
    logger.error('获取热榜数据异常:', error);
    return [];
  }
}

/**
 * 获取行业板块热榜
 */
export async function fetchIndustryHotList(limit = 15): Promise<SectorHotData[]> {
  const data = await fetchThsHot('行业板块', limit * 2); // 多获取一些用于去重

  // 按板块名称去重，保留热度最高的
  const uniqueMap = new Map<string, SectorHotData>();
  data.forEach(item => {
    const existing = uniqueMap.get(item.ts_name);
    if (!existing || (item.hot || 0) > existing.hot) {
      uniqueMap.set(item.ts_name, {
        ts_code: item.ts_code,
        ts_name: item.ts_name,
        rank: item.rank,
        pct_change: item.pct_change || 0,
        hot: item.hot || 0
      });
    }
  });

  return Array.from(uniqueMap.values()).slice(0, limit);
}

/**
 * 获取概念板块热榜
 */
export async function fetchConceptHotList(limit = 15): Promise<SectorHotData[]> {
  const data = await fetchThsHot('概念板块', limit * 2); // 多获取一些用于去重

  // 按板块名称去重，保留热度最高的
  const uniqueMap = new Map<string, SectorHotData>();
  data.forEach(item => {
    const existing = uniqueMap.get(item.ts_name);
    if (!existing || (item.hot || 0) > existing.hot) {
      uniqueMap.set(item.ts_name, {
        ts_code: item.ts_code,
        ts_name: item.ts_name,
        rank: item.rank,
        pct_change: item.pct_change || 0,
        hot: item.hot || 0
      });
    }
  });

  return Array.from(uniqueMap.values()).slice(0, limit);
}

/**
 * 获取热股榜
 */
export async function fetchHotStockList(limit = 20): Promise<HotStockData[]> {
  const data = await fetchThsHot('热股', limit * 2); // 多获取一些用于去重

  // 按 ts_code 去重，保留热度最高的
  const uniqueMap = new Map<string, HotStockData>();
  data.forEach(item => {
    const existing = uniqueMap.get(item.ts_code);
    if (existing && (existing.hot || 0) >= (item.hot || 0)) return;

    // 解析 concept 字段（兼容 JSON 字符串、逗号分隔字符串、数组）
    let concepts: string[] = [];
    if (Array.isArray(item.concept)) {
      concepts = item.concept.map((c) => String(c).trim()).filter(Boolean);
    } else if (typeof item.concept === 'string') {
      const rawConcept = item.concept.trim();
      if (rawConcept) {
        try {
          const parsed = JSON.parse(rawConcept);
          if (Array.isArray(parsed)) {
            concepts = parsed.map((c) => String(c).trim()).filter(Boolean);
          } else {
            concepts = rawConcept.split(/[，,]/).map(c => c.trim()).filter(Boolean);
          }
        } catch {
          concepts = rawConcept.split(/[，,]/).map(c => c.trim()).filter(Boolean);
        }
      }
    }
    uniqueMap.set(item.ts_code, {
      ts_code: item.ts_code,
      ts_name: item.ts_name,
      rank: item.rank,
      pct_change: item.pct_change || 0,
      hot: item.hot || 0,
      concepts
    });
  });

  return Array.from(uniqueMap.values()).slice(0, limit);
}

function buildSectorHeatmapDataFromLists(
  industryData: SectorHotData[],
  conceptData: SectorHotData[],
  limit = 30
): { name: string; value: number; size: number; type: string }[] {
  const allData = [
    ...industryData.map(item => ({ ...item, type: 'industry' })),
    ...conceptData.map(item => ({ ...item, type: 'concept' }))
  ];

  allData.sort((a, b) => {
    if (a.pct_change > 0 && b.pct_change <= 0) return -1;
    if (a.pct_change <= 0 && b.pct_change > 0) return 1;
    return Math.abs(b.pct_change) - Math.abs(a.pct_change);
  });

  const maxHot = Math.max(...allData.map(d => d.hot || 50), 1);

  return allData.slice(0, limit).map((item) => ({
    name: item.ts_name,
    value: item.pct_change,
    size: Math.max(30, Math.round(item.hot / maxHot * 70 + 30)),
    type: item.type
  }));
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return [];

    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // ignore parse error, fallback to split
    }

    return text.split(/[，,]/).map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return {};
}

function normalizeSectorHotData(items: unknown[]): SectorHotData[] {
  // 去重：同一 ts_name 只保留热度最高的一条
  const uniqueMap = new Map<string, SectorHotData>();
  items.forEach((item, index) => {
    const row = asRecord(item);
    const name = String(row.ts_name ?? row.name ?? `板块${index + 1}`);
    const hot = toFiniteNumber(row.hot, 0);
    const existing = uniqueMap.get(name);
    if (!existing || hot > existing.hot) {
      uniqueMap.set(name, {
        ts_code: String(row.ts_code ?? ''),
        ts_name: name,
        rank: toFiniteNumber(row.rank, index + 1),
        pct_change: toFiniteNumber(row.pct_change, 0),
        hot,
      });
    }
  });
  return Array.from(uniqueMap.values());
}

function normalizeHotStockData(items: unknown[]): HotStockData[] {
  // 去重：同一 ts_code 只保留热度最高的一条
  const uniqueMap = new Map<string, HotStockData>();
  items.forEach((item, index) => {
    const row = asRecord(item);
    const code = String(row.ts_code ?? '');
    const hot = toFiniteNumber(row.hot, 0);
    const existing = uniqueMap.get(code);
    if (!existing || hot > existing.hot) {
      uniqueMap.set(code, {
        ts_code: code,
        ts_name: String(row.ts_name ?? row.name ?? `热股${index + 1}`),
        rank: toFiniteNumber(row.rank, index + 1),
        pct_change: toFiniteNumber(row.pct_change, 0),
        hot,
        concepts: toStringArray(row.concepts ?? row.concept),
      });
    }
  });
  return Array.from(uniqueMap.values());
}

function normalizeKplConcepts(items: unknown[]): SectorHeatBundle['kplConcepts'] {
  // 去重：同一 name 只保留第一条（涨停数最多的）
  const uniqueMap = new Map<string, SectorHeatBundle['kplConcepts'][0]>();
  items.forEach((item, index) => {
    const row = asRecord(item);
    const name = String(row.name ?? `题材${index + 1}`);
    if (uniqueMap.has(name)) return;
    const tradeDateRaw = row.trade_date;
    const leadingStockRaw = row.leading_stock;
    uniqueMap.set(name, {
      ts_code: row.ts_code ? String(row.ts_code) : undefined,
      name,
      limit_up_count: toFiniteNumber(row.limit_up_count ?? row.z_t_num, 0),
      up_count: toFiniteNumber(row.up_count ?? row.up_num, 0),
      trade_date: tradeDateRaw ? String(tradeDateRaw) : undefined,
      heat_score: toFiniteNumber(row.heat_score, 0),
      leading_stock: leadingStockRaw ? String(leadingStockRaw) : undefined,
      leading_change: toFiniteNumber(row.leading_change, 0),
      total: toFiniteNumber(row.total, 0),
    });
  });
  return Array.from(uniqueMap.values());
}

function normalizeHeatmapData(items: unknown[]): SectorHeatBundle['heatmapData'] {
  // 去重：同一名称只保留一条
  const seen = new Map<string, SectorHeatBundle['heatmapData'][0]>();
  items.forEach((item, index) => {
    const row = asRecord(item);
    const name = String(row.name ?? row.ts_name ?? `板块${index + 1}`);
    if (!seen.has(name)) {
      const rawType = String(row.type ?? 'industry').toLowerCase();
      seen.set(name, {
        name,
        value: toFiniteNumber(row.value ?? row.pct_change, 0),
        size: Math.max(30, toFiniteNumber(row.size, 50)),
        type: rawType === 'concept' ? 'concept' : 'industry',
      });
    }
  });
  return Array.from(seen.values());
}

function normalizeSectorHeatBundlePayload(payload: unknown, limit = 30): SectorHeatBundle {
  const row = asRecord(payload);
  const industryHotList = normalizeSectorHotData(Array.isArray(row.industryHotList) ? row.industryHotList : []);
  const conceptHotList = normalizeSectorHotData(Array.isArray(row.conceptHotList) ? row.conceptHotList : []);

  const heatmapData = Array.isArray(row.heatmapData)
    ? normalizeHeatmapData(row.heatmapData)
    : buildSectorHeatmapDataFromLists(industryHotList, conceptHotList, limit);

  return {
    heatmapData,
    industryHotList,
    conceptHotList,
    hotStockList: normalizeHotStockData(Array.isArray(row.hotStockList) ? row.hotStockList : []),
    kplConcepts: normalizeKplConcepts(Array.isArray(row.kplConcepts) ? row.kplConcepts : []),
  };
}

/**
 * 获取板块热力图数据（合并行业和概念板块）
 */
export async function fetchSectorHeatmapData(limit = 30): Promise<{ name: string; value: number; size: number; type: string }[]> {
  try {
    // 同时获取行业和概念板块
    const [industryData, conceptData] = await Promise.all([
      fetchIndustryHotList(15),
      fetchConceptHotList(15)
    ]);
    return buildSectorHeatmapDataFromLists(industryData, conceptData, limit);
  } catch (error) {
    logger.error('获取热力图数据失败:', error);
    return [];
  }
}

/**
 * 板块热点页面聚合数据（优先走 RPC，失败时前端聚合）
 */
export async function fetchSectorHeatBundle(limit = 30): Promise<SectorHeatBundle> {
  const cacheKey = `sector:bundle:${limit}`;
  return requestWithCache(
    cacheKey,
    'fetchSectorHeatBundle',
    async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rpcClient = supabaseStock as any;
        const { data: rpcData, error: rpcError } = await rpcClient.rpc('get_sector_heat_bundle', {
          p_limit: limit
        });

        if (!rpcError && rpcData) {
          const payload = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
          return normalizeSectorHeatBundlePayload(payload, limit);
        }
      } catch (rpcErr) {
        logger.warn('RPC get_sector_heat_bundle 调用失败，降级前端聚合:', rpcErr);
      }

      const [industryHotList, conceptHotList, hotStockList, kplConcepts] = await Promise.all([
        fetchIndustryHotList(30),
        fetchConceptHotList(30),
        fetchHotStockList(20),
        fetchKplConcepts()
      ]);

      return normalizeSectorHeatBundlePayload({
        heatmapData: buildSectorHeatmapDataFromLists(industryHotList, conceptHotList, limit),
        industryHotList,
        conceptHotList,
        hotStockList,
        kplConcepts
      }, limit);
    },
    { ttlMs: 30_000 }
  );
}

// ===========================================
// 板块成分股服务
// ===========================================

/**
 * 板块成分股数据类型
 */
export interface SectorMemberStock {
  ts_code: string;
  name: string;
  close: number;
  pct_chg: number;
  change: number;
  open: number;
  high: number;
  low: number;
  pre_close: number;
  vol: number;
  amount: number;
  turnover_rate: number;
  pe_ttm: number;
  total_mv: number;
}

/** 成分股查询结果（含数据来源标识） */
export interface SectorMemberResult {
  stocks: SectorMemberStock[];
  /** full = 完整成分股, partial = 近期关联个股（涨跌停数据） */
  dataSource: 'full' | 'partial';
}

/**
 * 通过板块名称获取板块信息（代码 + 类型）
 * 用于热力图点击（只有名称没有 ts_code 的场景）
 */
export async function fetchSectorCodeByName(name: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseStock
      .from('ths_index')
      .select('ts_code')
      .eq('name', name)
      .limit(1);

    if (error || !data || data.length === 0) {
      logger.warn('未找到板块代码:', name, error);
      return null;
    }
    return (data[0] as { ts_code: string }).ts_code;
  } catch (err) {
    logger.error('获取板块代码失败:', err);
    return null;
  }
}

/**
 * THS 行业名 → stock_basic.industry 的名称映射
 * 两个分类体系不同，需要静态映射 + 模糊匹配
 */
const THS_TO_INDUSTRY_MAP: Record<string, string | string[]> = {
  // 精确对应
  '白酒': '白酒',
  '银行': '银行',
  '证券': '证券',
  '保险': '保险',
  '半导体': '半导体',
  '通信设备': '通信设备',
  '小金属': '小金属',
  '水泥': '水泥',
  '煤炭开采': '煤炭开采',
  '塑料': '塑料',
  '化纤': '化纤',
  '纺织': '纺织',
  '造纸': '造纸',
  '橡胶': '橡胶',
  '船舶': '船舶',
  '铝': '铝',
  '铜': '铜',
  '饲料': '饲料',
  '玻璃': '玻璃',
  '食品': '食品',
  '港口': '港口',
  '黄金': '黄金',
  '啤酒': '啤酒',
  '铁路': '铁路',
  '渔业': '渔业',
  '林业': '林业',
  '公路': '公路',
  '水务': '水务',
  '陶瓷': '陶瓷',

  // 名称近似映射
  '电网设备': '电气设备',
  '元件': '元器件',
  '光伏设备': '电气设备',
  '风电设备': '电气设备',
  '电池': '电气设备',
  '电力': '新型电力',
  '电力设备': '电气设备',
  '环境治理': '环境保护',
  '环保': '环境保护',
  '影视院线': '影视音像',
  '文化传媒': ['影视音像', '出版业'],
  '油气开采及服务': '石油开采',
  '油气': '石油开采',
  '石油石化': '石油加工',
  '农化制品': '农药化肥',
  '农药': '农药化肥',
  '钢铁': ['普钢', '特种钢', '钢加工'],
  '房地产': ['区域地产', '全国地产'],
  '地产': ['区域地产', '全国地产'],
  '贵金属': '黄金',
  '军工装备': '航空',
  '军工': '航空',
  '国防军工': '航空',
  '汽车': ['汽车整车', '汽车配件', '汽车服务'],
  '汽车零部件': '汽车配件',
  '家电': '家用电器',
  '家用电器': '家用电器',
  '医药': ['化学制药', '生物制药', '中成药'],
  '医药生物': ['化学制药', '生物制药'],
  '中药': '中成药',
  '软件': '软件服务',
  '软件开发': '软件服务',
  '计算机': ['软件服务', 'IT设备'],
  '互联网': '互联网',
  '多元金融': '多元金融',
  '建筑': '建筑工程',
  '建材': ['水泥', '其他建材'],
  '物流': '仓储物流',
  '快递': '仓储物流',
  '旅游': ['旅游景点', '旅游服务'],
  '酒店': '酒店餐饮',
  '商业百货': '百货',
  '零售': ['百货', '超市连锁'],
  '农业': '农业综合',
  '养殖': '农业综合',
  '种业': '种植业',
  '工程机械': '工程机械',
  '机床': '机床制造',
  '摩托车': '摩托车',
  '服装': '服饰',
  '纺织服饰': ['纺织', '服饰'],
  '化工': '化工原料',
  '基础化工': '化工原料',
  '电信': '电信运营',
  '石油贸易': '石油贸易',
  '装修': '装修装饰',
  '装饰': '装修装饰',
  '乳业': '乳制品',
  '焦炭': '焦炭加工',
  '水运': '水运',
  '航运': '水运',
  '医药流通': '医药商业',
  '火电': '火力发电',
  '水电': '水力发电',
  '日化': '日用化工',
  '铅锌': '铅锌',
  '钨': '小金属',
  '稀土': '小金属',
  '锂': '小金属',
  '钴': '小金属',
  '磁材': '小金属',
  '供气': '供气供热',
  '燃气': '供气供热',
  '园区': '园区开发',
  '电商': '互联网',
  '游戏': '互联网',
  '传媒': ['影视音像', '出版业'],
  '公交': '公共交通',
  '轻工': '轻工机械',
  '矿物': '矿物制品',
  '染料': '染料涂料',
  '涂料': '染料涂料',
  '商贸': '商贸代理',
  '机械': '专用机械',
  '家居': '家居用品',
  '建筑材料': ['水泥', '其他建材', '玻璃'],
  '有色金属': ['铝', '铜', '铅锌', '小金属', '黄金'],
  '食品饮料': ['食品', '白酒', '啤酒', '乳制品', '软饮料'],
  '非银金融': ['证券', '保险', '多元金融'],
  '电子': ['元器件', '半导体'],
  '通信': ['通信设备', '电信运营'],
  '机械设备': ['专用机械', '工程机械', '机械基件'],
};

/**
 * 通过 THS 板块名称查找匹配的 stock_basic.industry 名称
 * 优先使用静态映射表，再尝试精确匹配和模糊匹配
 */
async function findMatchingIndustry(sectorName: string): Promise<string[] | null> {
  // 1. 静态映射
  const mapped = THS_TO_INDUSTRY_MAP[sectorName];
  if (mapped) {
    const industries = Array.isArray(mapped) ? mapped : [mapped];
    return industries;
  }

  // 2. 精确匹配
  const { count: exactCount } = await supabaseStock
    .from('stock_basic')
    .select('*', { count: 'exact', head: true })
    .eq('industry', sectorName);

  if (exactCount && exactCount > 0) return [sectorName];

  // 3. 模糊匹配：去后缀搜索
  const stripped = sectorName
    .replace(/(设备|板块|行业|及服务|制造|开采)$/g, '')
    .replace(/^(Ⅲ|Ⅱ|III|II)/, '')
    .trim();

  if (stripped && stripped !== sectorName) {
    const { data: fuzzyMatch } = await supabaseStock
      .from('stock_basic')
      .select('industry')
      .ilike('industry', `%${stripped}%`)
      .limit(1);

    if (fuzzyMatch && fuzzyMatch.length > 0) {
      return [(fuzzyMatch[0] as { industry: string }).industry];
    }
  }

  // 4. 前两字模糊搜索
  if (sectorName.length >= 2) {
    const prefix = sectorName.substring(0, 2);
    const { data: prefixMatch } = await supabaseStock
      .from('stock_basic')
      .select('industry')
      .ilike('industry', `%${prefix}%`)
      .limit(1);

    if (prefixMatch && prefixMatch.length > 0) {
      return [(prefixMatch[0] as { industry: string }).industry];
    }
  }

  return null;
}

/**
 * 获取板块成分股列表（带行情数据）
 *
 * 策略：
 * - 行业板块 (type=I): 通过 stock_basic.industry 匹配行业名获取成分股 → dataSource='full'
 * - 概念板块 (type=N): 多源聚合关联个股
 *     1) kpl_concept_cons 精确匹配
 *     2) limit_list_ths.lu_desc 模糊匹配
 *     3) kpl_list.theme / lu_desc 模糊匹配
 *   → dataSource='partial'（近期涨跌停关联个股，非完整成分股）
 */
export async function fetchSectorMembers(sectorCode: string, sectorName?: string): Promise<SectorMemberResult> {
  const emptyResult: SectorMemberResult = { stocks: [], dataSource: 'full' };

  try {
    // 如果没有传名称，从 ths_index 获取
    let name = sectorName;
    if (!name) {
      const { data: indexData } = await supabaseStock
        .from('ths_index')
        .select('name')
        .eq('ts_code', sectorCode)
        .limit(1);
      name = (indexData as { name: string }[] | null)?.[0]?.name;
    }

    if (!name) {
      logger.warn('无法获取板块名称:', sectorCode);
      return emptyResult;
    }

    // 通过 ths_index.type 判断是否为概念板块（type=N 为概念，type=I 为行业）
    const { data: indexTypeData } = await supabaseStock
      .from('ths_index')
      .select('type')
      .eq('ts_code', sectorCode)
      .limit(1);
    const sectorType = (indexTypeData as { type: string }[] | null)?.[0]?.type;
    const isConcept = sectorType === 'N';

    if (isConcept) {
      return fetchConceptSectorMembers(name);
    }

    // ========== 行业板块：通过 stock_basic.industry 匹配 ==========
    const industryNames = await findMatchingIndustry(name);
    if (!industryNames || industryNames.length === 0) {
      logger.warn(`未找到匹配的行业: ${name}`);
      return emptyResult;
    }

    logger.log(`板块 "${name}" 匹配行业: ${JSON.stringify(industryNames)}`);
    const stocks = await fetchStocksDailyData(
      async () => {
        const { data } = await supabaseStock
          .from('stock_basic')
          .select('ts_code, name')
          .in('industry', industryNames)
          .limit(500);
        return (data as { ts_code: string; name: string }[] | null) || [];
      }
    );
    return { stocks, dataSource: 'full' };
  } catch (err) {
    logger.error('获取板块成分股失败:', err);
    return emptyResult;
  }
}

/**
 * 概念板块成分股：多源聚合
 * 1) kpl_concept_cons 精确名称匹配
 * 2) limit_list_ths.lu_desc 模糊匹配
 * 3) kpl_list.theme / lu_desc 模糊匹配
 */
async function fetchConceptSectorMembers(conceptName: string): Promise<SectorMemberResult> {
  // 生成搜索关键词：去掉 "概念" 后缀
  const keyword = conceptName
    .replace(/概念$/g, '')
    .replace(/\(.*?\)$/g, '')
    .trim();

  if (!keyword) {
    return { stocks: [], dataSource: 'partial' };
  }

  const collectedCodes = new Map<string, string>(); // ts_code → name

  // 1) kpl_concept_cons：精确匹配概念名
  try {
    const { data: kplData } = await supabaseStock
      .from('kpl_concept_cons')
      .select('con_code, con_name')
      .eq('name', conceptName);

    if (!kplData || kplData.length === 0) {
      // 也试去掉"概念"后缀的名称
      const { data: kplData2 } = await supabaseStock
        .from('kpl_concept_cons')
        .select('con_code, con_name')
        .eq('name', keyword);

      (kplData2 as { con_code: string; con_name: string }[] | null)?.forEach(d => {
        if (d.con_code && !collectedCodes.has(d.con_code)) {
          collectedCodes.set(d.con_code, d.con_name);
        }
      });
    } else {
      (kplData as { con_code: string; con_name: string }[]).forEach(d => {
        if (d.con_code && !collectedCodes.has(d.con_code)) {
          collectedCodes.set(d.con_code, d.con_name);
        }
      });
    }
  } catch {
    // kpl_concept_cons 可能不存在，静默跳过
  }

  // 2) limit_list_ths.lu_desc 模糊匹配
  try {
    const { data: lltData } = await supabaseStock
      .from('limit_list_ths')
      .select('ts_code, name')
      .ilike('lu_desc', `%${keyword}%`);

    (lltData as { ts_code: string; name: string }[] | null)?.forEach(d => {
      if (d.ts_code && !collectedCodes.has(d.ts_code)) {
        collectedCodes.set(d.ts_code, d.name);
      }
    });
  } catch {
    // 静默
  }

  // 3) kpl_list.theme + lu_desc 模糊匹配
  try {
    const [themeRes, descRes] = await Promise.all([
      supabaseStock
        .from('kpl_list')
        .select('ts_code, name')
        .ilike('theme', `%${keyword}%`),
      supabaseStock
        .from('kpl_list')
        .select('ts_code, name')
        .ilike('lu_desc', `%${keyword}%`),
    ]);

    for (const res of [themeRes, descRes]) {
      (res.data as { ts_code: string; name: string }[] | null)?.forEach(d => {
        if (d.ts_code && !collectedCodes.has(d.ts_code)) {
          collectedCodes.set(d.ts_code, d.name);
        }
      });
    }
  } catch {
    // 静默
  }

  if (collectedCodes.size === 0) {
    logger.warn(`概念板块 "${conceptName}" 未找到关联个股`);
    return { stocks: [], dataSource: 'partial' };
  }

  logger.log(`概念 "${conceptName}" 聚合到 ${collectedCodes.size} 只关联个股`);

  // 获取行情数据
  const stocks = await fetchStocksDailyData(
    async () => Array.from(collectedCodes.entries()).map(([ts_code, name]) => ({ ts_code, name }))
  );
  return { stocks, dataSource: 'partial' };
}

/**
 * 根据股票列表获取最新行情数据（通用函数，供行业/概念共用）
 */
async function fetchStocksDailyData(
  getStockList: () => Promise<{ ts_code: string; name: string }[]>
): Promise<SectorMemberStock[]> {
  const stockList = await getStockList();
  if (stockList.length === 0) return [];

  const codes = stockList.map(s => s.ts_code);
  const nameMap = new Map(stockList.map(s => [s.ts_code, s.name]));

  // 获取最新交易日
  const { data: latestData } = await supabaseStock
    .from('daily')
    .select('trade_date')
    .order('trade_date', { ascending: false })
    .limit(1);

  const latestDate = (latestData as { trade_date: string }[] | null)?.[0]?.trade_date;
  if (!latestDate) return [];

  // 批量查询行情（分批避免超限）
  const batchSize = 100;
  const results: SectorMemberStock[] = [];

  for (let i = 0; i < codes.length; i += batchSize) {
    const batch = codes.slice(i, i + batchSize);

    const [dailyRes, basicRes] = await Promise.all([
      supabaseStock
        .from('daily')
        .select('ts_code, close, pct_chg, change, open, high, low, pre_close, vol, amount')
        .eq('trade_date', latestDate)
        .in('ts_code', batch),
      supabaseStock
        .from('daily_basic')
        .select('ts_code, turnover_rate, pe_ttm, total_mv')
        .eq('trade_date', latestDate)
        .in('ts_code', batch),
    ]);

    const dailyMap = new Map(
      ((dailyRes.data || []) as Record<string, unknown>[]).map(d => [String(d.ts_code), d])
    );
    const basicMap = new Map(
      ((basicRes.data || []) as Record<string, unknown>[]).map(d => [String(d.ts_code), d])
    );

    for (const code of batch) {
      const d = (dailyMap.get(code) || {}) as Record<string, unknown>;
      const b = (basicMap.get(code) || {}) as Record<string, unknown>;
      // 只添加有行情数据的股票
      if (dailyMap.has(code)) {
        results.push({
          ts_code: code,
          name: nameMap.get(code) || code,
          close: Number(d.close) || 0,
          pct_chg: Number(d.pct_chg) || 0,
          change: Number(d.change) || 0,
          open: Number(d.open) || 0,
          high: Number(d.high) || 0,
          low: Number(d.low) || 0,
          pre_close: Number(d.pre_close) || 0,
          vol: Number(d.vol) || 0,
          amount: Number(d.amount) || 0,
          turnover_rate: Number(b.turnover_rate) || 0,
          pe_ttm: Number(b.pe_ttm) || 0,
          total_mv: Number(b.total_mv) || 0,
        });
      }
    }
  }

  // 按涨跌幅降序
  results.sort((a, b) => b.pct_chg - a.pct_chg);
  return results;
}

// ===========================================
// 导出便捷方法
// ===========================================

/**
 * 轻量级股票搜索（用于导航栏搜索框）
 * 搜索股票代码、名称、拼音简称，返回最多 10 条
 */
export async function searchStocks(keyword: string): Promise<{ ts_code: string; name: string; industry: string }[]> {
  if (!keyword || keyword.trim().length === 0) return [];

  const trimmed = keyword.trim();

  try {
    const { data, error } = await supabaseStock
      .from('stock_basic')
      .select('ts_code, name, industry')
      .or(`name.ilike.%${trimmed}%,ts_code.ilike.%${trimmed}%,symbol.ilike.%${trimmed}%,cnspell.ilike.%${trimmed}%`)
      .limit(10);

    if (error) {
      logger.warn('搜索股票失败:', error);
      return [];
    }

    return (data || []).map((item: { ts_code: string; name: string; industry: string | null }) => ({
      ts_code: item.ts_code,
      name: item.name,
      industry: item.industry || '',
    }));
  } catch (error) {
    logger.error('搜索股票异常:', error);
    return [];
  }
}

export const stockService = {
  fetchIndices,
  fetchHotSectors,
  fetchAllSectors,
  fetchLimitUpList,
  fetchLimitDownList,
  fetchUpDownDistribution,
  fetchMarketSentiment,
  fetchNorthFlow,
  fetchRealTimeNews,
  fetchNewsBySource,
  NEWS_SOURCES,
  fetchMarketOverviewBundle,
  fetchStockList,
  fetchStockListWithQuotes,
  fetchStockDetail,
  fetchStockDetailBundle,
  fetchStockFullDetail,
  fetchKLineData,
  fetchRealtimeQuote,
  fetchTimeSeriesData,
  fetchMoneyFlow,
  fetchStockMoneyFlow,
  fetchStrategies,
  saveStrategy,
  fetchKplConcepts,
  fetchHsgtTop10,
  // 新增热榜相关
  fetchThsHot,
  fetchIndustryHotList,
  fetchConceptHotList,
  fetchHotStockList,
  fetchSectorHeatmapData,
  fetchSectorHeatBundle,
  // 板块成分股
  fetchSectorCodeByName,
  fetchSectorMembers,
  // 龙虎榜相关
  fetchDragonTigerList,
  fetchDragonTigerDetail,
  // 搜索
  searchStocks,
};

// ===========================================
// 龙虎榜数据服务
// ===========================================

/**
 * 龙虎榜股票数据类型
 */
export interface DragonTigerItem {
  trade_date: string;
  ts_code: string;
  name: string;
  close: number;
  pct_change: number;
  turnover_rate: number;
  amount: number;         // 总成交额（元）
  l_buy: number;         // 龙虎榜买入额
  l_sell: number;        // 龙虎榜卖出额
  net_amount: number;    // 净买入额
  net_rate: number;      // 净买额占比
  reasons: string[];     // 上榜理由（支持多个）
}

/**
 * 龙虎榜机构明细类型
 */
export interface DragonTigerInst {
  trade_date: string;
  ts_code: string;
  exalter: string;       // 营业部名称
  side: '0' | '1';       // 0=买入, 1=卖出
  buy: number;
  buy_rate: number;
  sell: number;
  sell_rate: number;
  net_buy: number;
  reason: string;
}

/**
 * 获取龙虎榜列表数据
 * @param tradeDate 交易日期（可选，默认最新）
 * @param filter 筛选条件：'all' | 'net_buy' | 'net_sell'
 */
export async function fetchDragonTigerList(params: {
  tradeDate?: string;
  filter?: 'all' | 'net_buy' | 'net_sell';
  limit?: number;
} = {}): Promise<DragonTigerItem[]> {
  try {
    const { filter = 'all', limit = 50 } = params;
    let { tradeDate } = params;

    // 如果没有指定日期，获取最新交易日期
    if (!tradeDate) {
      const { data: latestDate } = await supabaseStock
        .from('top_list')
        .select('trade_date')
        .order('trade_date', { ascending: false })
        .limit(1);

      if (latestDate && latestDate.length > 0) {
        tradeDate = (latestDate[0] as { trade_date: string }).trade_date;
      } else {
        logger.warn('无法获取龙虎榜最新日期');
        return [];
      }
    }

    // 查询龙虎榜数据 - 获取所有记录（不限制数量，后续去重后再限制）
    const { data, error } = await supabaseStock
      .from('top_list')
      .select('ts_code, name, trade_date, close, pct_change, turnover_rate, amount, l_buy, l_sell, net_amount, net_rate, reason')
      .eq('trade_date', tradeDate)
      .order('net_amount', { ascending: false });

    if (error) {
      logger.error('获取龙虎榜数据失败:', error);
      return [];
    }

    // 按股票代码分组并合并上榜理由
    const stockMap = new Map<string, {
      item: Record<string, unknown>;
      reasons: string[];
      maxNetAmount: number;
    }>();

    for (const item of (data as Record<string, unknown>[] || [])) {
      const tsCode = String(item.ts_code || '');
      const reason = String(item.reason || '').trim();
      const netAmount = Number(item.net_amount) || 0;

      if (stockMap.has(tsCode)) {
        const existing = stockMap.get(tsCode)!;
        // 添加新的上榜理由（去重）
        if (reason && !existing.reasons.includes(reason)) {
          existing.reasons.push(reason);
        }
        // 如果当前记录的净买入额更大，更新主记录
        if (Math.abs(netAmount) > Math.abs(existing.maxNetAmount)) {
          existing.item = item;
          existing.maxNetAmount = netAmount;
        }
      } else {
        stockMap.set(tsCode, {
          item,
          reasons: reason ? [reason] : [],
          maxNetAmount: netAmount
        });
      }
    }

    // 转换为数组并格式化数据
    let result = Array.from(stockMap.values()).map(({ item, reasons }) => ({
      trade_date: String(item.trade_date || ''),
      ts_code: String(item.ts_code || ''),
      name: String(item.name || ''),
      close: Number(item.close) || 0,
      pct_change: Number(item.pct_change) || 0,
      turnover_rate: Number(item.turnover_rate) || 0,
      amount: Number(item.amount) || 0,
      l_buy: Number(item.l_buy) || 0,
      l_sell: Number(item.l_sell) || 0,
      net_amount: Number(item.net_amount) || 0,
      net_rate: Number(item.net_rate) || 0,
      reasons
    }));

    // 根据筛选条件过滤和排序
    if (filter === 'net_buy') {
      result = result.filter(item => item.net_amount > 0);
      result.sort((a, b) => b.net_amount - a.net_amount);
    } else if (filter === 'net_sell') {
      result = result.filter(item => item.net_amount < 0);
      result.sort((a, b) => a.net_amount - b.net_amount);
    } else {
      result.sort((a, b) => b.net_amount - a.net_amount);
    }

    // 限制返回数量
    return result.slice(0, limit);
  } catch (error) {
    logger.error('获取龙虎榜数据异常:', error);
    return [];
  }
}

/**
 * 获取龙虎榜机构明细
 * @param tsCode 股票代码
 * @param tradeDate 交易日期
 */
export async function fetchDragonTigerDetail(
  tsCode: string,
  tradeDate: string
): Promise<{ buyers: DragonTigerInst[]; sellers: DragonTigerInst[] }> {
  try {
    const { data, error } = await supabaseStock
      .from('top_inst')
      .select('trade_date, ts_code, exalter, side, buy, buy_rate, sell, sell_rate, net_buy, reason')
      .eq('ts_code', tsCode)
      .eq('trade_date', tradeDate)
      .order('net_buy', { ascending: false });

    if (error) {
      logger.error('获取龙虎榜机构明细失败:', error);
      return { buyers: [], sellers: [] };
    }

    const formatItem = (item: Record<string, unknown>): DragonTigerInst => ({
      trade_date: String(item.trade_date || ''),
      ts_code: String(item.ts_code || ''),
      exalter: String(item.exalter || ''),
      side: (item.side === '1' ? '1' : '0') as '0' | '1',
      buy: Number(item.buy) || 0,
      buy_rate: Number(item.buy_rate) || 0,
      sell: Number(item.sell) || 0,
      sell_rate: Number(item.sell_rate) || 0,
      net_buy: Number(item.net_buy) || 0,
      reason: String(item.reason || '')
    });

    const allItems = (data || []).map(formatItem);

    // 分离买方和卖方
    const buyers = allItems.filter(item => item.side === '0').sort((a, b) => b.buy - a.buy);
    const sellers = allItems.filter(item => item.side === '1').sort((a, b) => b.sell - a.sell);

    return { buyers, sellers };
  } catch (error) {
    logger.error('获取龙虎榜机构明细异常:', error);
    return { buyers: [], sellers: [] };
  }
}

export default stockService;

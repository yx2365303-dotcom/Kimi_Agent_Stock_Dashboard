import { supabaseStock, supabaseNews } from '@/lib/supabase';
import type { IndexData, StockBasic, SectorData, LimitUpData, NewsItem, MarketSentiment, DailyData, MoneyFlowData } from '@/types';
import {
  mockIndices,
  mockUpDownDistribution,
  mockNorthFlow,
  mockSentiment,
  mockLimitUpList,
  mockSectors,
  mockKplConcepts,
  mockHsgtTop10,
  mockNews,
  mockStocks,
  generateKLineData,
  generateTimeSeriesData
} from '@/data/mock';

// 是否使用模拟数据（当Supabase未配置或出错时自动降级）
const USE_MOCK_FALLBACK = true;

// ===========================================
// 实际数据库表结构（基于检查结果）
// ===========================================
// stock_basic: ts_code, symbol, name, area, industry, cnspell, market, list_date, act_name, act_ent_type
// daily_basic: ts_code, trade_date, close, turnover_rate, volume_ratio, pe, pe_ttm, pb, total_mv, circ_mv
// index_daily: ts_code, trade_date, open, high, low, close, pre_close, change, pct_chg, vol, amount
// index_basic: ts_code, name, fullname, market, publisher, index_type, category
// moneyflow: ts_code, trade_date, buy_sm_vol, buy_sm_amount, sell_sm_vol, sell_sm_amount, etc.
// hsgt_top10: trade_date, ts_code, name, close, change, rank, market_type, amount, net_amount
// stk_limit: trade_date, ts_code, up_limit, down_limit
// ths_index: ts_code, name, count, exchange, list_date, type (板块基础信息)
// ths_daily: ts_code, trade_date, open, high, low, close, pct_change, vol (板块日线)
// ths_member: ts_code, con_code, con_name (板块成分股)
// kpl_concept: trade_date, ts_code, name, z_t_num, up_num
// kpl_list: ts_code, name, trade_date, lu_time, theme, pct_chg, etc.
// limit_list_d: trade_date, ts_code, industry, name, close, pct_chg, amount, limit_amount, float_mv, total_mv, 
//               turnover_ratio, fd_amount, first_time, last_time, open_times, up_stat, limit_times, limit

// ===========================================
// 工具函数
// ===========================================

/**
 * 获取最近的交易日期（YYYYMMDD格式）
 * 使用北京时间，用于查询最新数据
 */
function getRecentTradeDates(count = 5): string[] {
  const dates: string[] = [];
  // 使用北京时间 (UTC+8)
  const now = new Date();
  const beijingOffset = 8 * 60 * 60 * 1000; // 8小时的毫秒数
  const beijingNow = new Date(now.getTime() + beijingOffset + now.getTimezoneOffset() * 60 * 1000);
  
  for (let i = 0; i < count + 10 && dates.length < count; i++) {
    const d = new Date(beijingNow);
    d.setDate(d.getDate() - i);
    const day = d.getDay();
    // 跳过周末
    if (day !== 0 && day !== 6) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}${month}${date}`);
    }
  }
  
  console.log('生成的交易日期:', dates);
  return dates;
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
      console.warn('获取指数基础信息失败:', basicError);
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
      .select('*')
      .in('ts_code', targetCodes)
      .order('trade_date', { ascending: false })
      .limit(20); // 获取足够多的数据以确保每个指数都有
    
    if (error) {
      console.warn('查询指数日线数据失败:', error);
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
      
      console.log(`获取到 ${latestByCode.size} 个指数的最新数据，日期: ${typedData[0].trade_date}`);
      
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
    
    console.warn('未找到指数日线数据，使用模拟数据');
    if (USE_MOCK_FALLBACK) return mockIndices;
    return [];
  } catch (error) {
    console.error('获取指数数据失败:', error);
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
      console.warn('查询板块日线失败:', upError || downError);
      if (USE_MOCK_FALLBACK) return mockSectors.slice(0, limit);
      return [];
    }
    
    if ((!upData || upData.length === 0) && (!downData || downData.length === 0)) {
      console.warn('未找到板块日线数据，使用模拟数据');
      if (USE_MOCK_FALLBACK) return mockSectors.slice(0, limit);
      return [];
    }
    
    // 合并涨跌数据
    type ThsDailyRow = { ts_code: string; trade_date: string; pct_change: number; vol: number; close: number; turnover_rate: number };
    const allData = [...(upData || []), ...(downData || [])] as ThsDailyRow[];
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
    
    console.log(`板块数据: 涨幅 ${upData?.filter(d => d.trade_date === latestDate).length || 0} 条, 跌幅 ${downData?.filter(d => d.trade_date === latestDate).length || 0} 条, 去重后 ${latestData.length} 条`);
    
    // 只查询这些板块的基础信息
    const tsCodes = latestData.map(item => item.ts_code);
    const { data: sectorBasic, error: basicError } = await supabaseStock
      .from('ths_index')
      .select('ts_code, name, count, type')
      .in('ts_code', tsCodes);
    
    if (basicError) {
      console.warn('获取板块基础信息失败:', basicError);
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
    
    console.log(`使用交易日 ${latestDate} 的板块数据`);
    console.log(`板块数据匹配: ${latestData.length} 个板块, ${basicMap.size} 个基础信息, ${conceptLimitUpMap.size} 个涨停概念, ${industryLimitDownMap.size} 个跌停行业`);
    
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
    console.error('获取板块数据失败:', error);
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
      console.warn('获取所有板块失败:', basicError);
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
    console.error('获取所有板块数据失败:', error);
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
      .select('*')
      .eq('limit', 'U')
      .order('trade_date', { ascending: false })
      .order('first_time')
      .limit(100); // 获取足够多的数据
    
    if (error) {
      console.warn('查询涨停数据失败:', error);
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
      
      console.log(`使用交易日 ${latestDate} 的涨停数据，共 ${latestData.length} 条`);
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
    
    console.warn('未找到涨停数据，使用模拟数据');
    if (USE_MOCK_FALLBACK) return mockLimitUpList.slice(0, limit);
    return [];
  } catch (error) {
    console.error('获取涨停数据失败:', error);
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
      .select('*')
      .eq('limit', 'D')
      .order('trade_date', { ascending: false })
      .order('first_time')
      .limit(100);
    
    if (error) {
      console.warn('查询跌停数据失败:', error);
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
      
      console.log(`使用交易日 ${latestDate} 的跌停数据`);
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
    console.error('获取跌停数据失败:', error);
    return [];
  }
}

// ===========================================
// 市场统计服务
// ===========================================

/**
 * 获取涨跌分布数据（增强版）
 * 包含：连板分布、炸板统计、行业热度
 */
export async function fetchUpDownDistribution() {
  try {
    // 先获取 limit_list_d 表的最新日期
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
    
    // 从 daily 表获取真实的涨跌平统计
    const { data: dailyLatest } = await supabaseStock
      .from('daily')
      .select('trade_date')
      .order('trade_date', { ascending: false })
      .limit(1);
    
    const dailyDate = (dailyLatest as { trade_date: string }[] | null)?.[0]?.trade_date || latestDate;
    
    // 获取所有股票的涨跌幅数据用于统计
    const { data: allDailyData } = await supabaseStock
      .from('daily')
      .select('pct_chg')
      .eq('trade_date', dailyDate);
    
    // 统计涨跌平
    let up_count = 0;
    let down_count = 0;
    let flat_count = 0;
    
    // 涨跌幅区间分布
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
        
        // 涨跌平统计
        if (pct > 0) up_count++;
        else if (pct < 0) down_count++;
        else flat_count++;
        
        // 涨跌幅区间分布
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
      
      console.log(`从 daily 表统计: 涨=${up_count}, 跌=${down_count}, 平=${flat_count}, 总计=${allDailyData.length}`);
    }
    
    // 获取所有涨跌停数据（一次查询，JS中过滤，避免 Supabase eq 过滤问题）
    const { data: allLimitData } = await supabaseStock
      .from('limit_list_d')
      .select('ts_code, name, limit_times, open_times, industry, limit_amount, first_time, limit')
      .eq('trade_date', latestDate);
    
    // 在 JS 中按 limit 字段过滤
    const limitUpList = (allLimitData || []).filter((d: { limit: string }) => d.limit === 'U');
    const limitDownList = (allLimitData || []).filter((d: { limit: string }) => d.limit === 'D');
    const zhabanList = (allLimitData || []).filter((d: { limit: string }) => d.limit === 'Z');
    
    // 统计连板分布
    const lianbanStats = {
      oneBoard: 0,  // 一板（首板）
      twoBoard: 0,  // 二板
      threeBoard: 0, // 三板
      fourBoard: 0,  // 四板
      fivePlus: 0    // 五板及以上
    };
    
    limitUpList.forEach((item: { limit_times: number }) => {
      const times = item.limit_times || 1;
      if (times === 1) lianbanStats.oneBoard++;
      else if (times === 2) lianbanStats.twoBoard++;
      else if (times === 3) lianbanStats.threeBoard++;
      else if (times === 4) lianbanStats.fourBoard++;
      else lianbanStats.fivePlus++;
    });
    
    // 统计炸板率（有开板的视为炸板）
    const totalAttempts = limitUpList.length + zhabanList.length;
    const zhabanCount = zhabanList.length;
    const fengbanRate = totalAttempts > 0 ? ((totalAttempts - zhabanCount) / totalAttempts * 100) : 0;
    
    // 统计涨停行业分布
    const industryMap = new Map<string, number>();
    limitUpList.forEach((item: { industry: string }) => {
      const industry = item.industry || '其他';
      industryMap.set(industry, (industryMap.get(industry) || 0) + 1);
    });
    
    // 获取TOP3行业
    const topIndustries = Array.from(industryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
    
    // 计算最高连板
    const maxLianban = Math.max(...limitUpList.map((item: { limit_times: number }) => item.limit_times || 1), 0);
    
    console.log(`使用交易日 ${latestDate} 的涨跌停统计: 涨停=${limitUpList.length}, 跌停=${limitDownList.length}, 炸板=${zhabanCount}`);
    
    return {
      up_count,
      down_count,
      flat_count,
      limit_up: limitUpList.length,
      limit_down: limitDownList.length,
      distribution,
      // 新增数据
      lianbanStats,
      zhabanCount,
      fengbanRate,
      topIndustries,
      maxLianban,
      totalAttempts
    };
  } catch (error) {
    console.error('获取涨跌分布失败:', error);
    if (USE_MOCK_FALLBACK) return mockUpDownDistribution;
    return null;
  }
}

/**
 * 获取市场情绪数据
 */
export async function fetchMarketSentiment(): Promise<MarketSentiment | null> {
  try {
    // 通过涨跌停数据计算情绪
    const distribution = await fetchUpDownDistribution();
    
    if (distribution) {
      const limitRatio = distribution.limit_up / Math.max(distribution.limit_up + distribution.limit_down, 1);
      const overall = Math.min(100, Math.max(0, limitRatio * 70 + 30));
      
      let label = '中性';
      if (overall >= 70) label = '乐观';
      else if (overall >= 55) label = '偏多';
      else if (overall <= 30) label = '恐慌';
      else if (overall <= 45) label = '偏空';
      
      return {
        overall,
        label,
        up_down_ratio: limitRatio * 2,
        avg_change: 0,
        limit_up_success_rate: 75
      };
    }
    
    if (USE_MOCK_FALLBACK) return mockSentiment;
    return null;
  } catch (error) {
    console.error('获取市场情绪失败:', error);
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
export async function fetchNorthFlow(days = 30) {
  try {
    const { data, error } = await supabaseStock
      .from('moneyflow_hsgt')
      .select('trade_date, hgt, sgt, north_money, south_money')
      .order('trade_date', { ascending: false })
      .limit(days);
    
    if (error) {
      console.warn('获取北向资金数据失败:', error);
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
      console.log(`获取到 ${typedData.length} 条北向资金数据，最新日期: ${typedData[0].trade_date}`);
      
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
    console.error('获取北向资金失败:', error);
    if (USE_MOCK_FALLBACK) return mockNorthFlow;
    return null;
  }
}

// ===========================================
// 新闻资讯服务 (使用财经资讯数据库)
// ===========================================

/**
 * 获取新闻列表
 * 注意：财经资讯数据库可能没有标准的 news 表
 * 需要根据实际表结构调整
 */
export async function fetchNews(params: {
  category?: string;
  importance?: 'high' | 'normal' | 'low';
  limit?: number;
} = {}): Promise<NewsItem[]> {
  try {
    const { limit = 20 } = params;
    
    // 尝试查询可能存在的新闻表
    const possibleTables = ['news', 'news_list', 'articles', 'cctv_news', 'major_news'];
    
    for (const tableName of possibleTables) {
      try {
        const query = supabaseNews
          .from(tableName)
          .select('*')
          .limit(limit);
        
        const { data, error } = await query;
        
        if (!error && data && data.length > 0) {
          console.log(`从 ${tableName} 表获取到新闻数据`);
          // 根据实际字段映射
          return data.map((item: Record<string, unknown>, index: number) => ({
            id: (item.id as string) || String(index),
            title: (item.title as string) || (item.headline as string) || '',
            content: (item.content as string) || (item.summary as string) || '',
            source: (item.source as string) || '',
            publish_time: (item.publish_time as string) || (item.created_at as string) || new Date().toISOString(),
            importance: (item.importance as 'high' | 'normal' | 'low') || 'normal',
            related_stocks: (item.related_stocks as string[]) || [],
            category: (item.category as string) || ''
          }));
        }
      } catch {
        // 表不存在，继续尝试下一个
        continue;
      }
    }
    
    console.warn('未找到新闻表，使用模拟数据');
    if (USE_MOCK_FALLBACK) return mockNews.slice(0, limit);
    return [];
  } catch (error) {
    console.error('获取新闻失败:', error);
    if (USE_MOCK_FALLBACK) return mockNews.slice(0, params.limit || 20);
    return [];
  }
}

// ===========================================
// 实时新闻聚合服务
// ===========================================

/**
 * 新闻源配置
 * 包含11个主流财经资讯平台
 */
export const NEWS_SOURCES = [
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
  { key: 'chinastar', name: '科创板日报', tableName: 'chinastarmarkettelegraph724_tb', color: '#6C5CE7' },
];

/**
 * 格式化 Unix 时间戳为时间字符串
 */
function formatNewsTime(timestamp: number): { time: string; date: string } {
  const d = new Date(timestamp * 1000);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return {
    time: `${hours}:${minutes}`,
    date: `${month}-${day}`
  };
}

/**
 * 判断新闻重要性
 * 基于关键词匹配
 */
function getNewsImportance(title: string, content: string): 'high' | 'normal' {
  const importantKeywords = [
    '央行', '降准', '降息', '利率', 'LPR', '国务院', '证监会', '银保监',
    '重磅', '突发', '重要', '紧急', '官宣', '发布会',
    '涨停', '跌停', '暴涨', '暴跌', '暴跌', '大涨', '大跌',
    '特朗普', '美联储', 'Fed', '鲍威尔', 'GDP', 'CPI', 'PPI', 'PMI',
    '战争', '制裁', '关税', '贸易战',
    '茅台', '比亚迪', '宁德时代', '华为', '特斯拉', '英伟达', '苹果',
  ];
  
  const text = (title + content).toLowerCase();
  return importantKeywords.some(keyword => text.includes(keyword.toLowerCase())) ? 'high' : 'normal';
}

/**
 * 从单个新闻源获取数据
 */
async function fetchFromSource(
  source: typeof NEWS_SOURCES[0],
  limit: number
): Promise<Array<{
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
}>> {
  try {
    const { data, error } = await supabaseNews
      .from(source.tableName)
      .select('id, title, content, display_time, images')
      .order('display_time', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn(`获取 ${source.name} 数据失败:`, error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    type NewsRow = {
      id: string | number;
      title: string;
      content: string;
      display_time: number;
      images: string | null;
    };
    const typedData = data as NewsRow[];
    return typedData.map((item) => {
      const { time, date } = formatNewsTime(item.display_time);
      return {
        id: `${source.key}_${item.id}`,
        title: item.title || '',
        content: item.content || '',
        source: source.name,
        sourceKey: source.key,
        display_time: item.display_time,
        time,
        date,
        importance: getNewsImportance(item.title || '', item.content || ''),
        images: item.images ? JSON.parse(item.images) : undefined
      };
    });
  } catch (err) {
    console.error(`获取 ${source.name} 数据异常:`, err);
    return [];
  }
}

/**
 * 获取实时新闻聚合数据
 * @param params.sources - 指定新闻源key数组，不传则获取全部
 * @param params.limit - 每个源获取的数量，默认30
 * @param params.totalLimit - 返回的最大条数，默认100
 */
export async function fetchRealTimeNews(params: {
  sources?: string[];
  limit?: number;
  totalLimit?: number;
} = {}): Promise<Array<{
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
}>> {
  const { sources, limit = 30, totalLimit = 100 } = params;
  
  // 筛选要查询的新闻源
  const targetSources = sources 
    ? NEWS_SOURCES.filter(s => sources.includes(s.key))
    : NEWS_SOURCES;

  if (targetSources.length === 0) {
    console.warn('未指定有效的新闻源');
    return [];
  }

  try {
    // 并行获取所有源的数据
    const results = await Promise.all(
      targetSources.map(source => fetchFromSource(source, limit))
    );

    // 合并所有数据
    const allNews = results.flat();

    // 按时间倒序排序
    allNews.sort((a, b) => b.display_time - a.display_time);

    // 返回限定条数
    return allNews.slice(0, totalLimit);
  } catch (error) {
    console.error('获取实时新闻失败:', error);
    return [];
  }
}

/**
 * 获取指定新闻源的数据
 */
export async function fetchNewsBySource(
  sourceKey: string,
  limit = 50
): Promise<Array<{
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
}>> {
  const source = NEWS_SOURCES.find(s => s.key === sourceKey);
  if (!source) {
    console.warn(`未找到新闻源: ${sourceKey}`);
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
      console.warn('获取股票列表失败:', error);
      if (USE_MOCK_FALLBACK) return mockStocks;
      return [];
    }
    
    if (data && data.length > 0) {
      console.log(`获取到 ${data.length} 只股票`);
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
    console.error('获取股票列表失败:', error);
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
export async function fetchStockListWithQuotes(params: {
  keyword?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'amount' | 'pct_chg' | 'turnover_rate' | 'total_mv';
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<{ data: StockQuoteItem[]; total: number }> {
  try {
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
      .order('trade_date', { ascending: false })
      .limit(1);
    
    const latestDate = (latestData as { trade_date: string }[] | null)?.[0]?.trade_date;
    if (!latestDate) {
      console.warn('未找到最新交易日期');
      return { data: [], total: 0 };
    }
    
    console.log('最新交易日期:', latestDate);
    
    // 如果有关键词搜索，先从 stock_basic 表获取匹配的股票代码
    let matchedCodes: string[] | null = null;
    if (keyword) {
      const { data: basicData } = await supabaseStock
        .from('stock_basic')
        .select('ts_code')
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
        .eq('trade_date', latestDate)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);
      
      if (matchedCodes) {
        dailyQuery = dailyQuery.in('ts_code', matchedCodes);
      }
      
      const { data: dailyData, error: dailyError } = await dailyQuery;
      
      if (dailyError) {
        console.error('获取daily数据失败:', dailyError);
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
        .eq('trade_date', latestDate)
        .in('ts_code', tsCodes);
      
      if (basicError) {
        console.error('获取daily_basic数据失败:', basicError);
      }
      
      // 获取股票基本信息
      const { data: stockBasicData, error: stockBasicError } = await supabaseStock
        .from('stock_basic')
        .select('ts_code, symbol, name, industry')
        .in('ts_code', tsCodes);
      
      if (stockBasicError) {
        console.error('获取stock_basic数据失败:', stockBasicError);
      }
      
      // 构建映射
      const basicMap = new Map(
        (basicData || []).map((item: { ts_code: string }) => [item.ts_code, item])
      );
      
      const stockBasicMap = new Map(
        (stockBasicData || []).map((item: { ts_code: string }) => [item.ts_code, item])
      );
      
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
        
        return {
          ts_code: daily.ts_code,
          symbol: stockBasic?.symbol || daily.ts_code.split('.')[0],
          name: stockBasic?.name || daily.ts_code,
          industry: stockBasic?.industry || '',
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
      
      console.log(`获取到 ${result.length} 只股票行情数据，共 ${total} 只`);
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
        .eq('trade_date', latestDate)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);
      
      if (matchedCodes) {
        query = query.in('ts_code', matchedCodes);
      }
      
      const { data: basicData, error: basicError } = await query;
      
      if (basicError) {
        console.error('获取daily_basic数据失败:', basicError);
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
        .eq('trade_date', latestDate)
        .in('ts_code', tsCodes);
      
      if (dailyError) {
        console.error('获取daily数据失败:', dailyError);
      }
      
      // 获取股票基本信息
      const { data: stockBasicData, error: stockBasicError } = await supabaseStock
        .from('stock_basic')
        .select('ts_code, symbol, name, industry')
        .in('ts_code', tsCodes);
      
      if (stockBasicError) {
        console.error('获取stock_basic数据失败:', stockBasicError);
      }
      
      // 构建映射
      const dailyMap = new Map(
        (dailyData || []).map((item: { ts_code: string }) => [item.ts_code, item])
      );
      
      const stockBasicMap = new Map(
        (stockBasicData || []).map((item: { ts_code: string }) => [item.ts_code, item])
      );
      
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
        
        return {
          ts_code: basic.ts_code,
          symbol: stockBasic?.symbol || basic.ts_code.split('.')[0],
          name: stockBasic?.name || basic.ts_code,
          industry: stockBasic?.industry || '',
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
      
      console.log(`获取到 ${result.length} 只股票行情数据，共 ${total} 只`);
      return { data: result, total };
    }
  } catch (error) {
    console.error('获取股票列表行情失败:', error);
    return { data: [], total: 0 };
  }
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
      console.warn('获取股票详情失败:', error);
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
    console.error('获取股票详情失败:', error);
    return null;
  }
}

/**
 * 获取股票日线数据
 * 使用 daily_basic 表（包含估值指标）
 */
export async function fetchStockDaily(tsCode: string, days = 60): Promise<DailyData[]> {
  try {
    const { data, error } = await supabaseStock
      .from('daily_basic')
      .select('*')
      .eq('ts_code', tsCode)
      .order('trade_date', { ascending: false })
      .limit(days);
    
    if (error) {
      console.warn('获取股票日线数据失败:', error);
      return [];
    }
    
    if (data && data.length > 0) {
      console.log(`获取到 ${data.length} 条日线数据`);
      return data.reverse().map((item: {
        ts_code: string;
        trade_date: string;
        close: number;
        turnover_rate: number;
        volume_ratio: number;
        pe: number;
        pe_ttm: number;
        pb: number;
        total_mv: number;
        circ_mv: number;
      }) => ({
        ts_code: item.ts_code,
        trade_date: item.trade_date,
        open: item.close, // daily_basic 没有 open
        high: item.close,
        low: item.close,
        close: item.close,
        pre_close: item.close,
        change: 0,
        pct_chg: 0,
        vol: item.circ_mv ? item.circ_mv * item.turnover_rate / 100 : 0,
        amount: item.total_mv || 0
      }));
    }
    
    return [];
  } catch (error) {
    console.error('获取股票日线数据失败:', error);
    return [];
  }
}

/**
 * 获取K线数据（用于图表）
 */
export async function fetchKLineData(tsCode: string, days = 60) {
  try {
    // 直接从 daily 表获取完整的 OHLC 数据
    const { data, error } = await supabaseStock
      .from('daily')
      .select('trade_date, open, high, low, close, vol, amount')
      .eq('ts_code', tsCode)
      .order('trade_date', { ascending: false })
      .limit(days);
    
    if (error) {
      console.warn('获取K线数据失败:', error);
      return generateKLineData(days);
    }
    
    if (data && data.length > 0) {
      console.log(`获取到 ${data.length} 条K线数据`);
      return data.reverse().map((item: {
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
    }
    
    // 降级到模拟数据
    return generateKLineData(days);
  } catch (error) {
    console.error('获取K线数据失败:', error);
    return generateKLineData(days);
  }
}

/**
 * 获取股票完整详情（基本信息 + 行情数据 + 估值指标）
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
        .select('*')
        .eq('ts_code', tsCode)
        .order('trade_date', { ascending: false })
        .limit(1),
      // 最新估值指标
      supabaseStock
        .from('daily_basic')
        .select('*')
        .eq('ts_code', tsCode)
        .order('trade_date', { ascending: false })
        .limit(1)
    ]);
    
    const basic = basicResult.data as {
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
    
    if (!basic) {
      console.warn('未找到股票基本信息:', tsCode);
      return null;
    }
    
    console.log(`获取 ${basic.name}(${tsCode}) 详情成功`);
    
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
    console.error('获取股票完整详情失败:', error);
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
      .select('*')
      .eq('ts_code', tsCode)
      .order('trade_date', { ascending: false })
      .limit(days);
    
    if (error) {
      console.warn('获取资金流向失败:', error);
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
    console.error('获取资金流向失败:', error);
    return [];
  }
}

/**
 * 获取分时数据
 */
export async function fetchTimeSeriesData(_tsCode: string) {
  // 分时数据通常需要实时接口，这里先返回模拟数据
  return generateTimeSeriesData();
}

/**
 * 获取资金流向数据
 * 使用 moneyflow 表
 */
export async function fetchMoneyFlow(tsCode: string, days = 10): Promise<MoneyFlowData[]> {
  try {
    const { data, error } = await supabaseStock
      .from('moneyflow')
      .select('*')
      .eq('ts_code', tsCode)
      .order('trade_date', { ascending: false })
      .limit(days);
    
    if (error) {
      console.warn('获取资金流向失败:', error);
      return [];
    }
    
    if (data && data.length > 0) {
      console.log(`获取到 ${data.length} 条资金流向数据`);
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
    console.error('获取资金流向失败:', error);
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
      console.warn('获取策略列表失败:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('获取策略列表失败:', error);
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
    console.error('保存策略失败:', error);
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
    const recentDates = getRecentTradeDates(5);
    
    for (const tradeDate of recentDates) {
      const { data, error } = await supabaseStock
        .from('kpl_concept')
        .select('*')
        .eq('trade_date', tradeDate)
        .order('z_t_num', { ascending: false })
        .limit(20);
      
      if (error) {
        console.warn(`查询 ${tradeDate} 的开盘啦概念失败:`, error);
        continue;
      }
      
      if (data && data.length > 0) {
        console.log(`使用交易日 ${tradeDate} 的开盘啦概念数据`);
        return data.map((item: {
          ts_code: string;
          name: string;
          z_t_num: number;
          up_num: string;
          trade_date: string;
        }) => ({
          ts_code: item.ts_code,
          name: item.name,
          limit_up_count: item.z_t_num || 0,
          up_count: parseInt(item.up_num) || 0,
          trade_date: item.trade_date
        }));
      }
    }
    
    console.warn('未找到开盘啦概念数据，使用模拟数据');
    return mockKplConcepts;
  } catch (error) {
    console.error('获取开盘啦题材失败:', error);
    return mockKplConcepts;
  }
}

/**
 * 获取沪深股通Top10
 */
export async function fetchHsgtTop10() {
  try {
    const recentDates = getRecentTradeDates(3);
    
    for (const tradeDate of recentDates) {
      const { data, error } = await supabaseStock
        .from('hsgt_top10')
        .select('*')
        .eq('trade_date', tradeDate)
        .order('rank', { ascending: true })
        .limit(10);
      
      if (error) {
        console.warn(`查询 ${tradeDate} 的沪深股通Top10失败:`, error);
        continue;
      }
      
      if (data && data.length > 0) {
        console.log(`使用交易日 ${tradeDate} 的沪深股通数据，共 ${data.length} 条`);
        return data.map((item: {
          ts_code: string;
          name: string;
          close: number;
          change: number;
          rank: number;
          market_type: number;
          amount: number;
          net_amount: number | null;
        }) => ({
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
    }
    
    console.warn('未找到沪深股通数据，使用模拟数据');
    return mockHsgtTop10;
  } catch (error) {
    console.error('获取沪深股通Top10失败:', error);
    return mockHsgtTop10;
  }
}

// ===========================================
// 导出便捷方法
// ===========================================

export const stockService = {
  fetchIndices,
  fetchHotSectors,
  fetchAllSectors,
  fetchLimitUpList,
  fetchLimitDownList,
  fetchUpDownDistribution,
  fetchMarketSentiment,
  fetchNorthFlow,
  fetchNews,
  fetchRealTimeNews,
  fetchNewsBySource,
  NEWS_SOURCES,
  fetchStockList,
  fetchStockListWithQuotes,
  fetchStockDetail,
  fetchStockFullDetail,
  fetchStockDaily,
  fetchKLineData,
  fetchTimeSeriesData,
  fetchMoneyFlow,
  fetchStockMoneyFlow,
  fetchStrategies,
  saveStrategy,
  fetchKplConcepts,
  fetchHsgtTop10
};

export default stockService;

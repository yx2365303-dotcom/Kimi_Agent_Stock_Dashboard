import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// ===========================================
// Supabase 双数据库配置
// ===========================================

// 股票数据数据库配置
const stockSupabaseUrl = import.meta.env.VITE_SUPABASE_STOCK_URL;
const stockSupabaseAnonKey = import.meta.env.VITE_SUPABASE_STOCK_ANON_KEY;

// 财经资讯数据库配置
const newsSupabaseUrl = import.meta.env.VITE_SUPABASE_NEWS_URL;
const newsSupabaseAnonKey = import.meta.env.VITE_SUPABASE_NEWS_ANON_KEY;

// 检查配置
if (!stockSupabaseUrl || !stockSupabaseAnonKey) {
  console.warn('股票数据 Supabase 配置缺失，请检查环境变量 VITE_SUPABASE_STOCK_URL 和 VITE_SUPABASE_STOCK_ANON_KEY');
}

if (!newsSupabaseUrl || !newsSupabaseAnonKey) {
  console.warn('财经资讯 Supabase 配置缺失，请检查环境变量 VITE_SUPABASE_NEWS_URL 和 VITE_SUPABASE_NEWS_ANON_KEY');
}

// Supabase 客户端配置选项（启用 Realtime）
const clientOptions = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public' as const,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
};

/**
 * 股票数据 Supabase 客户端
 * 用于：股票基础信息、日线数据、板块数据、资金流向等
 */
export const supabaseStock = createClient<Database>(
  stockSupabaseUrl || '',
  stockSupabaseAnonKey || '',
  clientOptions
);

/**
 * 财经资讯 Supabase 客户端
 * 用于：新闻资讯、公告信息等
 */
export const supabaseNews = createClient<Database>(
  newsSupabaseUrl || '',
  newsSupabaseAnonKey || '',
  clientOptions
);

// 保持向后兼容，默认导出股票数据库客户端
export const supabase = supabaseStock;

/**
 * 检查股票数据库连接状态
 */
export async function checkStockConnection(): Promise<boolean> {
  try {
    const { error } = await supabaseStock.from('stock_basic').select('count', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
}

/**
 * 检查财经资讯数据库连接状态
 */
export async function checkNewsConnection(): Promise<boolean> {
  try {
    const { error } = await supabaseNews.from('news').select('count', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
}

/**
 * 检查所有 Supabase 连接状态
 */
export async function checkSupabaseConnection(): Promise<{
  stock: boolean;
  news: boolean;
  all: boolean;
}> {
  const [stock, news] = await Promise.all([
    checkStockConnection(),
    checkNewsConnection()
  ]);
  
  return {
    stock,
    news,
    all: stock && news
  };
}

// ===========================================
// Realtime 订阅管理
// ===========================================

/**
 * 新闻表配置（用于 Realtime 订阅）
 */
export const NEWS_TABLES = [
  'clscntelegraph_tb',      // 财联社
  'eastmoney724_tb',        // 东方财富
  'jin10data724_tb',        // 金十数据
  'gelonghui724_tb',        // 格隆汇
  'sina724_tb',             // 新浪财经
  'jqka724_tb',             // 同花顺
  'jrj724_tb',              // 金融界
  'futunn724_tb',           // 富途牛牛
  'ifeng724_tb',            // 凤凰财经
  'jin10qihuo724_tb',       // 金十期货
  'chinastarmarkettelegraph724_tb', // 科创板日报
];

// 存储活跃的 Realtime 订阅通道
const activeChannels: Map<string, RealtimeChannel> = new Map();

/**
 * 订阅新闻表的实时更新
 * @param tableName 表名
 * @param onInsert 新数据插入回调
 * @returns 取消订阅函数
 */
export function subscribeToNewsTable(
  tableName: string,
  onInsert: (payload: { new: Record<string, unknown> }) => void
): () => void {
  // 如果已存在该表的订阅，先取消
  const existingChannel = activeChannels.get(tableName);
  if (existingChannel) {
    supabaseNews.removeChannel(existingChannel);
    activeChannels.delete(tableName);
  }

  // 创建新的订阅通道
  const channel = supabaseNews
    .channel(`news-${tableName}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: tableName,
      },
      (payload) => {
        console.log(`[Realtime] 新数据来自 ${tableName}:`, payload);
        onInsert(payload as { new: Record<string, unknown> });
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime] ${tableName} 订阅状态:`, status);
    });

  activeChannels.set(tableName, channel);

  // 返回取消订阅函数
  return () => {
    supabaseNews.removeChannel(channel);
    activeChannels.delete(tableName);
    console.log(`[Realtime] 已取消 ${tableName} 订阅`);
  };
}

/**
 * 订阅所有新闻表的实时更新
 * @param onInsert 新数据插入回调（包含表名信息）
 * @returns 取消所有订阅函数
 */
export function subscribeToAllNewsTables(
  onInsert: (tableName: string, payload: { new: Record<string, unknown> }) => void
): () => void {
  const unsubscribeFns: Array<() => void> = [];

  NEWS_TABLES.forEach((tableName) => {
    const unsubscribe = subscribeToNewsTable(tableName, (payload) => {
      onInsert(tableName, payload);
    });
    unsubscribeFns.push(unsubscribe);
  });

  // 返回取消所有订阅的函数
  return () => {
    unsubscribeFns.forEach((fn) => fn());
    console.log('[Realtime] 已取消所有新闻表订阅');
  };
}

/**
 * 获取当前活跃的订阅数量
 */
export function getActiveSubscriptionCount(): number {
  return activeChannels.size;
}

export default supabase;

export type { RealtimeChannel };

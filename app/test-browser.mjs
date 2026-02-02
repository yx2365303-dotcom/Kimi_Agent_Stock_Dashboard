// 测试在浏览器中运行时会发生什么
import { createClient } from '@supabase/supabase-js';

const supabaseStock = createClient(
  'https://ezdcfwxrsmuwykhckmqq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZGNmd3hyc211d3lraGNrbXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxMzgyNTEsImV4cCI6MjA1MzcxNDI1MX0.iGz7308hgeTpAT0DfKdwb0MjShSiE6mzJ78HWcSoE80'
);

async function test() {
  console.time('total');
  
  // 测试1: index_basic
  console.time('index_basic');
  const { data: indices } = await supabaseStock
    .from('index_basic')
    .select('*')
    .in('ts_code', ['000001.SH', '399001.SZ', '399006.SZ']);
  console.timeEnd('index_basic');
  console.log('指数基础:', indices?.length, '条');
  
  // 测试2: limit_list_d - 直接获取最新
  console.time('limit_list_d');
  const { data: limitUp } = await supabaseStock
    .from('limit_list_d')
    .select('trade_date, ts_code, name')
    .eq('limit', 'U')
    .order('trade_date', { ascending: false })
    .limit(20);
  console.timeEnd('limit_list_d');
  console.log('涨停:', limitUp?.length, '条, 最新日期:', limitUp?.[0]?.trade_date);
  
  // 测试3: ths_daily - 直接获取最新
  console.time('ths_daily');
  const { data: sectors } = await supabaseStock
    .from('ths_daily')
    .select('trade_date, ts_code, pct_change')
    .order('trade_date', { ascending: false })
    .limit(50);
  console.timeEnd('ths_daily');
  console.log('板块日线:', sectors?.length, '条, 最新日期:', sectors?.[0]?.trade_date);
  
  // 测试4: hsgt_top10
  console.time('hsgt_top10');
  const { data: hsgt } = await supabaseStock
    .from('hsgt_top10')
    .select('trade_date, ts_code, name')
    .order('trade_date', { ascending: false })
    .limit(10);
  console.timeEnd('hsgt_top10');
  console.log('北向:', hsgt?.length, '条, 最新日期:', hsgt?.[0]?.trade_date);
  
  console.timeEnd('total');
}

test().catch(console.error);

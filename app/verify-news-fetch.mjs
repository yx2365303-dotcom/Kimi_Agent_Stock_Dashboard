// 快速验证：用 ORDER BY id DESC 查询所有 17 个新闻源
import { createClient } from '@supabase/supabase-js';

const newsUrl = 'https://xwxjkusajprsbfpkzitp.supabase.co';
const newsKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3eGprdXNhanByc2JmcGt6aXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0ODA4NzUsImV4cCI6MjA4NTA1Njg3NX0.72LPCWhQpx-dADnmBTOyZAjL-0UQl224DIKFGrRc2Sk';

const client = createClient(newsUrl, newsKey);

const SOURCES = [
  { key: 'snowball_influencer', name: '雪球大V', table: 'snowball_influencer_tb' },
  { key: 'weibo_influencer', name: '微博大V', table: 'weibo_influencer_tb' },
  { key: 'cls', name: '财联社', table: 'clscntelegraph_tb' },
  { key: 'eastmoney', name: '东方财富', table: 'eastmoney724_tb' },
  { key: 'jin10', name: '金十数据', table: 'jin10data724_tb' },
  { key: 'gelonghui', name: '格隆汇', table: 'gelonghui724_tb' },
  { key: 'sina', name: '新浪财经', table: 'sina724_tb' },
  { key: 'jqka', name: '同花顺', table: 'jqka724_tb' },
  { key: 'jrj', name: '金融界', table: 'jrj724_tb' },
  { key: 'futunn', name: '富途牛牛', table: 'futunn724_tb' },
  { key: 'ifeng', name: '凤凰财经', table: 'ifeng724_tb' },
  { key: 'jin10qihuo', name: '金十期货', table: 'jin10qihuo724_tb' },
  { key: 'snowball', name: '雪球', table: 'snowball724_tb' },
  { key: 'wallstreetcn', name: '华尔街见闻', table: 'wallstreetcn_tb' },
  { key: 'xuangutong', name: '选股通', table: 'xuangutong724_tb' },
  { key: 'yicai', name: '第一财经', table: 'yicai724_tb' },
  { key: 'yuncaijing', name: '云财经', table: 'yuncaijing724_tb' },
];

// 模拟实际代码的并发度3
async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++; 
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  console.log('=== 使用 ORDER BY id DESC + 并发度3 验证全部 17 源 ===\n');
  
  const totalStart = Date.now();
  
  const results = await mapWithConcurrency(SOURCES, 3, async (src) => {
    const start = Date.now();
    const { data, error } = await client
      .from(src.table)
      .select('id, title, content, display_time, images')
      .order('id', { ascending: false })
      .limit(50);
    const ms = Date.now() - start;
    
    if (error) {
      console.log(`❌ ${src.name}(${src.table}): ${error.message} [${ms}ms]`);
      return { name: src.name, count: 0, ms, error: true };
    }
    
    const count = data?.length || 0;
    const latest = data?.[0]?.display_time 
      ? new Date(data[0].display_time * 1000).toISOString().slice(0, 16) 
      : 'N/A';
    console.log(`✅ ${src.name}: ${count}条 [${ms}ms] 最新: ${latest}`);
    return { name: src.name, count, ms, error: false };
  });
  
  const totalMs = Date.now() - totalStart;
  const totalItems = results.reduce((s, r) => s + r.count, 0);
  const successCount = results.filter(r => !r.error).length;
  const failCount = results.filter(r => r.error).length;
  
  console.log(`\n=== 汇总 ===`);
  console.log(`成功: ${successCount}/17, 失败: ${failCount}`);
  console.log(`总数据量: ${totalItems}条`);
  console.log(`总耗时: ${totalMs}ms`);
  console.log(`平均每源: ${Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length)}ms`);
}

main().catch(console.error);

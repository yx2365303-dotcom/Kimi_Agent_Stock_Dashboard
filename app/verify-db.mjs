import { createClient } from '@supabase/supabase-js';

// 使用 .env 文件中的正确配置
const supabaseStock = createClient(
  'https://ezdcfwxrsmuwykhckmqq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZGNmd3hyc211d3lraGNrbXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDgyNjMsImV4cCI6MjA4MzQyNDI2M30.MlH50Mot4l90WVSRKqQV-4jPBsv_8vJELtAm58RFiuQ'
);

async function test() {
  console.log('使用正确的 API key 测试...\n');
  
  // 测试 index_basic
  console.log('=== 测试 index_basic ===');
  const result1 = await supabaseStock.from('index_basic').select('*').limit(3);
  if (result1.error) {
    console.log('错误:', result1.error.message);
  } else {
    console.log('成功! 数据:', result1.data?.length, '条');
    console.log('示例:', result1.data?.[0]);
  }
  
  // 测试 limit_list_d
  console.log('\n=== 测试 limit_list_d ===');
  const result2 = await supabaseStock.from('limit_list_d').select('*').limit(3);
  if (result2.error) {
    console.log('错误:', result2.error.message);
  } else {
    console.log('成功! 数据:', result2.data?.length, '条');
    console.log('示例:', result2.data?.[0]);
  }
  
  // 测试 ths_index
  console.log('\n=== 测试 ths_index ===');
  const result3 = await supabaseStock.from('ths_index').select('*').limit(3);
  if (result3.error) {
    console.log('错误:', result3.error.message);
  } else {
    console.log('成功! 数据:', result3.data?.length, '条');
    console.log('示例:', result3.data?.[0]);
  }
}

test().catch(console.error);

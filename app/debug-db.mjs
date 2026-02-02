import { createClient } from '@supabase/supabase-js';

const supabaseStock = createClient(
  'https://ezdcfwxrsmuwykhckmqq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6ZGNmd3hyc211d3lraGNrbXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgxMzgyNTEsImV4cCI6MjA1MzcxNDI1MX0.iGz7308hgeTpAT0DfKdwb0MjShSiE6mzJ78HWcSoE80'
);

async function test() {
  // 测试 index_basic
  console.log('=== 测试 index_basic ===');
  const result1 = await supabaseStock.from('index_basic').select('*').limit(3);
  console.log('data:', result1.data);
  console.log('error:', result1.error);
  
  // 测试 limit_list_d
  console.log('\n=== 测试 limit_list_d ===');
  const result2 = await supabaseStock.from('limit_list_d').select('*').limit(3);
  console.log('data:', result2.data);
  console.log('error:', result2.error);
}

test().catch(console.error);

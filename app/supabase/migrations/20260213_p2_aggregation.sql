-- P2: 聚合查询 + 索引优化
-- 执行方式: 在 Supabase SQL Editor 中运行，或纳入 migration 管理流程。

-- =========================================
-- 索引优化
-- =========================================

create index if not exists idx_daily_trade_date_ts_code
  on public.daily (trade_date desc, ts_code);

create index if not exists idx_daily_basic_trade_date_ts_code
  on public.daily_basic (trade_date desc, ts_code);

create index if not exists idx_limit_list_d_trade_date_limit
  on public.limit_list_d (trade_date desc, "limit");

create index if not exists idx_ths_hot_type_trade_date_rank
  on public.ths_hot (data_type, trade_date desc, rank asc);

create index if not exists idx_moneyflow_hsgt_trade_date
  on public.moneyflow_hsgt (trade_date desc);

create index if not exists idx_top_list_trade_date_net_amount
  on public.top_list (trade_date desc, net_amount desc);

create index if not exists idx_top_inst_ts_code_trade_date
  on public.top_inst (ts_code, trade_date desc);

create index if not exists idx_realtime_quote_cache_ts_code_date_time
  on public.realtime_quote_cache (ts_code, date desc, time desc);

-- 新闻源 display_time 索引（仅为实际存在且包含 display_time 的表创建）
do $$
declare
  rec record;
begin
  for rec in
    select * from (
      values
        ('idx_clscntelegraph_tb_display_time', 'clscntelegraph_tb'),
        ('idx_eastmoney724_tb_display_time', 'eastmoney724_tb'),
        ('idx_jin10data724_tb_display_time', 'jin10data724_tb'),
        ('idx_gelonghui724_tb_display_time', 'gelonghui724_tb'),
        ('idx_sina724_tb_display_time', 'sina724_tb'),
        ('idx_jqka724_tb_display_time', 'jqka724_tb'),
        ('idx_jrj724_tb_display_time', 'jrj724_tb'),
        ('idx_futunn724_tb_display_time', 'futunn724_tb'),
        ('idx_ifeng724_tb_display_time', 'ifeng724_tb'),
        ('idx_jin10qihuo724_tb_display_time', 'jin10qihuo724_tb'),
        ('idx_chinastarmarkettelegraph_tb_display_time', 'chinastarmarkettelegraph_tb'),
        ('idx_chinastarmarkettelegraph724_tb_display_time', 'chinastarmarkettelegraph724_tb'),
        ('idx_snowball724_tb_display_time', 'snowball724_tb'),
        ('idx_wallstreetcn_tb_display_time', 'wallstreetcn_tb'),
        ('idx_xuangutong724_tb_display_time', 'xuangutong724_tb'),
        ('idx_yicai724_tb_display_time', 'yicai724_tb'),
        ('idx_yuncaijing724_tb_display_time', 'yuncaijing724_tb'),
        ('idx_snowball_influencer_tb_display_time', 'snowball_influencer_tb'),
        ('idx_weibo_influencer_tb_display_time', 'weibo_influencer_tb')
    ) as x(index_name, table_name)
  loop
    if to_regclass('public.' || quote_ident(rec.table_name)) is not null
      and exists (
        select 1
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name = rec.table_name
          and c.column_name = 'display_time'
      )
    then
      execute format(
        'create index if not exists %I on public.%I (display_time desc)',
        rec.index_name,
        rec.table_name
      );
    end if;
  end loop;
end;
$$;

-- =========================================
-- 市场概览聚合 RPC
-- =========================================

create or replace function public.get_market_overview_bundle()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_latest_limit_date text;
  v_latest_daily_date text;
  v_latest_hsgt_date text;
  v_latest_ths_daily_date text;

  v_indices jsonb := '[]'::jsonb;
  v_sectors jsonb := '[]'::jsonb;
  v_limit_up_list jsonb := '[]'::jsonb;
  v_hsgt_top10 jsonb := '[]'::jsonb;
  v_up_down jsonb := '{}'::jsonb;
  v_north_flow jsonb := '{}'::jsonb;
  v_enhanced jsonb := '{}'::jsonb;

  v_up_count integer := 0;
  v_down_count integer := 0;
  v_flat_count integer := 0;
  v_limit_up_count integer := 0;
  v_limit_down_count integer := 0;
  v_zhaban_count integer := 0;
  v_total_attempts integer := 0;
  v_fengban_rate numeric := 0;
  v_max_lianban integer := 0;
  v_score numeric := 50;
begin
  select trade_date into v_latest_limit_date
  from public.limit_list_d
  order by trade_date desc
  limit 1;

  select trade_date into v_latest_daily_date
  from public.daily
  order by trade_date desc
  limit 1;

  select trade_date into v_latest_hsgt_date
  from public.hsgt_top10
  order by trade_date desc
  limit 1;

  select trade_date into v_latest_ths_daily_date
  from public.ths_daily
  order by trade_date desc
  limit 1;

  -- 指数
  with latest_index as (
    select distinct on (d.ts_code)
      d.ts_code,
      d.trade_date,
      d.close,
      d.open,
      d.change,
      d.pct_chg,
      d.vol,
      d.amount,
      d.high,
      d.low,
      d.pre_close
    from public.index_daily d
    where d.ts_code in ('000001.SH', '399001.SZ', '399006.SZ', '000688.SH', '899050.BJ')
    order by d.ts_code, d.trade_date desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'code', i.ts_code,
    'name', coalesce(b.name, i.ts_code),
    'current', coalesce(i.close, 0),
    'change', coalesce(i.change, 0),
    'pct_change', coalesce(i.pct_chg, 0),
    'volume', coalesce(i.vol, 0),
    'amount', coalesce(i.amount, 0),
    'high', coalesce(i.high, 0),
    'low', coalesce(i.low, 0),
    'open', coalesce(i.open, 0),
    'pre_close', coalesce(i.pre_close, 0)
  )), '[]'::jsonb)
  into v_indices
  from latest_index i
  left join public.index_basic b on b.ts_code = i.ts_code;

  -- 板块榜
  select coalesce(jsonb_agg(jsonb_build_object(
    'ts_code', d.ts_code,
    'name', coalesce(i.name, d.ts_code),
    'pct_change', coalesce(d.pct_change, 0),
    'volume', coalesce(d.vol, 0),
    'amount', 0,
    'up_count', 0,
    'down_count', 0,
    'limit_up_count', 0,
    'net_inflow', 0,
    'heat_score', 50 + coalesce(d.pct_change, 0) * 10,
    'turnover_rate', coalesce(d.turnover_rate, 0)
  )), '[]'::jsonb)
  into v_sectors
  from (
    select *
    from public.ths_daily
    where trade_date = v_latest_ths_daily_date
    order by pct_change desc
    limit 40
  ) d
  left join public.ths_index i on i.ts_code = d.ts_code;

  -- 涨停榜
  select coalesce(jsonb_agg(jsonb_build_object(
    'ts_code', ts_code,
    'name', coalesce(name, ''),
    'trade_date', trade_date,
    'close', coalesce(close, 0),
    'pct_chg', coalesce(pct_chg, 0),
    'limit_amount', coalesce(limit_amount, 0),
    'first_time', coalesce(first_time, ''),
    'last_time', coalesce(last_time, ''),
    'open_times', coalesce(open_times, 0),
    'limit_times', coalesce(limit_times, 0),
    'tag', coalesce(industry, ''),
    'theme', ''
  )), '[]'::jsonb)
  into v_limit_up_list
  from (
    select *
    from public.limit_list_d
    where trade_date = v_latest_limit_date
      and "limit" = 'U'
    order by first_time asc
    limit 20
  ) t;

  -- 涨跌统计
  select
    count(*) filter (where coalesce(pct_chg, 0) > 0),
    count(*) filter (where coalesce(pct_chg, 0) < 0),
    count(*) filter (where coalesce(pct_chg, 0) = 0)
  into v_up_count, v_down_count, v_flat_count
  from public.daily
  where trade_date = v_latest_daily_date;

  select
    count(*) filter (where "limit" = 'U'),
    count(*) filter (where "limit" = 'D'),
    count(*) filter (where "limit" = 'Z'),
    coalesce(max(limit_times), 0)
  into v_limit_up_count, v_limit_down_count, v_zhaban_count, v_max_lianban
  from public.limit_list_d
  where trade_date = v_latest_limit_date;

  v_total_attempts := v_limit_up_count + v_zhaban_count;
  if v_total_attempts > 0 then
    v_fengban_rate := (v_total_attempts - v_zhaban_count)::numeric / v_total_attempts::numeric * 100;
  else
    v_fengban_rate := 0;
  end if;

  v_up_down := jsonb_build_object(
    'up_count', v_up_count,
    'down_count', v_down_count,
    'flat_count', v_flat_count,
    'limit_up', v_limit_up_count,
    'limit_down', v_limit_down_count,
    'distribution', '[]'::jsonb,
    'lianbanStats', jsonb_build_object(
      'oneBoard', 0,
      'twoBoard', 0,
      'threeBoard', 0,
      'fourBoard', 0,
      'fivePlus', 0
    ),
    'zhabanCount', v_zhaban_count,
    'fengbanRate', round(v_fengban_rate, 2),
    'topIndustries', '[]'::jsonb,
    'maxLianban', v_max_lianban,
    'totalAttempts', v_total_attempts
  );

  -- 北向资金
  with latest_north as (
    select *
    from public.moneyflow_hsgt
    order by trade_date desc
    limit 30
  )
  select jsonb_build_object(
    'net_inflow', coalesce((select north_money::numeric / 10000 from latest_north order by trade_date desc limit 1), 0),
    'sh_inflow', coalesce((select hgt::numeric / 10000 from latest_north order by trade_date desc limit 1), 0),
    'sz_inflow', coalesce((select sgt::numeric / 10000 from latest_north order by trade_date desc limit 1), 0),
    'cumulative_30d', coalesce((select sum(north_money::numeric / 10000) from latest_north), 0),
    'cumulative_week', coalesce((select sum(north_money::numeric / 10000) from (select * from latest_north order by trade_date desc limit 5) x), 0),
    'change_from_yesterday', 0,
    'change_percent', 0,
    'sh_buy', 0,
    'sh_sell', 0,
    'sz_buy', 0,
    'sz_sell', 0,
    'time_series', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', substr(trade_date, 5, 2) || '-' || substr(trade_date, 7, 2),
        'amount', north_money::numeric / 10000,
        'hgt', hgt::numeric / 10000,
        'sgt', sgt::numeric / 10000
      ) order by trade_date asc)
      from latest_north
    ), '[]'::jsonb)
  )
  into v_north_flow;

  -- 沪深股通 Top10
  select coalesce(jsonb_agg(jsonb_build_object(
    'ts_code', ts_code,
    'name', name,
    'close', coalesce(close, 0),
    'change', coalesce(change, 0),
    'rank', rank,
    'market_type', case market_type when 1 then '沪股通' when 2 then '深股通' else '港股通' end,
    'amount', coalesce(amount, 0),
    'net_amount', net_amount
  ) order by rank asc), '[]'::jsonb)
  into v_hsgt_top10
  from public.hsgt_top10
  where trade_date = v_latest_hsgt_date;

  -- 简化情绪
  v_score := least(100, greatest(0,
    (case when (v_up_count + v_down_count + v_flat_count) > 0
      then (v_up_count::numeric / (v_up_count + v_down_count + v_flat_count)::numeric) * 100
      else 50 end) * 0.5
    + (case when (v_limit_up_count + v_limit_down_count) > 0
      then (v_limit_up_count::numeric / (v_limit_up_count + v_limit_down_count)::numeric) * 100
      else 50 end) * 0.2
    + coalesce(v_fengban_rate, 50) * 0.3
  ));

  v_enhanced := jsonb_build_object(
    'sentiment', jsonb_build_object(
      'score', round(v_score),
      'label', case
        when v_score >= 80 then '极度贪婪'
        when v_score >= 65 then '贪婪'
        when v_score >= 55 then '偏多'
        when v_score <= 20 then '极度恐惧'
        when v_score <= 35 then '恐惧'
        when v_score <= 45 then '偏空'
        else '中性'
      end,
      'trend', case
        when v_up_count > v_down_count then 'up'
        when v_up_count < v_down_count then 'down'
        else 'flat'
      end
    ),
    'thermometer', jsonb_build_object(
      'upCount', v_up_count,
      'downCount', v_down_count,
      'flatCount', v_flat_count,
      'limitUp', v_limit_up_count,
      'limitDown', v_limit_down_count,
      'upRatio', case when (v_up_count + v_down_count + v_flat_count) > 0
        then round(v_up_count::numeric / (v_up_count + v_down_count + v_flat_count)::numeric * 100)
        else 50 end
    ),
    'capital', jsonb_build_object(
      'totalAmount', 0,
      'amountChange', 0,
      'avgTurnover', 0,
      'northFlow', coalesce((v_north_flow ->> 'net_inflow')::numeric, 0)
    ),
    'limitStats', jsonb_build_object(
      'lianbanStats', jsonb_build_object('oneBoard', 0, 'twoBoard', 0, 'threeBoard', 0, 'fourBoard', 0, 'fivePlus', 0),
      'zhabanCount', v_zhaban_count,
      'fengbanRate', round(v_fengban_rate, 2),
      'maxLianban', v_max_lianban,
      'topIndustries', '[]'::jsonb
    )
  );

  return jsonb_build_object(
    'indices', v_indices,
    'sectors', v_sectors,
    'limitUpList', v_limit_up_list,
    'upDownDistribution', v_up_down,
    'enhancedSentiment', v_enhanced,
    'northFlow', v_north_flow,
    'hsgtTop10', v_hsgt_top10,
    'updateTime', to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
end;
$$;

grant execute on function public.get_market_overview_bundle() to anon, authenticated;

-- =========================================
-- 板块热点聚合 RPC
-- =========================================

create or replace function public.get_sector_heat_bundle(p_limit integer default 20)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_latest_hot_date text;
  v_latest_kpl_date text;
  v_industry jsonb := '[]'::jsonb;
  v_concept jsonb := '[]'::jsonb;
  v_hot_stock jsonb := '[]'::jsonb;
  v_kpl jsonb := '[]'::jsonb;
  v_heatmap jsonb := '[]'::jsonb;
begin
  select trade_date into v_latest_hot_date
  from public.ths_hot
  order by trade_date desc
  limit 1;

  select trade_date into v_latest_kpl_date
  from public.kpl_concept
  order by trade_date desc
  limit 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'ts_code', ts_code,
    'ts_name', ts_name,
    'rank', rank,
    'pct_change', coalesce(pct_change, 0),
    'hot', coalesce(hot, 0)
  ) order by rank asc), '[]'::jsonb)
  into v_industry
  from public.ths_hot
  where trade_date = v_latest_hot_date
    and data_type = '行业板块'
  limit 30;

  select coalesce(jsonb_agg(jsonb_build_object(
    'ts_code', ts_code,
    'ts_name', ts_name,
    'rank', rank,
    'pct_change', coalesce(pct_change, 0),
    'hot', coalesce(hot, 0)
  ) order by rank asc), '[]'::jsonb)
  into v_concept
  from public.ths_hot
  where trade_date = v_latest_hot_date
    and data_type = '概念板块'
  limit 30;

  select coalesce(jsonb_agg(jsonb_build_object(
    'ts_code', ts_code,
    'ts_name', ts_name,
    'rank', rank,
    'pct_change', coalesce(pct_change, 0),
    'hot', coalesce(hot, 0),
    'concepts', coalesce(concept, '[]')
  ) order by rank asc), '[]'::jsonb)
  into v_hot_stock
  from public.ths_hot
  where trade_date = v_latest_hot_date
    and data_type = '热股'
  limit 20;

  select coalesce(jsonb_agg(jsonb_build_object(
    'ts_code', ts_code,
    'name', name,
    'limit_up_count', coalesce(z_t_num, 0),
    'up_count', coalesce(nullif(up_num, '')::integer, 0),
    'trade_date', trade_date
  ) order by z_t_num desc), '[]'::jsonb)
  into v_kpl
  from public.kpl_concept
  where trade_date = v_latest_kpl_date
  limit 20;

  with merged as (
    select ts_name, coalesce(pct_change, 0) as pct_change, coalesce(hot, 0) as hot, 'industry'::text as type
    from public.ths_hot
    where trade_date = v_latest_hot_date and data_type = '行业板块'
    union all
    select ts_name, coalesce(pct_change, 0), coalesce(hot, 0), 'concept'::text
    from public.ths_hot
    where trade_date = v_latest_hot_date and data_type = '概念板块'
  ), ordered as (
    select *
    from merged
    order by
      case when pct_change > 0 then 0 else 1 end,
      abs(pct_change) desc
    limit p_limit
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', ts_name,
    'value', pct_change,
    'size', greatest(30, least(100, round((hot / nullif((select max(hot) from ordered), 0)) * 100))),
    'type', type
  )), '[]'::jsonb)
  into v_heatmap
  from ordered;

  return jsonb_build_object(
    'heatmapData', v_heatmap,
    'industryHotList', v_industry,
    'conceptHotList', v_concept,
    'hotStockList', v_hot_stock,
    'kplConcepts', v_kpl
  );
end;
$$;

grant execute on function public.get_sector_heat_bundle(integer) to anon, authenticated;

-- =========================================
-- 实时新闻聚合 RPC
-- =========================================

create or replace function public.get_realtime_news_aggregated(
  p_sources text[] default null,
  p_limit_per_source integer default 30,
  p_total_limit integer default 100,
  p_date_filter date default null
)
returns table (
  id text,
  title text,
  content text,
  source text,
  source_key text,
  display_time bigint,
  images text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  v_sql text := '';
  v_start_ts bigint;
  v_end_ts bigint;
  v_limit_per_source integer := greatest(coalesce(p_limit_per_source, 30), 1);
  v_total_limit integer := greatest(coalesce(p_total_limit, 100), 1);
begin
  if p_date_filter is not null then
    v_start_ts := extract(epoch from p_date_filter::timestamp)::bigint;
    v_end_ts := extract(epoch from (p_date_filter::timestamp + interval '1 day' - interval '1 second'))::bigint;
  else
    v_start_ts := null;
    v_end_ts := null;
  end if;

  for rec in
    select * from (
      values
        ('snowball_influencer', '雪球大V', 'snowball_influencer_tb'),
        ('weibo_influencer', '微博大V', 'weibo_influencer_tb'),
        ('cls', '财联社', 'clscntelegraph_tb'),
        ('eastmoney', '东方财富', 'eastmoney724_tb'),
        ('jin10', '金十数据', 'jin10data724_tb'),
        ('gelonghui', '格隆汇', 'gelonghui724_tb'),
        ('sina', '新浪财经', 'sina724_tb'),
        ('jqka', '同花顺', 'jqka724_tb'),
        ('jrj', '金融界', 'jrj724_tb'),
        ('futunn', '富途牛牛', 'futunn724_tb'),
        ('ifeng', '凤凰财经', 'ifeng724_tb'),
        ('jin10qihuo', '金十期货', 'jin10qihuo724_tb'),
        ('chinastar', '科创板日报', 'chinastarmarkettelegraph_tb'),
        ('snowball', '雪球', 'snowball724_tb'),
        ('wallstreetcn', '华尔街见闻', 'wallstreetcn_tb'),
        ('xuangutong', '选股通', 'xuangutong724_tb'),
        ('yicai', '第一财经', 'yicai724_tb'),
        ('yuncaijing', '云财经', 'yuncaijing724_tb')
    ) as src(source_key, source_name, table_name)
    where (
      p_sources is null
      or array_length(p_sources, 1) is null
      or source_key = any(p_sources)
    )
      and to_regclass('public.' || quote_ident(table_name)) is not null
      and not exists (
        select 1
        from unnest(array['id', 'title', 'content', 'display_time']) as req(column_name)
        where not exists (
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = table_name
            and c.column_name = req.column_name
        )
      )
  loop
    if v_sql <> '' then
      v_sql := v_sql || ' union all ';
    end if;

    v_sql := v_sql || format(
      '(select %L || ''_'' || t.id::text as id,
               coalesce(t.title, '''')::text as title,
               coalesce(t.content, '''')::text as content,
               %L::text as source,
               %L::text as source_key,
               t.display_time::bigint as display_time,
               coalesce((to_jsonb(t) ->> ''images''), '''')::text as images
         from public.%I t
        where ($1 is null or t.display_time >= $1)
          and ($2 is null or t.display_time <= $2)
        order by t.display_time desc
        limit %s)',
      rec.source_key,
      rec.source_name,
      rec.source_key,
      rec.table_name,
      v_limit_per_source
    );
  end loop;

  if v_sql = '' then
    return;
  end if;

  return query execute
    'select * from (' || v_sql || ') merged order by display_time desc limit ' || v_total_limit
    using v_start_ts, v_end_ts;
end;
$$;

grant execute on function public.get_realtime_news_aggregated(text[], integer, integer, date) to anon, authenticated;

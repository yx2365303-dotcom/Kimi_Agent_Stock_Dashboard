-- P0: 性能优化 — 新增聚合 RPC 减少前端全量扫描
-- 执行方式: 在 Supabase SQL Editor 中运行

-- =========================================
-- 1. 涨跌分布 RPC（替代前端全量 daily 扫描）
-- 原前端逻辑：SELECT pct_chg FROM daily WHERE trade_date = X（约 5000 行）
-- 新逻辑：在 SQL 中直接 COUNT 各区间，仅返回聚合结果
-- =========================================

CREATE OR REPLACE FUNCTION public.get_up_down_distribution(p_trade_date text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_date text;
  v_limit_date text;
  v_up_count integer := 0;
  v_down_count integer := 0;
  v_flat_count integer := 0;
  v_distribution jsonb;
  v_limit_up_count integer := 0;
  v_limit_down_count integer := 0;
  v_zhaban_count integer := 0;
  v_max_lianban integer := 0;
  v_total_attempts integer := 0;
  v_fengban_rate numeric := 0;
  v_lianban_stats jsonb;
  v_top_industries jsonb;
BEGIN
  -- 获取最新日期
  IF p_trade_date IS NOT NULL THEN
    v_daily_date := p_trade_date;
  ELSE
    SELECT trade_date INTO v_daily_date
    FROM public.daily
    ORDER BY trade_date DESC
    LIMIT 1;
  END IF;

  IF v_daily_date IS NULL THEN
    RETURN NULL;
  END IF;

  -- 获取 limit_list_d 最新日期
  SELECT trade_date INTO v_limit_date
  FROM public.limit_list_d
  ORDER BY trade_date DESC
  LIMIT 1;

  -- 涨跌平统计 + 涨跌幅区间分布（一次查询完成）
  SELECT
    COUNT(*) FILTER (WHERE pct_chg > 0),
    COUNT(*) FILTER (WHERE pct_chg < 0),
    COUNT(*) FILTER (WHERE pct_chg = 0 OR pct_chg IS NULL)
  INTO v_up_count, v_down_count, v_flat_count
  FROM public.daily
  WHERE trade_date = v_daily_date;

  -- 涨跌幅区间分布
  SELECT jsonb_agg(jsonb_build_object('range', r.range, 'count', r.cnt, 'color', r.color) ORDER BY r.ord)
  INTO v_distribution
  FROM (
    SELECT '涨停' AS range, COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) >= 9.9) AS cnt, '#ef4444' AS color, 1 AS ord FROM public.daily WHERE trade_date = v_daily_date
    UNION ALL SELECT '7-10%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) >= 7 AND COALESCE(pct_chg, 0) < 9.9), '#f87171', 2 FROM public.daily WHERE trade_date = v_daily_date
    UNION ALL SELECT '5-7%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) >= 5 AND COALESCE(pct_chg, 0) < 7), '#fb923c', 3 FROM public.daily WHERE trade_date = v_daily_date
    UNION ALL SELECT '3-5%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) >= 3 AND COALESCE(pct_chg, 0) < 5), '#fbbf24', 4 FROM public.daily WHERE trade_date = v_daily_date
    UNION ALL SELECT '1-3%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) >= 1 AND COALESCE(pct_chg, 0) < 3), '#a3e635', 5 FROM public.daily WHERE trade_date = v_daily_date
    UNION ALL SELECT '0-1%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) > 0 AND COALESCE(pct_chg, 0) < 1), '#4ade80', 6 FROM public.daily WHERE trade_date = v_daily_date
    UNION ALL SELECT '平', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) = 0), '#9ca3af', 7 FROM public.daily WHERE trade_date = v_daily_date
    UNION ALL SELECT '-1-0%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) > -1 AND COALESCE(pct_chg, 0) < 0), '#38bdf8', 8 FROM public.daily WHERE trade_date = v_daily_date
    UNION ALL SELECT '-3--1%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) > -3 AND COALESCE(pct_chg, 0) <= -1), '#60a5fa', 9 FROM public.daily WHERE trade_date = v_daily_date
    UNION ALL SELECT '-5--3%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) > -5 AND COALESCE(pct_chg, 0) <= -3), '#818cf8', 10 FROM public.daily WHERE trade_date = v_daily_date
    UNION ALL SELECT '-7--5%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) > -7 AND COALESCE(pct_chg, 0) <= -5), '#a78bfa', 11 FROM public.daily WHERE trade_date = v_daily_date
    UNION ALL SELECT '-10--7%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) > -9.9 AND COALESCE(pct_chg, 0) <= -7), '#c084fc', 12 FROM public.daily WHERE trade_date = v_daily_date
    UNION ALL SELECT '跌停', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) <= -9.9), '#22c55e', 13 FROM public.daily WHERE trade_date = v_daily_date
  ) r;

  -- 涨跌停 & 连板统计
  SELECT
    COUNT(*) FILTER (WHERE "limit" = 'U'),
    COUNT(*) FILTER (WHERE "limit" = 'D'),
    COUNT(*) FILTER (WHERE "limit" = 'Z'),
    COALESCE(MAX(limit_times), 0)
  INTO v_limit_up_count, v_limit_down_count, v_zhaban_count, v_max_lianban
  FROM public.limit_list_d
  WHERE trade_date = COALESCE(v_limit_date, v_daily_date);

  v_total_attempts := v_limit_up_count + v_zhaban_count;
  IF v_total_attempts > 0 THEN
    v_fengban_rate := (v_total_attempts - v_zhaban_count)::numeric / v_total_attempts::numeric * 100;
  END IF;

  -- 连板分布
  SELECT jsonb_build_object(
    'oneBoard', COUNT(*) FILTER (WHERE limit_times = 1),
    'twoBoard', COUNT(*) FILTER (WHERE limit_times = 2),
    'threeBoard', COUNT(*) FILTER (WHERE limit_times = 3),
    'fourBoard', COUNT(*) FILTER (WHERE limit_times = 4),
    'fivePlus', COUNT(*) FILTER (WHERE limit_times >= 5)
  )
  INTO v_lianban_stats
  FROM public.limit_list_d
  WHERE trade_date = COALESCE(v_limit_date, v_daily_date)
    AND "limit" = 'U';

  -- TOP3 涨停行业
  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', industry, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
  INTO v_top_industries
  FROM (
    SELECT COALESCE(industry, '其他') AS industry, COUNT(*) AS cnt
    FROM public.limit_list_d
    WHERE trade_date = COALESCE(v_limit_date, v_daily_date)
      AND "limit" = 'U'
    GROUP BY COALESCE(industry, '其他')
    ORDER BY cnt DESC
    LIMIT 3
  ) t;

  RETURN jsonb_build_object(
    'up_count', v_up_count,
    'down_count', v_down_count,
    'flat_count', v_flat_count,
    'limit_up', v_limit_up_count,
    'limit_down', v_limit_down_count,
    'distribution', COALESCE(v_distribution, '[]'::jsonb),
    'lianbanStats', COALESCE(v_lianban_stats, '{"oneBoard":0,"twoBoard":0,"threeBoard":0,"fourBoard":0,"fivePlus":0}'::jsonb),
    'zhabanCount', v_zhaban_count,
    'fengbanRate', ROUND(v_fengban_rate, 2),
    'topIndustries', COALESCE(v_top_industries, '[]'::jsonb),
    'maxLianban', v_max_lianban,
    'totalAttempts', v_total_attempts
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_up_down_distribution(text) TO anon, authenticated;

-- =========================================
-- 2. 每日成交额统计 RPC（替代前端全量 daily SUM）
-- 原前端逻辑：两天各 SELECT amount FROM daily（约 10000 行）前端 SUM
-- 新逻辑：数据库侧 SUM/AVG，仅返回 3 个数字
-- =========================================

CREATE OR REPLACE FUNCTION public.get_daily_total_amount(p_trade_date text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_latest_date text;
  v_prev_date text;
  v_total_amount numeric := 0;
  v_prev_amount numeric := 0;
  v_amount_change numeric := 0;
  v_avg_turnover numeric := 0;
BEGIN
  -- 获取最新日期
  IF p_trade_date IS NOT NULL THEN
    v_latest_date := p_trade_date;
  ELSE
    SELECT trade_date INTO v_latest_date
    FROM public.daily
    ORDER BY trade_date DESC
    LIMIT 1;
  END IF;

  IF v_latest_date IS NULL THEN
    RETURN jsonb_build_object('totalAmount', 0, 'amountChange', 0, 'avgTurnover', 0);
  END IF;

  -- 当日成交额（亿元）
  SELECT COALESCE(SUM(amount), 0) / 100000000.0
  INTO v_total_amount
  FROM public.daily
  WHERE trade_date = v_latest_date;

  -- 前一交易日（从数据中取，而非日历推算）
  SELECT trade_date INTO v_prev_date
  FROM public.daily
  WHERE trade_date < v_latest_date
  GROUP BY trade_date
  ORDER BY trade_date DESC
  LIMIT 1;

  -- 前日成交额
  IF v_prev_date IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) / 100000000.0
    INTO v_prev_amount
    FROM public.daily
    WHERE trade_date = v_prev_date;

    IF v_prev_amount > 0 THEN
      v_amount_change := ((v_total_amount - v_prev_amount) / v_prev_amount) * 100;
    END IF;
  END IF;

  -- 平均换手率
  SELECT COALESCE(AVG(turnover_rate), 0)
  INTO v_avg_turnover
  FROM public.daily_basic
  WHERE trade_date = v_latest_date
    AND turnover_rate IS NOT NULL
    AND turnover_rate > 0;

  RETURN jsonb_build_object(
    'totalAmount', ROUND(v_total_amount, 2),
    'amountChange', ROUND(v_amount_change, 2),
    'avgTurnover', ROUND(v_avg_turnover, 4)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_total_amount(text) TO anon, authenticated;

-- =========================================
-- 3. 更新 get_market_overview_bundle 以使用新的子 RPC
-- 在 enhanced 的 capital 字段中填充成交额数据
-- =========================================

CREATE OR REPLACE FUNCTION public.get_market_overview_bundle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
  v_daily_amount jsonb := '{}'::jsonb;

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
BEGIN
  SELECT trade_date INTO v_latest_limit_date
  FROM public.limit_list_d
  ORDER BY trade_date DESC
  LIMIT 1;

  SELECT trade_date INTO v_latest_daily_date
  FROM public.daily
  ORDER BY trade_date DESC
  LIMIT 1;

  SELECT trade_date INTO v_latest_hsgt_date
  FROM public.hsgt_top10
  ORDER BY trade_date DESC
  LIMIT 1;

  SELECT trade_date INTO v_latest_ths_daily_date
  FROM public.ths_daily
  ORDER BY trade_date DESC
  LIMIT 1;

  -- 指数
  WITH latest_index AS (
    SELECT DISTINCT ON (d.ts_code)
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
    FROM public.index_daily d
    WHERE d.ts_code IN ('000001.SH', '399001.SZ', '399006.SZ', '000688.SH', '899050.BJ')
    ORDER BY d.ts_code, d.trade_date DESC
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'code', i.ts_code,
    'name', COALESCE(b.name, i.ts_code),
    'current', COALESCE(i.close, 0),
    'change', COALESCE(i.change, 0),
    'pct_change', COALESCE(i.pct_chg, 0),
    'volume', COALESCE(i.vol, 0),
    'amount', COALESCE(i.amount, 0),
    'high', COALESCE(i.high, 0),
    'low', COALESCE(i.low, 0),
    'open', COALESCE(i.open, 0),
    'pre_close', COALESCE(i.pre_close, 0)
  )), '[]'::jsonb)
  INTO v_indices
  FROM latest_index i
  LEFT JOIN public.index_basic b ON b.ts_code = i.ts_code;

  -- 板块榜（涨幅前20 + 跌幅前20，确保两个榜都有数据）
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'ts_code', d.ts_code,
    'name', COALESCE(i.name, d.ts_code),
    'pct_change', COALESCE(d.pct_change::numeric, 0),
    'volume', COALESCE(d.vol::numeric, 0),
    'amount', 0,
    'up_count', 0,
    'down_count', 0,
    'limit_up_count', 0,
    'net_inflow', 0,
    'heat_score', 50 + COALESCE(d.pct_change::numeric, 0) * 10,
    'turnover_rate', COALESCE(d.turnover_rate::numeric, 0)
  )), '[]'::jsonb)
  INTO v_sectors
  FROM (
    (SELECT *
     FROM public.ths_daily
     WHERE trade_date = v_latest_ths_daily_date
     ORDER BY pct_change DESC
     LIMIT 20)
    UNION ALL
    (SELECT *
     FROM public.ths_daily
     WHERE trade_date = v_latest_ths_daily_date
     ORDER BY pct_change ASC
     LIMIT 20)
  ) d
  LEFT JOIN public.ths_index i ON i.ts_code = d.ts_code;

  -- 涨停榜
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'ts_code', ts_code,
    'name', COALESCE(name, ''),
    'trade_date', trade_date,
    'close', COALESCE(close, 0),
    'pct_chg', COALESCE(pct_chg, 0),
    'limit_amount', COALESCE(limit_amount::numeric, 0),
    'first_time', COALESCE(first_time, ''),
    'last_time', COALESCE(last_time, ''),
    'open_times', COALESCE(open_times, 0),
    'limit_times', COALESCE(limit_times, 0),
    'tag', COALESCE(industry, ''),
    'theme', ''
  )), '[]'::jsonb)
  INTO v_limit_up_list
  FROM (
    SELECT *
    FROM public.limit_list_d
    WHERE trade_date = v_latest_limit_date
      AND "limit" = 'U'
    ORDER BY first_time ASC
    LIMIT 20
  ) t;

  -- 涨跌统计（使用新 RPC，直接调用 SQL 内联）
  SELECT
    COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) > 0),
    COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) < 0),
    COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) = 0)
  INTO v_up_count, v_down_count, v_flat_count
  FROM public.daily
  WHERE trade_date = v_latest_daily_date;

  SELECT
    COUNT(*) FILTER (WHERE "limit" = 'U'),
    COUNT(*) FILTER (WHERE "limit" = 'D'),
    COUNT(*) FILTER (WHERE "limit" = 'Z'),
    COALESCE(MAX(limit_times), 0)
  INTO v_limit_up_count, v_limit_down_count, v_zhaban_count, v_max_lianban
  FROM public.limit_list_d
  WHERE trade_date = v_latest_limit_date;

  v_total_attempts := v_limit_up_count + v_zhaban_count;
  IF v_total_attempts > 0 THEN
    v_fengban_rate := (v_total_attempts - v_zhaban_count)::numeric / v_total_attempts::numeric * 100;
  ELSE
    v_fengban_rate := 0;
  END IF;

  -- 涨跌幅区间分布
  v_up_down := jsonb_build_object(
    'up_count', v_up_count,
    'down_count', v_down_count,
    'flat_count', v_flat_count,
    'limit_up', v_limit_up_count,
    'limit_down', v_limit_down_count,
    'distribution', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('range', r.range, 'count', r.cnt, 'color', r.color) ORDER BY r.ord), '[]'::jsonb)
      FROM (
        SELECT '涨停' AS range, COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) >= 9.9) AS cnt, '#ef4444' AS color, 1 AS ord FROM public.daily WHERE trade_date = v_latest_daily_date
        UNION ALL SELECT '7-10%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) >= 7 AND COALESCE(pct_chg, 0) < 9.9), '#f87171', 2 FROM public.daily WHERE trade_date = v_latest_daily_date
        UNION ALL SELECT '5-7%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) >= 5 AND COALESCE(pct_chg, 0) < 7), '#fb923c', 3 FROM public.daily WHERE trade_date = v_latest_daily_date
        UNION ALL SELECT '3-5%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) >= 3 AND COALESCE(pct_chg, 0) < 5), '#fbbf24', 4 FROM public.daily WHERE trade_date = v_latest_daily_date
        UNION ALL SELECT '1-3%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) >= 1 AND COALESCE(pct_chg, 0) < 3), '#a3e635', 5 FROM public.daily WHERE trade_date = v_latest_daily_date
        UNION ALL SELECT '0-1%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) > 0 AND COALESCE(pct_chg, 0) < 1), '#4ade80', 6 FROM public.daily WHERE trade_date = v_latest_daily_date
        UNION ALL SELECT '平', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) = 0), '#9ca3af', 7 FROM public.daily WHERE trade_date = v_latest_daily_date
        UNION ALL SELECT '-1-0%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) > -1 AND COALESCE(pct_chg, 0) < 0), '#38bdf8', 8 FROM public.daily WHERE trade_date = v_latest_daily_date
        UNION ALL SELECT '-3--1%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) > -3 AND COALESCE(pct_chg, 0) <= -1), '#60a5fa', 9 FROM public.daily WHERE trade_date = v_latest_daily_date
        UNION ALL SELECT '-5--3%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) > -5 AND COALESCE(pct_chg, 0) <= -3), '#818cf8', 10 FROM public.daily WHERE trade_date = v_latest_daily_date
        UNION ALL SELECT '-7--5%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) > -7 AND COALESCE(pct_chg, 0) <= -5), '#a78bfa', 11 FROM public.daily WHERE trade_date = v_latest_daily_date
        UNION ALL SELECT '-10--7%', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) > -9.9 AND COALESCE(pct_chg, 0) <= -7), '#c084fc', 12 FROM public.daily WHERE trade_date = v_latest_daily_date
        UNION ALL SELECT '跌停', COUNT(*) FILTER (WHERE COALESCE(pct_chg, 0) <= -9.9), '#22c55e', 13 FROM public.daily WHERE trade_date = v_latest_daily_date
      ) r
    ),
    'lianbanStats', (
      SELECT jsonb_build_object(
        'oneBoard', COUNT(*) FILTER (WHERE limit_times = 1),
        'twoBoard', COUNT(*) FILTER (WHERE limit_times = 2),
        'threeBoard', COUNT(*) FILTER (WHERE limit_times = 3),
        'fourBoard', COUNT(*) FILTER (WHERE limit_times = 4),
        'fivePlus', COUNT(*) FILTER (WHERE limit_times >= 5)
      )
      FROM public.limit_list_d
      WHERE trade_date = v_latest_limit_date AND "limit" = 'U'
    ),
    'zhabanCount', v_zhaban_count,
    'fengbanRate', ROUND(v_fengban_rate, 2),
    'topIndustries', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('name', industry, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT COALESCE(industry, '其他') AS industry, COUNT(*) AS cnt
        FROM public.limit_list_d
        WHERE trade_date = v_latest_limit_date AND "limit" = 'U'
        GROUP BY COALESCE(industry, '其他')
        ORDER BY cnt DESC
        LIMIT 3
      ) t
    ),
    'maxLianban', v_max_lianban,
    'totalAttempts', v_total_attempts
  );

  -- 北向资金
  WITH latest_north AS (
    SELECT *
    FROM public.moneyflow_hsgt
    ORDER BY trade_date DESC
    LIMIT 30
  )
  SELECT jsonb_build_object(
    'net_inflow', COALESCE((SELECT north_money::numeric / 10000 FROM latest_north ORDER BY trade_date DESC LIMIT 1), 0),
    'sh_inflow', COALESCE((SELECT hgt::numeric / 10000 FROM latest_north ORDER BY trade_date DESC LIMIT 1), 0),
    'sz_inflow', COALESCE((SELECT sgt::numeric / 10000 FROM latest_north ORDER BY trade_date DESC LIMIT 1), 0),
    'cumulative_30d', COALESCE((SELECT SUM(north_money::numeric / 10000) FROM latest_north), 0),
    'cumulative_week', COALESCE((SELECT SUM(north_money::numeric / 10000) FROM (SELECT * FROM latest_north ORDER BY trade_date DESC LIMIT 5) x), 0),
    'change_from_yesterday', 0,
    'change_percent', 0,
    'sh_buy', 0,
    'sh_sell', 0,
    'sz_buy', 0,
    'sz_sell', 0,
    'time_series', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'date', substr(trade_date, 5, 2) || '-' || substr(trade_date, 7, 2),
        'amount', north_money::numeric / 10000,
        'hgt', hgt::numeric / 10000,
        'sgt', sgt::numeric / 10000
      ) ORDER BY trade_date ASC)
      FROM latest_north
    ), '[]'::jsonb)
  )
  INTO v_north_flow;

  -- 沪深股通 Top10
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'ts_code', ts_code,
    'name', name,
    'close', COALESCE(close, 0),
    'change', COALESCE(change, 0),
    'rank', rank,
    'market_type', CASE market_type WHEN 1 THEN '沪股通' WHEN 2 THEN '深股通' ELSE '港股通' END,
    'amount', COALESCE(amount, 0),
    'net_amount', net_amount
  ) ORDER BY rank ASC), '[]'::jsonb)
  INTO v_hsgt_top10
  FROM public.hsgt_top10
  WHERE trade_date = v_latest_hsgt_date;

  -- 获取成交额数据
  v_daily_amount := public.get_daily_total_amount(v_latest_daily_date);

  -- 情绪计算
  v_score := LEAST(100, GREATEST(0,
    (CASE WHEN (v_up_count + v_down_count + v_flat_count) > 0
      THEN (v_up_count::numeric / (v_up_count + v_down_count + v_flat_count)::numeric) * 100
      ELSE 50 END) * 0.5
    + (CASE WHEN (v_limit_up_count + v_limit_down_count) > 0
      THEN (v_limit_up_count::numeric / (v_limit_up_count + v_limit_down_count)::numeric) * 100
      ELSE 50 END) * 0.2
    + COALESCE(v_fengban_rate, 50) * 0.3
  ));

  v_enhanced := jsonb_build_object(
    'sentiment', jsonb_build_object(
      'score', ROUND(v_score),
      'label', CASE
        WHEN v_score >= 80 THEN '极度贪婪'
        WHEN v_score >= 65 THEN '贪婪'
        WHEN v_score >= 55 THEN '偏多'
        WHEN v_score <= 20 THEN '极度恐惧'
        WHEN v_score <= 35 THEN '恐惧'
        WHEN v_score <= 45 THEN '偏空'
        ELSE '中性'
      END,
      'trend', CASE
        WHEN v_up_count > v_down_count THEN 'up'
        WHEN v_up_count < v_down_count THEN 'down'
        ELSE 'flat'
      END
    ),
    'thermometer', jsonb_build_object(
      'upCount', v_up_count,
      'downCount', v_down_count,
      'flatCount', v_flat_count,
      'limitUp', v_limit_up_count,
      'limitDown', v_limit_down_count,
      'upRatio', CASE WHEN (v_up_count + v_down_count + v_flat_count) > 0
        THEN ROUND(v_up_count::numeric / (v_up_count + v_down_count + v_flat_count)::numeric * 100)
        ELSE 50 END
    ),
    'capital', jsonb_build_object(
      'totalAmount', COALESCE((v_daily_amount ->> 'totalAmount')::numeric, 0),
      'amountChange', COALESCE((v_daily_amount ->> 'amountChange')::numeric, 0),
      'avgTurnover', COALESCE((v_daily_amount ->> 'avgTurnover')::numeric, 0),
      'northFlow', COALESCE((v_north_flow ->> 'net_inflow')::numeric, 0)
    ),
    'limitStats', jsonb_build_object(
      'lianbanStats', (
        SELECT jsonb_build_object(
          'oneBoard', COUNT(*) FILTER (WHERE limit_times = 1),
          'twoBoard', COUNT(*) FILTER (WHERE limit_times = 2),
          'threeBoard', COUNT(*) FILTER (WHERE limit_times = 3),
          'fourBoard', COUNT(*) FILTER (WHERE limit_times = 4),
          'fivePlus', COUNT(*) FILTER (WHERE limit_times >= 5)
        )
        FROM public.limit_list_d
        WHERE trade_date = v_latest_limit_date AND "limit" = 'U'
      ),
      'zhabanCount', v_zhaban_count,
      'fengbanRate', ROUND(v_fengban_rate, 2),
      'maxLianban', v_max_lianban,
      'topIndustries', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('name', industry, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
        FROM (
          SELECT COALESCE(industry, '其他') AS industry, COUNT(*) AS cnt
          FROM public.limit_list_d
          WHERE trade_date = v_latest_limit_date AND "limit" = 'U'
          GROUP BY COALESCE(industry, '其他')
          ORDER BY cnt DESC
          LIMIT 3
        ) t
      )
    )
  );

  RETURN jsonb_build_object(
    'indices', v_indices,
    'sectors', v_sectors,
    'limitUpList', v_limit_up_list,
    'upDownDistribution', v_up_down,
    'enhancedSentiment', v_enhanced,
    'northFlow', v_north_flow,
    'hsgtTop10', v_hsgt_top10,
    'updateTime', to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', true,
      'message', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_market_overview_bundle() TO anon, authenticated;

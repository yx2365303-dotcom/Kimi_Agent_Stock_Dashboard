-- 板块成分股查询 RPC（基于 stock_basic.industry 匹配行业名）
-- 由于 ths_member 表仅存储全A股索引，无法按板块查询成分股
-- 改用 stock_basic.industry 字段匹配行业成分股并关联行情数据
-- 执行方式: 在 Supabase SQL Editor 中运行

-- 先删除旧版本（基于 ths_member 的）
DROP FUNCTION IF EXISTS public.get_sector_member_stocks(text);

CREATE OR REPLACE FUNCTION public.get_sector_member_stocks(p_sector_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_latest_date text;
  v_industry_name text;
  v_result jsonb;
BEGIN
  IF p_sector_name IS NULL OR p_sector_name = '' THEN
    RETURN '[]'::jsonb;
  END IF;

  -- 1. 精确匹配 industry 名称
  SELECT industry INTO v_industry_name
  FROM public.stock_basic
  WHERE industry = p_sector_name
  LIMIT 1;

  -- 2. 模糊匹配：去掉常见后缀再搜索
  IF v_industry_name IS NULL THEN
    SELECT industry INTO v_industry_name
    FROM public.stock_basic
    WHERE industry ILIKE '%' || regexp_replace(p_sector_name, '(设备|板块|行业)$', '') || '%'
    LIMIT 1;
  END IF;

  -- 3. 前缀匹配
  IF v_industry_name IS NULL AND length(p_sector_name) >= 2 THEN
    SELECT industry INTO v_industry_name
    FROM public.stock_basic
    WHERE industry ILIKE '%' || substring(p_sector_name FROM 1 FOR 2) || '%'
    LIMIT 1;
  END IF;

  IF v_industry_name IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- 获取 daily 表最新交易日
  SELECT trade_date INTO v_latest_date
  FROM public.daily
  ORDER BY trade_date DESC
  LIMIT 1;

  IF v_latest_date IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'ts_code', sb.ts_code,
      'name', sb.name,
      'close', COALESCE(d.close, 0),
      'pct_chg', COALESCE(d.pct_chg, 0),
      'change', COALESCE(d.change, 0),
      'open', COALESCE(d.open, 0),
      'high', COALESCE(d.high, 0),
      'low', COALESCE(d.low, 0),
      'pre_close', COALESCE(d.pre_close, 0),
      'vol', COALESCE(d.vol, 0),
      'amount', COALESCE(d.amount, 0),
      'turnover_rate', COALESCE(db.turnover_rate, 0),
      'pe_ttm', COALESCE(db.pe_ttm, 0),
      'total_mv', COALESCE(db.total_mv, 0)
    ) ORDER BY COALESCE(d.pct_chg, 0) DESC
  ), '[]'::jsonb)
  INTO v_result
  FROM public.stock_basic sb
  LEFT JOIN LATERAL (
    SELECT close, pct_chg, change, open, high, low, pre_close, vol, amount
    FROM public.daily
    WHERE ts_code = sb.ts_code AND trade_date = v_latest_date
    LIMIT 1
  ) d ON true
  LEFT JOIN LATERAL (
    SELECT turnover_rate, pe_ttm, total_mv
    FROM public.daily_basic
    WHERE ts_code = sb.ts_code AND trade_date = v_latest_date
    LIMIT 1
  ) db ON true
  WHERE sb.industry = v_industry_name
    AND d.close IS NOT NULL;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sector_member_stocks(text) TO anon, authenticated;

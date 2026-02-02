-- =====================================================
-- 股票数据看板 Supabase 数据库建表脚本
-- 适用于 PostgreSQL (Supabase)
-- =====================================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. 股票基础信息表
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_basic (
    id SERIAL PRIMARY KEY,
    ts_code VARCHAR(20) NOT NULL UNIQUE,
    symbol VARCHAR(10) NOT NULL,
    name VARCHAR(50) NOT NULL,
    area VARCHAR(50),
    industry VARCHAR(50),
    market VARCHAR(20),
    list_date VARCHAR(10),
    list_status VARCHAR(2) DEFAULT 'L',
    is_hs VARCHAR(2),
    update_time TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_stock_basic_symbol ON stock_basic(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_basic_name ON stock_basic(name);
CREATE INDEX IF NOT EXISTS idx_stock_basic_industry ON stock_basic(industry);
CREATE INDEX IF NOT EXISTS idx_stock_basic_market ON stock_basic(market);

-- =====================================================
-- 2. 股票日线数据表
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_daily (
    id SERIAL PRIMARY KEY,
    ts_code VARCHAR(20) NOT NULL,
    trade_date VARCHAR(10) NOT NULL,
    open DECIMAL(10, 2) NOT NULL,
    high DECIMAL(10, 2) NOT NULL,
    low DECIMAL(10, 2) NOT NULL,
    close DECIMAL(10, 2) NOT NULL,
    pre_close DECIMAL(10, 2) NOT NULL,
    change DECIMAL(10, 2) NOT NULL,
    pct_chg DECIMAL(10, 2) NOT NULL,
    vol DECIMAL(20, 2) NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    update_time TIMESTAMP DEFAULT NOW(),
    UNIQUE(ts_code, trade_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_stock_daily_ts_code ON stock_daily(ts_code);
CREATE INDEX IF NOT EXISTS idx_stock_daily_trade_date ON stock_daily(trade_date);

-- =====================================================
-- 3. 指数日线数据表
-- =====================================================
CREATE TABLE IF NOT EXISTS index_daily (
    id SERIAL PRIMARY KEY,
    ts_code VARCHAR(20) NOT NULL,
    trade_date VARCHAR(10) NOT NULL,
    close DECIMAL(10, 2) NOT NULL,
    open DECIMAL(10, 2) NOT NULL,
    high DECIMAL(10, 2) NOT NULL,
    low DECIMAL(10, 2) NOT NULL,
    pre_close DECIMAL(10, 2) NOT NULL,
    change DECIMAL(10, 2) NOT NULL,
    pct_chg DECIMAL(10, 2) NOT NULL,
    vol DECIMAL(20, 2),
    amount DECIMAL(20, 2),
    update_time TIMESTAMP DEFAULT NOW(),
    UNIQUE(ts_code, trade_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_index_daily_ts_code ON index_daily(ts_code);
CREATE INDEX IF NOT EXISTS idx_index_daily_trade_date ON index_daily(trade_date);

-- =====================================================
-- 4. 板块基础信息表
-- =====================================================
CREATE TYPE sector_type_enum AS ENUM ('industry', 'concept', 'region');

CREATE TABLE IF NOT EXISTS sector_basic (
    id SERIAL PRIMARY KEY,
    ts_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    sector_type sector_type_enum DEFAULT 'concept',
    sub_type VARCHAR(50),
    stock_count INT DEFAULT 0,
    parent_code VARCHAR(20),
    create_date DATE,
    update_time TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_sector_basic_sector_type ON sector_basic(sector_type);
CREATE INDEX IF NOT EXISTS idx_sector_basic_name ON sector_basic(name);

-- =====================================================
-- 5. 板块行情数据表
-- =====================================================
CREATE TABLE IF NOT EXISTS sector_quote (
    id SERIAL PRIMARY KEY,
    ts_code VARCHAR(20) NOT NULL,
    trade_date DATE NOT NULL,
    open_price DECIMAL(10, 4),
    high_price DECIMAL(10, 4),
    low_price DECIMAL(10, 4),
    close_price DECIMAL(10, 4),
    pre_close DECIMAL(10, 4),
    change_amount DECIMAL(10, 4),
    pct_change DECIMAL(6, 2),
    volume BIGINT,
    amount DECIMAL(20, 2),
    turnover_rate DECIMAL(6, 2),
    up_count INT DEFAULT 0,
    down_count INT DEFAULT 0,
    flat_count INT DEFAULT 0,
    limit_up_count INT DEFAULT 0,
    limit_down_count INT DEFAULT 0,
    net_inflow DECIMAL(20, 2),
    main_inflow DECIMAL(20, 2),
    retail_inflow DECIMAL(20, 2),
    update_time TIMESTAMP DEFAULT NOW(),
    UNIQUE(ts_code, trade_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_sector_quote_trade_date ON sector_quote(trade_date);
CREATE INDEX IF NOT EXISTS idx_sector_quote_pct_change ON sector_quote(trade_date, pct_change DESC);

-- =====================================================
-- 6. 板块热度表
-- =====================================================
CREATE TABLE IF NOT EXISTS sector_heat (
    id SERIAL PRIMARY KEY,
    ts_code VARCHAR(20) NOT NULL,
    trade_date DATE NOT NULL,
    heat_score DECIMAL(6, 2),
    heat_rank INT,
    price_score DECIMAL(5, 2),
    volume_score DECIMAL(5, 2),
    fund_score DECIMAL(5, 2),
    news_score DECIMAL(5, 2),
    market_position DECIMAL(4, 2),
    continuity_days INT DEFAULT 0,
    is_hot BOOLEAN DEFAULT FALSE,
    hot_tag VARCHAR(50),
    update_time TIMESTAMP DEFAULT NOW(),
    UNIQUE(ts_code, trade_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_sector_heat_trade_date ON sector_heat(trade_date);
CREATE INDEX IF NOT EXISTS idx_sector_heat_rank ON sector_heat(trade_date, heat_rank);
CREATE INDEX IF NOT EXISTS idx_sector_heat_is_hot ON sector_heat(trade_date, is_hot);

-- =====================================================
-- 7. 涨跌停数据表
-- =====================================================
CREATE TABLE IF NOT EXISTS limit_list (
    id SERIAL PRIMARY KEY,
    ts_code VARCHAR(20) NOT NULL,
    trade_date VARCHAR(10) NOT NULL,
    name VARCHAR(50),
    close DECIMAL(10, 2),
    pct_chg DECIMAL(10, 2),
    amount DECIMAL(20, 2),
    limit_amount DECIMAL(20, 2),
    float_mv DECIMAL(20, 2),
    total_mv DECIMAL(20, 2),
    turnover_ratio DECIMAL(10, 4),
    fd_amount DECIMAL(20, 2),
    first_time VARCHAR(10),
    last_time VARCHAR(10),
    open_times INT DEFAULT 0,
    up_stat VARCHAR(20),
    limit_times INT DEFAULT 0,
    "limit" CHAR(1) NOT NULL, -- 'U' 涨停, 'D' 跌停
    update_time TIMESTAMP DEFAULT NOW(),
    UNIQUE(ts_code, trade_date, "limit")
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_limit_list_trade_date ON limit_list(trade_date);
CREATE INDEX IF NOT EXISTS idx_limit_list_limit ON limit_list(trade_date, "limit");

-- =====================================================
-- 8. 资金流向数据表
-- =====================================================
CREATE TABLE IF NOT EXISTS money_flow (
    id SERIAL PRIMARY KEY,
    ts_code VARCHAR(20) NOT NULL,
    trade_date VARCHAR(10) NOT NULL,
    buy_sm_vol DECIMAL(20, 2),
    buy_sm_amount DECIMAL(20, 2),
    sell_sm_vol DECIMAL(20, 2),
    sell_sm_amount DECIMAL(20, 2),
    buy_md_vol DECIMAL(20, 2),
    buy_md_amount DECIMAL(20, 2),
    sell_md_vol DECIMAL(20, 2),
    sell_md_amount DECIMAL(20, 2),
    buy_lg_vol DECIMAL(20, 2),
    buy_lg_amount DECIMAL(20, 2),
    sell_lg_vol DECIMAL(20, 2),
    sell_lg_amount DECIMAL(20, 2),
    buy_elg_vol DECIMAL(20, 2),
    buy_elg_amount DECIMAL(20, 2),
    sell_elg_vol DECIMAL(20, 2),
    sell_elg_amount DECIMAL(20, 2),
    net_mf_vol DECIMAL(20, 2),
    net_mf_amount DECIMAL(20, 2),
    update_time TIMESTAMP DEFAULT NOW(),
    UNIQUE(ts_code, trade_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_money_flow_ts_code ON money_flow(ts_code);
CREATE INDEX IF NOT EXISTS idx_money_flow_trade_date ON money_flow(trade_date);

-- =====================================================
-- 9. 新闻资讯表
-- =====================================================
CREATE TYPE importance_enum AS ENUM ('high', 'normal', 'low');

CREATE TABLE IF NOT EXISTS news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    content TEXT,
    source VARCHAR(100),
    publish_time TIMESTAMP NOT NULL,
    importance importance_enum DEFAULT 'normal',
    category VARCHAR(50),
    related_stocks TEXT[],
    url VARCHAR(500),
    update_time TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_news_publish_time ON news(publish_time DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_importance ON news(importance);

-- =====================================================
-- 10. 北向资金数据表
-- =====================================================
CREATE TABLE IF NOT EXISTS hsgt_north_flow (
    id SERIAL PRIMARY KEY,
    trade_date VARCHAR(10) NOT NULL UNIQUE,
    ggt_ss DECIMAL(20, 2), -- 港股通(沪)
    ggt_sz DECIMAL(20, 2), -- 港股通(深)
    hgt DECIMAL(20, 2),    -- 沪股通
    sgt DECIMAL(20, 2),    -- 深股通
    north_money DECIMAL(20, 2), -- 北向资金
    south_money DECIMAL(20, 2), -- 南向资金
    update_time TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_hsgt_north_flow_trade_date ON hsgt_north_flow(trade_date);

-- =====================================================
-- 11. 市场统计数据表
-- =====================================================
CREATE TABLE IF NOT EXISTS market_stats (
    id SERIAL PRIMARY KEY,
    trade_date VARCHAR(10) NOT NULL UNIQUE,
    total_count INT DEFAULT 0,
    up_count INT DEFAULT 0,
    down_count INT DEFAULT 0,
    flat_count INT DEFAULT 0,
    limit_up_count INT DEFAULT 0,
    limit_down_count INT DEFAULT 0,
    up_down_ratio DECIMAL(6, 2),
    avg_change DECIMAL(6, 2),
    total_amount DECIMAL(20, 2),
    total_volume DECIMAL(20, 2),
    update_time TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_market_stats_trade_date ON market_stats(trade_date);

-- =====================================================
-- 12. 选股策略表
-- =====================================================
CREATE TYPE strategy_category_enum AS ENUM ('technical', 'fundamental', 'moneyflow', 'pattern', 'composite', 'custom');
CREATE TYPE filter_logic_enum AS ENUM ('AND', 'OR');

CREATE TABLE IF NOT EXISTS picker_strategy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category strategy_category_enum DEFAULT 'composite',
    filter_logic filter_logic_enum DEFAULT 'AND',
    stock_pool_config JSONB,
    sort_config JSONB,
    alert_config JSONB,
    backtest_config JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    run_count INT DEFAULT 0,
    created_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_picker_strategy_category ON picker_strategy(category);
CREATE INDEX IF NOT EXISTS idx_picker_strategy_is_active ON picker_strategy(is_active);

-- =====================================================
-- 13. 板块成分股关联表
-- =====================================================
CREATE TABLE IF NOT EXISTS sector_stock_map (
    id SERIAL PRIMARY KEY,
    sector_code VARCHAR(20) NOT NULL,
    stock_code VARCHAR(20) NOT NULL,
    stock_name VARCHAR(100),
    weight DECIMAL(6, 4) DEFAULT 1.0,
    is_leader BOOLEAN DEFAULT FALSE,
    join_date DATE,
    update_time TIMESTAMP DEFAULT NOW(),
    UNIQUE(sector_code, stock_code)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_sector_stock_map_sector ON sector_stock_map(sector_code);
CREATE INDEX IF NOT EXISTS idx_sector_stock_map_stock ON sector_stock_map(stock_code);

-- =====================================================
-- 启用 Row Level Security (RLS)
-- =====================================================
-- 对于公开读取的表，设置允许匿名访问
ALTER TABLE stock_basic ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE index_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_basic ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_quote ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_heat ENABLE ROW LEVEL SECURITY;
ALTER TABLE limit_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE hsgt_north_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE picker_strategy ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_stock_map ENABLE ROW LEVEL SECURITY;

-- 创建公开读取策略
CREATE POLICY "Allow public read access" ON stock_basic FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON stock_daily FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON index_daily FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON sector_basic FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON sector_quote FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON sector_heat FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON limit_list FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON money_flow FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON news FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON hsgt_north_flow FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON market_stats FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON picker_strategy FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON sector_stock_map FOR SELECT USING (true);

-- =====================================================
-- 创建更新时间触发器
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.update_time = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为需要自动更新时间的表添加触发器
CREATE TRIGGER update_stock_basic_updated_at BEFORE UPDATE ON stock_basic FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_stock_daily_updated_at BEFORE UPDATE ON stock_daily FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_index_daily_updated_at BEFORE UPDATE ON index_daily FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sector_basic_updated_at BEFORE UPDATE ON sector_basic FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sector_quote_updated_at BEFORE UPDATE ON sector_quote FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_sector_heat_updated_at BEFORE UPDATE ON sector_heat FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_limit_list_updated_at BEFORE UPDATE ON limit_list FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_money_flow_updated_at BEFORE UPDATE ON money_flow FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON news FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_hsgt_north_flow_updated_at BEFORE UPDATE ON hsgt_north_flow FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_market_stats_updated_at BEFORE UPDATE ON market_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- picker_strategy 使用 updated_at 字段
CREATE OR REPLACE FUNCTION update_picker_strategy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_picker_strategy_updated_at BEFORE UPDATE ON picker_strategy FOR EACH ROW EXECUTE FUNCTION update_picker_strategy_updated_at();

-- =====================================================
-- 完成
-- =====================================================
COMMENT ON TABLE stock_basic IS '股票基础信息表';
COMMENT ON TABLE stock_daily IS '股票日线数据表';
COMMENT ON TABLE index_daily IS '指数日线数据表';
COMMENT ON TABLE sector_basic IS '板块基础信息表';
COMMENT ON TABLE sector_quote IS '板块行情数据表';
COMMENT ON TABLE sector_heat IS '板块热度表';
COMMENT ON TABLE limit_list IS '涨跌停数据表';
COMMENT ON TABLE money_flow IS '资金流向数据表';
COMMENT ON TABLE news IS '新闻资讯表';
COMMENT ON TABLE hsgt_north_flow IS '北向资金数据表';
COMMENT ON TABLE market_stats IS '市场统计数据表';
COMMENT ON TABLE picker_strategy IS '选股策略表';
COMMENT ON TABLE sector_stock_map IS '板块成分股关联表';

-- =====================================================
-- 算法选股模块数据库表结构
-- =====================================================

-- 选股策略表
CREATE TABLE IF NOT EXISTS picker_strategy (
    id VARCHAR(64) PRIMARY KEY COMMENT '策略唯一ID',
    name VARCHAR(100) NOT NULL COMMENT '策略名称',
    description TEXT COMMENT '策略描述',
    category ENUM('technical', 'fundamental', 'moneyflow', 'pattern', 'composite', 'custom') 
        DEFAULT 'composite' COMMENT '策略分类',
    filter_logic ENUM('AND', 'OR') DEFAULT 'AND' COMMENT '条件组合逻辑',
    stock_pool_config JSON COMMENT '股票池配置JSON',
    sort_config JSON COMMENT '排序配置JSON',
    alert_config JSON COMMENT '预警配置JSON',
    backtest_config JSON COMMENT '回测配置JSON',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    run_count INT DEFAULT 0 COMMENT '运行次数',
    created_by VARCHAR(64) COMMENT '创建者',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_category (category),
    INDEX idx_active (is_active),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='选股策略表';

-- 策略筛选条件表
CREATE TABLE IF NOT EXISTS picker_strategy_filter (
    id VARCHAR(64) PRIMARY KEY COMMENT '条件ID',
    strategy_id VARCHAR(64) NOT NULL COMMENT '所属策略ID',
    filter_type VARCHAR(50) NOT NULL COMMENT '筛选类型',
    filter_name VARCHAR(100) COMMENT '条件名称',
    field VARCHAR(100) NOT NULL COMMENT '筛选字段',
    operator VARCHAR(20) NOT NULL COMMENT '操作符',
    value JSON NOT NULL COMMENT '筛选值',
    weight DECIMAL(5,2) COMMENT '权重',
    sort_order INT DEFAULT 0 COMMENT '排序顺序',
    enabled BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (strategy_id) REFERENCES picker_strategy(id) ON DELETE CASCADE,
    INDEX idx_strategy (strategy_id),
    INDEX idx_filter_type (filter_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='策略筛选条件表';

-- 选股结果表（按年分区）
CREATE TABLE IF NOT EXISTS picker_result (
    id BIGINT AUTO_INCREMENT COMMENT '自增ID',
    strategy_id VARCHAR(64) NOT NULL COMMENT '策略ID',
    trade_date DATE NOT NULL COMMENT '交易日期',
    ts_code VARCHAR(20) NOT NULL COMMENT '股票代码',
    name VARCHAR(50) COMMENT '股票名称',
    close_price DECIMAL(10,2) COMMENT '收盘价',
    pct_chg DECIMAL(6,2) COMMENT '涨跌幅',
    score DECIMAL(8,2) COMMENT '综合评分',
    rank_num INT COMMENT '排名',
    metadata JSON COMMENT '元数据（各维度评分等）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (id, trade_date),
    INDEX idx_strategy_date (strategy_id, trade_date),
    INDEX idx_tscode (ts_code),
    INDEX idx_score (score),
    INDEX idx_trade_date (trade_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 
PARTITION BY RANGE (YEAR(trade_date)) (
    PARTITION p2022 VALUES LESS THAN (2023),
    PARTITION p2023 VALUES LESS THAN (2024),
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION pfuture VALUES LESS THAN MAXVALUE
) COMMENT='选股结果表';

-- 策略回测结果表
CREATE TABLE IF NOT EXISTS picker_backtest (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '自增ID',
    strategy_id VARCHAR(64) NOT NULL COMMENT '策略ID',
    start_date DATE NOT NULL COMMENT '回测开始日期',
    end_date DATE NOT NULL COMMENT '回测结束日期',
    initial_capital DECIMAL(15,2) COMMENT '初始资金',
    total_return DECIMAL(10,4) COMMENT '总收益率',
    annualized_return DECIMAL(10,4) COMMENT '年化收益率',
    max_drawdown DECIMAL(10,4) COMMENT '最大回撤',
    max_drawdown_start DATE COMMENT '最大回撤开始日期',
    max_drawdown_end DATE COMMENT '最大回撤结束日期',
    sharpe_ratio DECIMAL(10,4) COMMENT '夏普比率',
    sortino_ratio DECIMAL(10,4) COMMENT '索提诺比率',
    calmar_ratio DECIMAL(10,4) COMMENT '卡玛比率',
    win_rate DECIMAL(6,4) COMMENT '胜率',
    profit_factor DECIMAL(10,4) COMMENT '盈亏比',
    profit_loss_ratio DECIMAL(10,4) COMMENT '盈亏比',
    total_trades INT COMMENT '总交易次数',
    avg_win DECIMAL(10,2) COMMENT '平均盈利',
    avg_loss DECIMAL(10,2) COMMENT '平均亏损',
    benchmark_return DECIMAL(10,4) COMMENT '基准收益',
    alpha DECIMAL(10,4) COMMENT 'Alpha',
    beta DECIMAL(10,4) COMMENT 'Beta',
    information_ratio DECIMAL(10,4) COMMENT '信息比率',
    volatility DECIMAL(10,4) COMMENT '波动率',
    turnover_rate DECIMAL(10,4) COMMENT '换手率',
    avg_holding_period DECIMAL(6,2) COMMENT '平均持仓天数',
    result_detail JSON COMMENT '详细结果JSON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (strategy_id) REFERENCES picker_strategy(id),
    INDEX idx_strategy (strategy_id),
    INDEX idx_date_range (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='策略回测结果表';

-- 回测交易记录表
CREATE TABLE IF NOT EXISTS picker_backtest_trade (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '自增ID',
    backtest_id BIGINT NOT NULL COMMENT '回测ID',
    trade_date DATE NOT NULL COMMENT '交易日期',
    ts_code VARCHAR(20) NOT NULL COMMENT '股票代码',
    name VARCHAR(50) COMMENT '股票名称',
    action ENUM('BUY', 'SELL') NOT NULL COMMENT '交易动作',
    price DECIMAL(10,2) NOT NULL COMMENT '成交价格',
    shares INT NOT NULL COMMENT '成交股数',
    amount DECIMAL(15,2) NOT NULL COMMENT '成交金额',
    commission DECIMAL(10,2) COMMENT '佣金',
    slippage DECIMAL(10,2) COMMENT '滑点',
    reason VARCHAR(200) COMMENT '交易原因',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (backtest_id) REFERENCES picker_backtest(id) ON DELETE CASCADE,
    INDEX idx_backtest (backtest_id),
    INDEX idx_trade_date (trade_date),
    INDEX idx_tscode (ts_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回测交易记录表';

-- 回测每日净值表
CREATE TABLE IF NOT EXISTS picker_backtest_daily (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '自增ID',
    backtest_id BIGINT NOT NULL COMMENT '回测ID',
    trade_date DATE NOT NULL COMMENT '交易日期',
    total_value DECIMAL(15,2) NOT NULL COMMENT '总资产',
    cash DECIMAL(15,2) NOT NULL COMMENT '现金',
    market_value DECIMAL(15,2) NOT NULL COMMENT '市值',
    daily_return DECIMAL(10,4) COMMENT '日收益率',
    cumulative_return DECIMAL(10,4) COMMENT '累计收益率',
    drawdown DECIMAL(10,4) COMMENT '当前回撤',
    position_count INT COMMENT '持仓数量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    FOREIGN KEY (backtest_id) REFERENCES picker_backtest(id) ON DELETE CASCADE,
    INDEX idx_backtest_date (backtest_id, trade_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='回测每日净值表';

-- 预警规则表
CREATE TABLE IF NOT EXISTS picker_alert_rule (
    id VARCHAR(64) PRIMARY KEY COMMENT '规则ID',
    strategy_id VARCHAR(64) NOT NULL COMMENT '关联策略ID',
    name VARCHAR(100) NOT NULL COMMENT '规则名称',
    alert_type ENUM('new_match', 'score_change', 'price_threshold', 'technical_signal', 'volume_spike', 'rank_change') 
        NOT NULL COMMENT '预警类型',
    condition_config JSON NOT NULL COMMENT '条件配置JSON',
    notification_channels JSON COMMENT '通知渠道配置',
    check_interval INT DEFAULT 60 COMMENT '检查间隔（秒）',
    cooldown INT DEFAULT 60 COMMENT '冷却时间（分钟）',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    last_triggered_at TIMESTAMP NULL COMMENT '最后触发时间',
    trigger_count INT DEFAULT 0 COMMENT '触发次数',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (strategy_id) REFERENCES picker_strategy(id) ON DELETE CASCADE,
    INDEX idx_strategy (strategy_id),
    INDEX idx_active (is_active),
    INDEX idx_alert_type (alert_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预警规则表';

-- 预警记录表
CREATE TABLE IF NOT EXISTS picker_alert_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '自增ID',
    rule_id VARCHAR(64) NOT NULL COMMENT '规则ID',
    ts_code VARCHAR(20) NOT NULL COMMENT '股票代码',
    name VARCHAR(50) COMMENT '股票名称',
    trade_date DATE NOT NULL COMMENT '交易日期',
    alert_type VARCHAR(50) NOT NULL COMMENT '预警类型',
    alert_title VARCHAR(200) COMMENT '预警标题',
    alert_content TEXT COMMENT '预警内容',
    alert_data JSON COMMENT '预警数据JSON',
    is_read BOOLEAN DEFAULT FALSE COMMENT '是否已读',
    read_at TIMESTAMP NULL COMMENT '阅读时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_rule (rule_id),
    INDEX idx_tscode_date (ts_code, trade_date),
    INDEX idx_created (created_at),
    INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预警记录表';

-- 用户收藏策略表
CREATE TABLE IF NOT EXISTS user_favorite_strategy (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '自增ID',
    user_id VARCHAR(64) NOT NULL COMMENT '用户ID',
    strategy_id VARCHAR(64) NOT NULL COMMENT '策略ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_user_strategy (user_id, strategy_id),
    FOREIGN KEY (strategy_id) REFERENCES picker_strategy(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户收藏策略表';

-- 策略执行日志表
CREATE TABLE IF NOT EXISTS picker_execution_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '自增ID',
    strategy_id VARCHAR(64) NOT NULL COMMENT '策略ID',
    trade_date DATE COMMENT '交易日期',
    status ENUM('running', 'success', 'failed') NOT NULL COMMENT '执行状态',
    result_count INT COMMENT '选股结果数量',
    execution_time_ms INT COMMENT '执行时间（毫秒）',
    cache_hit BOOLEAN COMMENT '是否命中缓存',
    sql_query TEXT COMMENT '执行的SQL',
    error_message TEXT COMMENT '错误信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_strategy_date (strategy_id, trade_date),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='策略执行日志表';

-- 预计算股票池表
CREATE TABLE IF NOT EXISTS stock_pool (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '自增ID',
    trade_date DATE NOT NULL COMMENT '交易日期',
    pool_name VARCHAR(50) NOT NULL COMMENT '池名称',
    ts_code VARCHAR(20) NOT NULL COMMENT '股票代码',
    name VARCHAR(50) COMMENT '股票名称',
    score DECIMAL(8,2) COMMENT '评分',
    rank_num INT COMMENT '排名',
    metadata JSON COMMENT '元数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    UNIQUE KEY uk_pool_date_code (pool_name, trade_date, ts_code),
    INDEX idx_pool_date (pool_name, trade_date),
    INDEX idx_tscode (ts_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='预计算股票池表';

-- =====================================================
-- 索引优化
-- =====================================================

-- analysis_technical 表索引优化（假设已存在表）
-- ALTER TABLE analysis_technical ADD INDEX idx_tech_date (trade_date);
-- ALTER TABLE analysis_technical ADD INDEX idx_tech_code_date (ts_code, trade_date);
-- ALTER TABLE analysis_technical ADD INDEX idx_tech_flags (is_vol_breakout, is_trend_up, is_new_high);
-- ALTER TABLE analysis_technical ADD INDEX idx_tech_limit (high_type, limit_count);

-- =====================================================
-- 预置数据：常用选股策略模板
-- =====================================================

INSERT INTO picker_strategy (id, name, description, category, filter_logic, stock_pool_config, sort_config, is_active) VALUES
('template_value', '价值投资策略', '选择低估值、高ROE的优质股票', 'fundamental', 'AND', 
 '{"excludeST": true, "markets": ["主板", "创业板"]}', 
 '{"field": "score", "direction": "DESC"}', 
 FALSE),

('template_growth', '成长投资策略', '选择高增长、高ROE的成长股', 'fundamental', 'AND',
 '{"excludeST": true, "markets": ["主板", "创业板", "科创板"]}',
 '{"field": "profit_yoy", "direction": "DESC"}',
 FALSE),

('template_tech_breakout', '技术突破策略', '选择放量突破、趋势向上的强势股', 'technical', 'AND',
 '{"excludeST": true, "minMarketCap": 5000000000}',
 '{"field": "vol_ratio", "direction": "DESC"}',
 FALSE),

('template_moneyflow', '主力资金策略', '选择主力资金持续流入的股票', 'moneyflow', 'AND',
 '{"excludeST": true, "turnoverRange": [3, 15]}',
 '{"field": "net_mf_amount", "direction": "DESC"}',
 FALSE),

('template_composite', '综合评分策略', '技术面+基本面+资金面综合评分', 'composite', 'AND',
 '{"excludeST": true}',
 '{"field": "composite_score", "direction": "DESC"}',
 FALSE);

-- 为模板添加筛选条件
INSERT INTO picker_strategy_filter (id, strategy_id, filter_type, filter_name, field, operator, value, weight, sort_order) VALUES
-- 价值投资策略条件
(UUID(), 'template_value', 'fundamental', '低PE', 'pe_ttm', 'lt', '20', 25, 1),
(UUID(), 'template_value', 'fundamental', '低PB', 'pb', 'lt', '3', 20, 2),
(UUID(), 'template_value', 'fundamental', '高ROE', 'roe', 'gt', '15', 30, 3),
(UUID(), 'template_value', 'fundamental', '低负债率', 'debt_to_assets', 'lt', '50', 15, 4),
(UUID(), 'template_value', 'fundamental', '正收益', 'eps', 'gt', '0', 10, 5),

-- 成长投资策略条件
(UUID(), 'template_growth', 'fundamental', '营收高增长', 'revenue_yoy', 'gt', '30', 25, 1),
(UUID(), 'template_growth', 'fundamental', '利润高增长', 'profit_yoy', 'gt', '30', 25, 2),
(UUID(), 'template_growth', 'fundamental', '高ROE', 'roe', 'gt', '15', 20, 3),
(UUID(), 'template_growth', 'technical', '趋势向上', 'is_trend_up', 'eq', 'true', 15, 4),
(UUID(), 'template_growth', 'moneyflow', '资金流入', 'net_mf_amount', 'gt', '0', 15, 5),

-- 技术突破策略条件
(UUID(), 'template_tech_breakout', 'pattern', '趋势向上', 'is_trend_up', 'eq', 'true', 25, 1),
(UUID(), 'template_tech_breakout', 'pattern', '突破新高', 'is_new_high', 'eq', 'true', 25, 2),
(UUID(), 'template_tech_breakout', 'volume', '放量上涨', 'vol_ratio', 'gt', '1.5', 20, 3),
(UUID(), 'template_tech_breakout', 'technical', 'MACD正值', 'macd', 'gt', '0', 15, 4),
(UUID(), 'template_tech_breakout', 'moneyflow', '资金流入', 'net_mf_amount', 'gt', '0', 15, 5),

-- 主力资金策略条件
(UUID(), 'template_moneyflow', 'moneyflow', '主力净流入', 'net_mf_amount', 'gt', '0', 30, 1),
(UUID(), 'template_moneyflow', 'moneyflow', '大单占比高', 'big_order_ratio', 'gt', '30', 25, 2),
(UUID(), 'template_moneyflow', 'volume', '换手率适中', 'turnover_rate', 'between', '[3, 15]', 20, 3),
(UUID(), 'template_moneyflow', 'pattern', '趋势向上', 'is_trend_up', 'eq', 'true', 15, 4),
(UUID(), 'template_moneyflow', 'technical', 'MACD金叉', 'macd_signal', 'eq', '"golden_cross"', 10, 5);

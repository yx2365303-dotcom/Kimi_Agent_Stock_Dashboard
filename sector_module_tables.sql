-- 板块热点模块数据库建表语句
-- 设计版本: 1.0

-- 1. 板块基础信息表
CREATE TABLE IF NOT EXISTS sector_basic (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ts_code VARCHAR(20) NOT NULL COMMENT '板块代码',
    name VARCHAR(100) NOT NULL COMMENT '板块名称',
    sector_type ENUM('industry', 'concept', 'region') DEFAULT 'concept' COMMENT '板块类型',
    sub_type VARCHAR(50) COMMENT '子类型',
    stock_count INT DEFAULT 0 COMMENT '成分股数量',
    parent_code VARCHAR(20) COMMENT '父板块代码',
    create_date DATE COMMENT '创建日期',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ts_code (ts_code),
    KEY idx_sector_type (sector_type),
    KEY idx_parent_code (parent_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='板块基础信息表';

-- 2. 板块行情数据表
CREATE TABLE IF NOT EXISTS sector_quote (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ts_code VARCHAR(20) NOT NULL COMMENT '板块代码',
    trade_date DATE NOT NULL COMMENT '交易日期',
    open_price DECIMAL(10,4) COMMENT '开盘价',
    high_price DECIMAL(10,4) COMMENT '最高价',
    low_price DECIMAL(10,4) COMMENT '最低价',
    close_price DECIMAL(10,4) COMMENT '收盘价',
    pre_close DECIMAL(10,4) COMMENT '昨收',
    change_amount DECIMAL(10,4) COMMENT '涨跌额',
    pct_change DECIMAL(6,2) COMMENT '涨跌幅(%)',
    volume BIGINT COMMENT '成交量(手)',
    amount DECIMAL(20,2) COMMENT '成交金额(元)',
    turnover_rate DECIMAL(6,2) COMMENT '换手率(%)',
    up_count INT DEFAULT 0 COMMENT '上涨家数',
    down_count INT DEFAULT 0 COMMENT '下跌家数',
    flat_count INT DEFAULT 0 COMMENT '平盘家数',
    limit_up_count INT DEFAULT 0 COMMENT '涨停家数',
    limit_down_count INT DEFAULT 0 COMMENT '跌停家数',
    net_inflow DECIMAL(20,2) COMMENT '净流入(元)',
    main_inflow DECIMAL(20,2) COMMENT '主力净流入(元)',
    retail_inflow DECIMAL(20,2) COMMENT '散户净流入(元)',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ts_date (ts_code, trade_date),
    KEY idx_trade_date (trade_date),
    KEY idx_pct_change (trade_date, pct_change),
    KEY idx_amount (trade_date, amount)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='板块行情数据表';

-- 3. 板块热度表
CREATE TABLE IF NOT EXISTS sector_heat (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ts_code VARCHAR(20) NOT NULL COMMENT '板块代码',
    trade_date DATE NOT NULL COMMENT '交易日期',
    heat_score DECIMAL(6,2) COMMENT '热度得分(0-100)',
    heat_rank INT COMMENT '热度排名',
    price_score DECIMAL(5,2) COMMENT '价格热度',
    volume_score DECIMAL(5,2) COMMENT '成交量热度',
    fund_score DECIMAL(5,2) COMMENT '资金热度',
    news_score DECIMAL(5,2) COMMENT '舆情热度',
    market_position DECIMAL(4,2) COMMENT '市场地位(0-1)',
    continuity_days INT DEFAULT 0 COMMENT '连续活跃天数',
    is_hot BOOLEAN DEFAULT FALSE COMMENT '是否热点',
    hot_tag VARCHAR(50) COMMENT '热点标签',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ts_date (ts_code, trade_date),
    KEY idx_heat_rank (trade_date, heat_rank),
    KEY idx_is_hot (trade_date, is_hot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='板块热度表';

-- 4. 板块成分股关联表
CREATE TABLE IF NOT EXISTS sector_stock_map (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sector_code VARCHAR(20) NOT NULL COMMENT '板块代码',
    stock_code VARCHAR(20) NOT NULL COMMENT '股票代码',
    stock_name VARCHAR(100) COMMENT '股票名称',
    weight DECIMAL(6,4) DEFAULT 1.0 COMMENT '权重',
    is_leader BOOLEAN DEFAULT FALSE COMMENT '是否龙头',
    join_date DATE COMMENT '加入日期',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_sector_stock (sector_code, stock_code),
    KEY idx_stock (stock_code),
    KEY idx_sector_code (sector_code),
    KEY idx_is_leader (sector_code, is_leader)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='板块成分股关联表';

-- 5. 板块轮动记录表
CREATE TABLE IF NOT EXISTS sector_rotation (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    trade_date DATE NOT NULL COMMENT '交易日期',
    sector_code VARCHAR(20) NOT NULL COMMENT '板块代码',
    sector_name VARCHAR(100) COMMENT '板块名称',
    sector_type ENUM('industry', 'concept', 'region') COMMENT '板块类型',
    rotation_phase ENUM('leading', 'following', 'lagging', 'recovering') 
        COMMENT '轮动阶段:领涨/跟涨/滞涨/复苏',
    momentum_score DECIMAL(6,2) COMMENT '动量得分',
    relative_strength DECIMAL(6,2) COMMENT '相对强弱',
    trend_5d DECIMAL(6,2) COMMENT '5日趋势',
    trend_10d DECIMAL(6,2) COMMENT '10日趋势',
    trend_20d DECIMAL(6,2) COMMENT '20日趋势',
    rotation_type VARCHAR(50) COMMENT '轮动类型',
    related_sectors JSON COMMENT '关联板块',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_date_sector (trade_date, sector_code),
    KEY idx_phase (trade_date, rotation_phase),
    KEY idx_momentum (trade_date, momentum_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='板块轮动记录表';

-- 6. 板块关联关系表
CREATE TABLE IF NOT EXISTS sector_correlation (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sector_code_a VARCHAR(20) NOT NULL COMMENT '板块A代码',
    sector_code_b VARCHAR(20) NOT NULL COMMENT '板块B代码',
    trade_date DATE NOT NULL COMMENT '计算日期',
    correlation DECIMAL(5,4) COMMENT '相关系数',
    lead_lag INT COMMENT '领先滞后天数',
    p_value DECIMAL(6,4) COMMENT 'P值',
    period INT DEFAULT 60 COMMENT '计算周期(天)',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_pair_date (sector_code_a, sector_code_b, trade_date, period),
    KEY idx_correlation (trade_date, correlation)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='板块关联关系表';

-- 7. 板块涨停统计表
CREATE TABLE IF NOT EXISTS sector_limit_up_stats (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ts_code VARCHAR(20) NOT NULL COMMENT '板块代码',
    trade_date DATE NOT NULL COMMENT '交易日期',
    limit_up_count INT DEFAULT 0 COMMENT '涨停家数',
    limit_down_count INT DEFAULT 0 COMMENT '跌停家数',
    up_count INT DEFAULT 0 COMMENT '上涨家数',
    down_count INT DEFAULT 0 COMMENT '下跌家数',
    continuity_days INT DEFAULT 0 COMMENT '连续涨停天数',
    strongest_stock VARCHAR(20) COMMENT '最强个股',
    strongest_pct DECIMAL(6,2) COMMENT '最强个股涨幅',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ts_date (ts_code, trade_date),
    KEY idx_limit_up (trade_date, limit_up_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='板块涨停统计表';

-- 8. 开盘啦题材数据表
CREATE TABLE IF NOT EXISTS kpl_concept_data (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    trade_date DATE NOT NULL COMMENT '交易日期',
    ts_code VARCHAR(20) NOT NULL COMMENT '题材代码',
    name VARCHAR(100) COMMENT '题材名称',
    z_t_num INT DEFAULT 0 COMMENT '涨停数',
    up_num VARCHAR(20) COMMENT '上涨家数(如: 45/50)',
    hot_score DECIMAL(6,2) COMMENT '热度得分',
    leader_stock VARCHAR(20) COMMENT '龙头股',
    leader_pct DECIMAL(6,2) COMMENT '龙头股涨幅',
    concept_desc TEXT COMMENT '题材描述',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_date_code (trade_date, ts_code),
    KEY idx_hot_score (trade_date, hot_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='开盘啦题材数据表';

-- 9. 最强板块统计表
CREATE TABLE IF NOT EXISTS strongest_sector_stats (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ts_code VARCHAR(20) NOT NULL COMMENT '板块代码',
    name VARCHAR(100) COMMENT '板块名称',
    trade_date DATE NOT NULL COMMENT '交易日期',
    strong_days INT DEFAULT 0 COMMENT '连续强势天数',
    total_pct_chg DECIMAL(6,2) COMMENT '累计涨幅',
    up_nums INT DEFAULT 0 COMMENT '上涨家数',
    rank_num INT COMMENT '排名',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ts_date (ts_code, trade_date),
    KEY idx_rank (trade_date, rank_num)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='最强板块统计表';

-- 10. 板块资金流向历史表
CREATE TABLE IF NOT EXISTS sector_fund_flow (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ts_code VARCHAR(20) NOT NULL COMMENT '板块代码',
    trade_date DATE NOT NULL COMMENT '交易日期',
    net_inflow DECIMAL(20,2) COMMENT '净流入',
    main_inflow DECIMAL(20,2) COMMENT '主力流入',
    main_outflow DECIMAL(20,2) COMMENT '主力流出',
    retail_inflow DECIMAL(20,2) COMMENT '散户流入',
    retail_outflow DECIMAL(20,2) COMMENT '散户流出',
    large_inflow DECIMAL(20,2) COMMENT '大单流入',
    medium_inflow DECIMAL(20,2) COMMENT '中单流入',
    small_inflow DECIMAL(20,2) COMMENT '小单流入',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ts_date (ts_code, trade_date),
    KEY idx_net_inflow (trade_date, net_inflow)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='板块资金流向历史表';

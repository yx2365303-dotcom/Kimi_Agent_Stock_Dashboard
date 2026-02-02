# 板块热点模块设计方案

## 一、数据表分析

### 1.1 核心数据表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| ths_index | 同花顺概念和行业指数 | ts_code, name, count, type |
| ths_daily | 板块指数行情 | ts_code, trade_date, close, pct_change, vol, turnover_rate |
| ths_member | 板块成分股 | ts_code, con_code, con_name |
| kpl_concept | 开盘啦题材库 | trade_date, ts_code, name, z_t_num(涨停数), up_num |
| kpl_concept_cons | 开盘啦题材成分 | ts_code, name, con_name, hot_num |
| limit_cpt_list | 最强板块统计 | ts_code, name, trade_date, days, up_nums, pct_chg, rank |
| ths_hot | 同花顺热榜 | trade_date, ts_code, rank, pct_change, hot, concept |
| daily_basic | 每日指标 | ts_code, total_mv, circ_mv, turnover_rate |
| stock_basic | 基础信息 | ts_code, name, industry |

### 1.2 板块分类体系

```
板块分类
├── 行业板块 (Industry)
│   ├── 一级行业 (如: 金融、科技、消费)
│   └── 二级行业 (如: 银行、证券、保险)
├── 概念板块 (Concept)
│   ├── 热点概念 (如: AI、新能源)
│   └── 主题概念 (如: 国企改革、一带一路)
└── 地域板块 (Region)
    └── 按省份/城市划分
```

---

## 二、板块数据结构

### 2.1 板块基础信息表 (sector_basic)

```sql
CREATE TABLE sector_basic (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ts_code VARCHAR(20) NOT NULL COMMENT '板块代码',
    name VARCHAR(100) NOT NULL COMMENT '板块名称',
    sector_type ENUM('industry', 'concept', 'region') COMMENT '板块类型',
    sub_type VARCHAR(50) COMMENT '子类型',
    stock_count INT DEFAULT 0 COMMENT '成分股数量',
    parent_code VARCHAR(20) COMMENT '父板块代码',
    create_date DATE COMMENT '创建日期',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ts_code (ts_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='板块基础信息表';
```

### 2.2 板块行情数据表 (sector_quote)

```sql
CREATE TABLE sector_quote (
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
    -- 衍生指标
    up_count INT DEFAULT 0 COMMENT '上涨家数',
    down_count INT DEFAULT 0 COMMENT '下跌家数',
    flat_count INT DEFAULT 0 COMMENT '平盘家数',
    limit_up_count INT DEFAULT 0 COMMENT '涨停家数',
    limit_down_count INT DEFAULT 0 COMMENT '跌停家数',
    -- 资金流向
    net_inflow DECIMAL(20,2) COMMENT '净流入(元)',
    main_inflow DECIMAL(20,2) COMMENT '主力净流入(元)',
    retail_inflow DECIMAL(20,2) COMMENT '散户净流入(元)',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ts_date (ts_code, trade_date),
    KEY idx_trade_date (trade_date),
    KEY idx_pct_change (trade_date, pct_change)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='板块行情数据表';
```

### 2.3 板块热度表 (sector_heat)

```sql
CREATE TABLE sector_heat (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    ts_code VARCHAR(20) NOT NULL COMMENT '板块代码',
    trade_date DATE NOT NULL COMMENT '交易日期',
    heat_score DECIMAL(6,2) COMMENT '热度得分(0-100)',
    heat_rank INT COMMENT '热度排名',
    -- 热度因子
    price_score DECIMAL(5,2) COMMENT '价格热度',
    volume_score DECIMAL(5,2) COMMENT '成交量热度',
    fund_score DECIMAL(5,2) COMMENT '资金热度',
    news_score DECIMAL(5,2) COMMENT '舆情热度',
    -- 市场地位
    market_position DECIMAL(4,2) COMMENT '市场地位(0-1)',
    continuity_days INT DEFAULT 0 COMMENT '连续活跃天数',
    is_hot BOOLEAN DEFAULT FALSE COMMENT '是否热点',
    hot_tag VARCHAR(50) COMMENT '热点标签',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ts_date (ts_code, trade_date),
    KEY idx_heat_rank (trade_date, heat_rank)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='板块热度表';
```

### 2.4 板块成分股关联表 (sector_stock_map)

```sql
CREATE TABLE sector_stock_map (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sector_code VARCHAR(20) NOT NULL COMMENT '板块代码',
    stock_code VARCHAR(20) NOT NULL COMMENT '股票代码',
    stock_name VARCHAR(100) COMMENT '股票名称',
    weight DECIMAL(6,4) DEFAULT 1.0 COMMENT '权重',
    is_leader BOOLEAN DEFAULT FALSE COMMENT '是否龙头',
    join_date DATE COMMENT '加入日期',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_sector_stock (sector_code, stock_code),
    KEY idx_stock (stock_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='板块成分股关联表';
```

### 2.5 板块轮动记录表 (sector_rotation)

```sql
CREATE TABLE sector_rotation (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    trade_date DATE NOT NULL COMMENT '交易日期',
    sector_code VARCHAR(20) NOT NULL COMMENT '板块代码',
    sector_name VARCHAR(100) COMMENT '板块名称',
    sector_type ENUM('industry', 'concept', 'region') COMMENT '板块类型',
    -- 轮动指标
    rotation_phase ENUM('leading', 'following', 'lagging', 'recovering') 
        COMMENT '轮动阶段:领涨/跟涨/滞涨/复苏',
    momentum_score DECIMAL(6,2) COMMENT '动量得分',
    relative_strength DECIMAL(6,2) COMMENT '相对强弱',
    -- 趋势指标
    trend_5d DECIMAL(6,2) COMMENT '5日趋势',
    trend_10d DECIMAL(6,2) COMMENT '10日趋势',
    trend_20d DECIMAL(6,2) COMMENT '20日趋势',
    -- 轮动特征
    rotation_type VARCHAR(50) COMMENT '轮动类型',
    related_sectors JSON COMMENT '关联板块',
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_date_sector (trade_date, sector_code),
    KEY idx_phase (trade_date, rotation_phase)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='板块轮动记录表';
```

---

## 三、板块热力图设计方案

### 3.1 热力图类型

#### 3.1.1 矩形树状图 (Treemap)

**设计要点：**
- 面积大小 = 板块市值/成交额
- 颜色深浅 = 涨跌幅大小
- 颜色冷暖 = 涨跌方向（红涨绿跌）
- 显示板块名称、涨跌幅、涨停家数

#### 3.1.2 热力矩阵图

```
┌────────────────────────────────────────────────────────────┐
│               板块涨跌热力矩阵 (按行业分类)                    │
├────────────────────────────────────────────────────────────┤
│       │ 金融  │ 科技  │ 消费  │ 医药  │ 能源  │ 制造  │ 地产 │
├───────┼───────┼───────┼───────┼───────┼───────┼───────┼──────┤
│ 1日   │ ■+1.2 │ ■+5.5 │ ■-0.8 │ ■+2.1 │ ■-1.5 │ ■+3.2 │ ■-2.0│
│ 5日   │ ■+3.5 │ ■+12  │ ■+1.2 │ ■+5.8 │ ■-3.2 │ ■+8.5 │ ■-5.1│
│ 10日  │ ■+5.8 │ ■+18  │ ■+3.5 │ ■+8.2 │ ■-5.8 │ ■+12  │ ■-8.2│
│ 20日  │ ■+8.2 │ ■+25  │ ■+5.1 │ ■+10  │ ■-8.5 │ ■+15  │ ■-10 │
│ 60日  │ ■+12  │ ■+35  │ ■+8.5 │ ■+15  │ ■-12  │ ■+22  │ ■-15 │
└───────┴───────┴───────┴───────┴───────┴───────┴───────┴──────┘
```

### 3.2 热力图配色方案

```javascript
// 涨跌幅热力配色
const heatmapColors = {
    // 上涨色系 (红色)
    up: {
        extreme: '#8B0000',    // > +7% 深红
        strong: '#CD0000',     // +5% ~ +7% 大红
        moderate: '#FF4444',   // +3% ~ +5% 中红
        weak: '#FF8888',       // +1% ~ +3% 浅红
        slight: '#FFCCCC'      // 0 ~ +1% 微红
    },
    // 下跌色系 (绿色)
    down: {
        extreme: '#006400',    // < -7% 深绿
        strong: '#228B22',     // -7% ~ -5% 大绿
        moderate: '#32CD32',   // -5% ~ -3% 中绿
        weak: '#90EE90',       // -3% ~ -1% 浅绿
        slight: '#CCFFCC'      // -1% ~ 0 微绿
    },
    neutral: '#F0F0F0'         // 平盘
};

// 热度配色 (蓝色系)
const heatScoreColors = [
    '#E3F2FD',  // 0-20 极低
    '#90CAF9',  // 20-40 较低
    '#42A5F5',  // 40-60 中等
    '#1E88E5',  // 60-80 较高
    '#1565C0'   // 80-100 极高
];
```

### 3.3 热力图交互设计

```javascript
// 热力图交互配置
const heatmapConfig = {
    // 悬停提示
    tooltip: {
        show: true,
        formatter: (params) => {
            return `
                <div class="sector-tooltip">
                    <h4>${params.name}</h4>
                    <p>涨跌幅: <span class="${params.value >= 0 ? 'up' : 'down'}">${params.value}%</span></p>
                    <p>涨停家数: ${params.data.limitUpCount}</p>
                    <p>成交额: ${formatAmount(params.data.amount)}</p>
                    <p>热度排名: #${params.data.heatRank}</p>
                </div>
            `;
        }
    },
    // 点击事件
    clickAction: 'drillDown',
    // 下钻功能
    drillDown: {
        enabled: true,
        target: 'sectorStocks',
    },
    // 联动筛选
    linkage: {
        enabled: true,
        targets: ['sectorRank', 'stockList']
    }
};
```

---

## 四、排行展示方式

### 4.1 板块涨跌幅排行

```
┌─────────────────────────────────────────────────────────────────────┐
│                    板块涨跌幅排行 (2024-01-15)                        │
├─────────────────────────────────────────────────────────────────────┤
│  涨幅榜                              │  跌幅榜                        │
├─────────────────────────────────────────────────────────────────────┤
│  排名  板块名称    涨跌幅  涨停数    │  排名  板块名称    涨跌幅  跌停数│
│  ─────────────────────────────────   │  ──────────────────────────────│
│  1    半导体     +5.23%   8只      │  1    煤炭      -3.52%   0只   │
│  2    人工智能   +4.85%   6只      │  2    房地产    -2.81%   1只   │
│  3    芯片概念   +4.62%   5只      │  3    银行      -1.95%   0只   │
│  4    新能源     +3.78%   4只      │  4    保险      -1.72%   0只   │
│  5    5G通信     +3.45%   3只      │  5    石油      -1.58%   0只   │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 板块资金流向排行

```
┌─────────────────────────────────────────────────────────────────────┐
│                    板块资金流向排行 (亿元)                            │
├─────────────────────────────────────────────────────────────────────┤
│  净流入榜                            │  净流出榜                      │
├─────────────────────────────────────────────────────────────────────┤
│  排名  板块名称    净流入   主力流入   │  排名  板块名称    净流出  主力流出│
│  ───────────────────────────────────  │  ────────────────────────────────│
│  1    半导体     +25.8    +18.5      │  1    银行      -15.2   -12.3   │
│  2    人工智能   +22.3    +16.8      │  2    房地产    -12.8   -10.5   │
│  3    新能源     +18.5    +13.2      │  3    煤炭      -10.5   -8.2    │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 开盘啦题材排行

```
┌─────────────────────────────────────────────────────────────────────┐
│                    开盘啦热门题材排行                                 │
├─────────────────────────────────────────────────────────────────────┤
│  排名  题材名称    涨停数  上涨家数  热度  龙头股                    │
├─────────────────────────────────────────────────────────────────────┤
│  1    ChatGPT      12     45/50    98    科大讯飞 +10.02%           │
│  2    算力概念      8     38/42    92    浪潮信息 +10.00%           │
│  3    芯片封装      7     35/40    88    长电科技 +9.98%            │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.4 最强板块统计

```
┌─────────────────────────────────────────────────────────────────────┐
│                    最强板块统计 (连续强势)                            │
├─────────────────────────────────────────────────────────────────────┤
│  板块名称    连续天数  累计涨幅  涨停家数  龙头股      趋势          │
├─────────────────────────────────────────────────────────────────────┤
│  半导体       5天     +15.2%    18只    中芯国际   ████████░░ 强势  │
│  人工智能     4天     +12.8%    15只    科大讯飞   ██████░░░░ 上升  │
│  芯片概念     4天     +11.5%    12只    北方华创   ██████░░░░ 上升  │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.5 排行组件设计

```javascript
// 排行组件配置
const rankConfig = {
    // 排序选项
    sortOptions: [
        { key: 'pct_change', label: '涨跌幅', default: true },
        { key: 'net_inflow', label: '净流入' },
        { key: 'heat_score', label: '热度' },
        { key: 'limit_up_count', label: '涨停数' },
        { key: 'turnover_rate', label: '换手率' },
        { key: 'amount', label: '成交额' }
    ],
    // 时间周期
    timeRanges: ['1日', '5日', '10日', '20日', '60日'],
    // 板块类型筛选
    sectorTypes: ['全部', '行业板块', '概念板块', '地域板块'],
    // 刷新频率
    refreshInterval: 30000, // 30秒
    // 分页
    pagination: {
        enabled: true,
        pageSize: 20,
        showTotal: true
    }
};
```

---

## 五、板块轮动可视化方案

### 5.1 轮动周期图

```
┌─────────────────────────────────────────────────────────────────────┐
│                    板块轮动周期图                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│    领涨期 ────────────────────────────────────────────────►         │
│      │    半导体 ████████████████████                               │
│      │    芯片   ██████████████████                                 │
│      │    5G     ████████████████                                   │
│      ▼                                                              │
│    跟涨期                                                           │
│      │    新能源 ██████████████                                     │
│      │    云计算 ████████████                                       │
│      ▼                                                              │
│    滞涨期                                                           │
│      │    银行   ░░░░░░░░░░░░                                       │
│      │    地产   ░░░░░░░░░░░░░░                                     │
│      ▼                                                              │
│    调整期                                                           │
│      │    煤炭   ░░░░░░░░░░░░░░░░░░                                 │
│      │    钢铁   ░░░░░░░░░░░░░░░░                                   │
│      │                                                              │
│      └─────────────────────────────────────────────────────► 时间    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 轮动雷达图

```
┌─────────────────────────────────────────────────────────────────────┐
│                    板块轮动雷达图                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                         科技                                        │
│                          │                                          │
│                          │                                          │
│        周期 ◄────────────┼────────────► 消费                       │
│                          │                                          │
│                          │                                          │
│       金融 ◄─────────────┼─────────────► 医药                      │
│                          │                                          │
│                          │                                          │
│                         制造                                        │
│                                                                     │
│  当前热点: 科技(85) > 制造(72) > 消费(65) > 医药(58)                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 轮动可视化组件配置

```javascript
// 轮动可视化配置
const rotationConfig = {
    // 轮动图表类型
    chartTypes: {
        cycle: 'cycleChart',
        radar: 'radarChart',
        timeline: 'timelineChart',
        heatmap: 'heatmapChart',
        network: 'networkGraph'
    },

    // 轮动阶段定义
    phases: {
        leading: { label: '领涨期', color: '#FF4444', icon: '🔥' },
        following: { label: '跟涨期', color: '#FF8844', icon: '📈' },
        lagging: { label: '滞涨期', color: '#FFAA44', icon: '⏸️' },
        recovering: { label: '复苏期', color: '#44AA44', icon: '🌱' },
        declining: { label: '调整期', color: '#4444FF', icon: '📉' }
    },

    // 轮动预警
    alerts: {
        newLeader: { enabled: true, threshold: 3 },
        phaseChange: { enabled: true },
        overHeat: { enabled: true, threshold: 90 },
        opportunity: { enabled: true, threshold: 20 }
    }
};
```

---

## 六、板块关联分析算法

### 6.1 相关性分析算法

```python
import numpy as np
import pandas as pd
from scipy.stats import pearsonr

class SectorCorrelationAnalyzer:
    """板块关联分析器"""

    def __init__(self):
        self.correlation_matrix = None
        self.lead_lag_matrix = None

    def calculate_price_correlation(self, sector_returns, method="pearson"):
        """计算板块价格相关性"""
        corr_matrix = sector_returns.corr(method=method)
        self.correlation_matrix = corr_matrix
        return corr_matrix

    def calculate_lead_lag(self, sector_returns, max_lag=5):
        """计算板块领先滞后关系"""
        sectors = sector_returns.columns
        n = len(sectors)
        lead_lag = pd.DataFrame(np.zeros((n, n)), 
                                index=sectors, columns=sectors)

        for i, sector_a in enumerate(sectors):
            for j, sector_b in enumerate(sectors):
                if i != j:
                    max_corr = 0
                    best_lag = 0

                    for lag in range(-max_lag, max_lag + 1):
                        if lag < 0:
                            corr, _ = pearsonr(
                                sector_returns[sector_a].iloc[:lag],
                                sector_returns[sector_b].iloc[-lag:]
                            )
                        elif lag > 0:
                            corr, _ = pearsonr(
                                sector_returns[sector_a].iloc[lag:],
                                sector_returns[sector_b].iloc[:-lag]
                            )
                        else:
                            corr, _ = pearsonr(
                                sector_returns[sector_a],
                                sector_returns[sector_b]
                            )

                        if abs(corr) > abs(max_corr):
                            max_corr = corr
                            best_lag = lag

                    lead_lag.loc[sector_a, sector_b] = best_lag

        self.lead_lag_matrix = lead_lag
        return lead_lag

    def find_sector_clusters(self, corr_matrix, threshold=0.7):
        """发现板块聚类"""
        from sklearn.cluster import AgglomerativeClustering

        distance_matrix = 1 - np.abs(corr_matrix)

        clustering = AgglomerativeClustering(
            n_clusters=None,
            distance_threshold=1-threshold,
            linkage="average",
            metric="precomputed"
        )

        labels = clustering.fit_predict(distance_matrix)

        clusters = {}
        for sector, label in zip(corr_matrix.index, labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(sector)

        return list(clusters.values())
```

### 6.2 板块联动效应分析

```python
class SectorLinkageAnalyzer:
    """板块联动效应分析"""

    def calculate_linkage_strength(self, sector_data, window=20):
        """计算板块联动强度"""
        results = {}

        for sector in sector_data.columns:
            sector_returns = sector_data[sector]

            sync_index = self._calculate_sync_index(sector_returns, window)
            transmission_speed = self._calculate_transmission_speed(sector_returns, window)
            influence_scope = self._calculate_influence_scope(sector_returns, sector_data)

            results[sector] = {
                "sync_index": sync_index,
                "transmission_speed": transmission_speed,
                "influence_scope": influence_scope
            }

        return results
```

---

## 七、数据更新策略

### 7.1 数据更新频率

| 数据类型 | 更新频率 | 更新时间 | 数据源 |
|----------|----------|----------|--------|
| 板块行情 | 实时/1分钟 | 交易日 9:30-15:00 | ths_daily |
| 板块热度 | 5分钟 | 交易日 9:30-15:00 | 计算指标 |
| 资金流向 | 5分钟 | 交易日 9:30-15:00 | 计算指标 |
| 涨停数据 | 实时 | 交易日 9:30-15:00 | kpl_concept |
| 热榜数据 | 实时 | 交易日 9:30-15:00 | ths_hot |
| 日终数据 | 日度 | 交易日 15:30 | 批量更新 |
| 历史数据 | 日度 | 每日凌晨 2:00 | 批量更新 |
| 关联分析 | 日度 | 每日凌晨 3:00 | 计算指标 |
| 轮动分析 | 日度 | 每日凌晨 4:00 | 计算指标 |

### 7.2 缓存策略

```python
CACHE_CONFIG = {
    "strategies": {
        "realtime_data": { "ttl": 60, "key_pattern": "rt:{type}:{code}" },
        "rank_data": { "ttl": 300, "key_pattern": "rank:{type}:{period}" },
        "heatmap_data": { "ttl": 300, "key_pattern": "heatmap:{type}:{date}" },
        "historical_data": { "ttl": 86400, "key_pattern": "hist:{type}:{code}:{date}" },
        "analysis_result": { "ttl": 3600, "key_pattern": "analysis:{type}:{params_hash}" }
    }
}
```

---

## 八、热度计算算法

### 8.1 板块热度综合评分模型

```python
class SectorHeatCalculator:
    """板块热度计算器"""

    def __init__(self):
        self.weights = {
            "price": 0.30,
            "volume": 0.20,
            "fund": 0.25,
            "limit_up": 0.15,
            "continuity": 0.10
        }

    def calculate_heat_score(self, sector_data):
        """计算板块热度得分 (0-100)"""
        price_score = self._calculate_price_score(
            sector_data["pct_change"],
            sector_data["trend_5d"],
            sector_data["trend_10d"]
        )

        volume_score = self._calculate_volume_score(
            sector_data["volume_ratio"],
            sector_data["turnover_rate"]
        )

        fund_score = self._calculate_fund_score(
            sector_data["net_inflow"],
            sector_data["main_inflow"]
        )

        limit_up_score = self._calculate_limit_up_score(
            sector_data["limit_up_count"],
            sector_data["up_count"]
        )

        continuity_score = self._calculate_continuity_score(
            sector_data["continuity_days"],
            sector_data["heat_history"]
        )

        heat_score = (
            price_score * self.weights["price"] +
            volume_score * self.weights["volume"] +
            fund_score * self.weights["fund"] +
            limit_up_score * self.weights["limit_up"] +
            continuity_score * self.weights["continuity"]
        )

        return min(100, max(0, heat_score))
```

### 8.2 热度等级划分

| 等级 | 分数范围 | 标签 | 颜色 | 描述 |
|------|----------|------|------|------|
| 极高 | 80-100 | 🔥🔥🔥 | #FF0000 | 市场焦点，资金高度集中 |
| 高 | 60-80 | 🔥🔥 | #FF4444 | 关注度较高，资金持续流入 |
| 中等 | 40-60 | 🔥 | #FFAA00 | 正常关注，资金进出平衡 |
| 低 | 20-40 | ❄️ | #4488FF | 关注度较低，资金流出 |
| 极低 | 0-20 | ❄️❄️ | #0000FF | 市场冷落，资金持续流出 |

---

## 九、API接口设计

### 9.1 板块相关API

```javascript
// 板块数据API
const sectorAPI = {
    // 获取板块列表
    getSectorList: (params) => `/api/sectors?type=${params.type}&page=${params.page}`,

    // 获取板块行情
    getSectorQuote: (code, period) => `/api/sectors/${code}/quote?period=${period}`,

    // 获取板块排行
    getSectorRank: (params) => `/api/sectors/rank?sort=${params.sort}&limit=${params.limit}`,

    // 获取板块热力图数据
    getHeatmapData: (date) => `/api/sectors/heatmap?date=${date}`,

    // 获取板块成分股
    getSectorStocks: (code) => `/api/sectors/${code}/stocks`,

    // 获取板块轮动数据
    getRotationData: (params) => `/api/sectors/rotation?period=${params.period}`,

    // 获取板块关联分析
    getCorrelation: (params) => `/api/sectors/correlation?codes=${params.codes}`,

    // 获取开盘啦题材
    getKplConcepts: (date) => `/api/sectors/kpl?date=${date}`,

    // 获取最强板块
    getStrongestSectors: (params) => `/api/sectors/strongest?days=${params.days}`
};
```

---

## 十、前端组件清单

| 组件名称 | 功能描述 | 技术栈 |
|----------|----------|--------|
| SectorHeatmap | 板块热力图 | ECharts Treemap |
| SectorRankList | 板块排行列表 | React + Ant Design |
| SectorRotationChart | 轮动分析图表 | ECharts |
| SectorCorrelationGraph | 关联关系图谱 | D3.js / G6 |
| KplConceptPanel | 开盘啦题材面板 | React |
| SectorDetailModal | 板块详情弹窗 | React + Ant Design |
| FundFlowChart | 资金流向图 | ECharts |
| HeatScoreIndicator | 热度指示器 | React |

---

*文档版本: 1.0*
*设计日期: 2024年*


# 算法选股模块设计文档

## 一、模块概述

算法选股模块是股票数据看板的核心功能模块，支持多维度组合筛选、技术指标选股、基本面选股、资金面选股、形态选股等多种选股方式，并提供历史回测和预警提醒功能。

### 核心能力
- 多维度组合筛选（技术/基本面/资金面/形态）
- 策略自定义与保存
- 历史回测验证
- 实时预警提醒
- 选股结果管理与导出

---

## 二、选股条件数据结构

### 2.1 选股策略 Schema

```typescript
// 选股策略完整结构
interface StockPickerStrategy {
  // 基础信息
  id: string;                    // 策略唯一ID
  name: string;                  // 策略名称
  description?: string;          // 策略描述
  category: StrategyCategory;    // 策略分类

  // 筛选条件
  filters: StockFilter[];        // 筛选条件列表
  filterLogic: 'AND' | 'OR';     // 条件组合逻辑

  // 排序配置
  sortBy?: SortConfig;           // 排序配置

  // 股票池配置
  stockPool?: StockPoolConfig;   // 股票池限制

  // 回测配置
  backtest?: BacktestConfig;     // 回测参数

  // 预警配置
  alert?: AlertConfig;           // 预警设置

  // 元数据
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  runCount: number;
}

// 策略分类
enum StrategyCategory {
  TECHNICAL = 'technical',       // 技术指标
  FUNDAMENTAL = 'fundamental',   // 基本面
  MONEYFLOW = 'moneyflow',       // 资金流向
  PATTERN = 'pattern',           // 形态选股
  COMPOSITE = 'composite',       // 综合策略
  CUSTOM = 'custom'              // 自定义
}
```

### 2.2 筛选条件结构

```typescript
// 通用筛选条件
interface StockFilter {
  id: string;                    // 条件ID
  type: FilterType;              // 筛选类型
  field: string;                 // 筛选字段
  operator: FilterOperator;      // 操作符
  value: any;                    // 筛选值
  value2?: any;                  // 范围值（用于范围操作符）
  weight?: number;               // 权重（用于排序）
  enabled: boolean;              // 是否启用
}

// 筛选类型
enum FilterType {
  // 技术指标
  MACD = 'macd',
  KDJ = 'kdj',
  RSI = 'rsi',
  BOLL = 'boll',
  MA = 'ma',
  VOL = 'volume',

  // 基本面
  PE = 'pe',
  PB = 'pb',
  PS = 'ps',
  ROE = 'roe',
  ROA = 'roa',
  EPS = 'eps',
  REVENUE = 'revenue',
  PROFIT = 'profit',
  DEBT_RATIO = 'debt_ratio',

  // 资金流向
  NET_MF = 'net_mf',             // 主力净流入
  MAIN_FORCE = 'main_force',     // 主力资金
  BIG_ORDER = 'big_order',       // 大单占比
  TURNOVER = 'turnover',         // 换手率

  // 形态
  PRICE_PATTERN = 'price_pattern',
  VOL_PATTERN = 'vol_pattern',
  BREAKOUT = 'breakout',
  SUPPORT_RESIST = 'support_resist',

  // 其他
  PRICE = 'price',
  PCT_CHG = 'pct_chg',
  MARKET_CAP = 'market_cap',
  INDUSTRY = 'industry',
  LIST_DATE = 'list_date'
}

// 操作符
enum FilterOperator {
  EQ = 'eq',                     // 等于
  NE = 'ne',                     // 不等于
  GT = 'gt',                     // 大于
  GTE = 'gte',                   // 大于等于
  LT = 'lt',                     // 小于
  LTE = 'lte',                   // 小于等于
  BETWEEN = 'between',           // 介于
  IN = 'in',                     // 包含
  NOT_IN = 'not_in',             // 不包含
  LIKE = 'like'                  // 模糊匹配
}
```

### 2.3 预定义筛选条件模板

```typescript
// 技术指标筛选模板
const TECHNICAL_FILTERS = {
  // MACD金叉
  macdGoldenCross: {
    type: FilterType.MACD,
    name: 'MACD金叉',
    description: 'DIF上穿DEA',
    field: 'macd_signal',
    operator: FilterOperator.EQ,
    value: 'golden_cross',
    params: { fast: 12, slow: 26, signal: 9 }
  },

  // MACD死叉
  macdDeathCross: {
    type: FilterType.MACD,
    name: 'MACD死叉',
    description: 'DIF下穿DEA',
    field: 'macd_signal',
    operator: FilterOperator.EQ,
    value: 'death_cross'
  },

  // MACD红柱放大
  macdRedExpand: {
    type: FilterType.MACD,
    name: 'MACD红柱放大',
    description: 'MACD柱状体连续放大',
    field: 'macd_hist_trend',
    operator: FilterOperator.EQ,
    value: 'expanding_positive'
  },

  // KDJ金叉
  kdjGoldenCross: {
    type: FilterType.KDJ,
    name: 'KDJ金叉',
    description: 'K值上穿D值',
    field: 'kdj_signal',
    operator: FilterOperator.EQ,
    value: 'golden_cross',
    params: { n: 9, m1: 3, m2: 3 }
  },

  // KDJ超卖区金叉
  kdjOversoldGolden: {
    type: FilterType.KDJ,
    name: 'KDJ超卖区金叉',
    description: 'KDJ在20以下金叉',
    field: 'kdj_status',
    operator: FilterOperator.EQ,
    value: 'oversold_golden',
    params: { oversold: 20 }
  },

  // RSI超卖
  rsiOversold: {
    type: FilterType.RSI,
    name: 'RSI超卖',
    description: 'RSI小于30',
    field: 'rsi',
    operator: FilterOperator.LT,
    value: 30,
    params: { n: 14 }
  },

  // RSI超买
  rsiOverbought: {
    type: FilterType.RSI,
    name: 'RSI超买',
    description: 'RSI大于70',
    field: 'rsi',
    operator: FilterOperator.GT,
    value: 70
  },

  // 布林带突破上轨
  bollBreakUpper: {
    type: FilterType.BOLL,
    name: '布林带突破上轨',
    description: '股价突破布林带上轨',
    field: 'boll_status',
    operator: FilterOperator.EQ,
    value: 'break_upper',
    params: { n: 20, p: 2 }
  },

  // 布林带下轨反弹
  bollBounceLower: {
    type: FilterType.BOLL,
    name: '布林带下轨反弹',
    description: '股价触及布林带下轨后反弹',
    field: 'boll_status',
    operator: FilterOperator.EQ,
    value: 'bounce_lower'
  },

  // 均线多头排列
  maBullishArrange: {
    type: FilterType.MA,
    name: '均线多头排列',
    description: '5日>10日>20日>60日均线',
    field: 'ma_arrange',
    operator: FilterOperator.EQ,
    value: 'bullish',
    params: { periods: [5, 10, 20, 60] }
  },

  // 股价站上所有均线
  priceAboveAllMA: {
    type: FilterType.MA,
    name: '股价站上所有均线',
    description: '收盘价大于所有均线',
    field: 'price_vs_ma',
    operator: FilterOperator.EQ,
    value: 'above_all',
    params: { periods: [5, 10, 20, 60] }
  },

  // 放量上涨
  volBreakoutUp: {
    type: FilterType.VOL,
    name: '放量上涨',
    description: '成交量放大且股价上涨',
    field: 'vol_pattern',
    operator: FilterOperator.EQ,
    value: 'breakout_up',
    params: { vol_ratio: 2.0, pct_chg: 3.0 }
  },

  // 缩量回调
  volShrinkPullback: {
    type: FilterType.VOL,
    name: '缩量回调',
    description: '成交量萎缩且股价回调',
    field: 'vol_pattern',
    operator: FilterOperator.EQ,
    value: 'shrink_pullback',
    params: { vol_ratio: 0.7, pct_chg: -2.0 }
  }
};

// 基本面筛选模板
const FUNDAMENTAL_FILTERS = {
  // 低PE
  lowPE: {
    type: FilterType.PE,
    name: '低市盈率',
    description: 'PE小于行业平均',
    field: 'pe_ttm',
    operator: FilterOperator.LT,
    value: 20
  },

  // 低PB
  lowPB: {
    type: FilterType.PB,
    name: '低市净率',
    description: 'PB小于3',
    field: 'pb',
    operator: FilterOperator.LT,
    value: 3
  },

  // 高ROE
  highROE: {
    type: FilterType.ROE,
    name: '高ROE',
    description: 'ROE大于15%',
    field: 'roe',
    operator: FilterOperator.GT,
    value: 15
  },

  // 高ROA
  highROA: {
    type: FilterType.ROA,
    name: '高ROA',
    description: 'ROA大于10%',
    field: 'roa',
    operator: FilterOperator.GT,
    value: 10
  },

  // 毛利率高
  highGrossMargin: {
    type: FilterType.FUNDAMENTAL,
    name: '高毛利率',
    description: '毛利率大于40%',
    field: 'grossprofit_margin',
    operator: FilterOperator.GT,
    value: 40
  },

  // 净利润增长
  profitGrowth: {
    type: FilterType.PROFIT,
    name: '净利润增长',
    description: '净利润同比增长大于20%',
    field: 'profit_yoy',
    operator: FilterOperator.GT,
    value: 20
  },

  // 营收增长
  revenueGrowth: {
    type: FilterType.REVENUE,
    name: '营收增长',
    description: '营业收入同比增长大于15%',
    field: 'revenue_yoy',
    operator: FilterOperator.GT,
    value: 15
  },

  // 低负债率
  lowDebtRatio: {
    type: FilterType.DEBT_RATIO,
    name: '低负债率',
    description: '资产负债率小于50%',
    field: 'debt_to_assets',
    operator: FilterOperator.LT,
    value: 50
  },

  // 价值股组合
  valueStock: {
    name: '价值投资',
    description: '低PE+低PB+高ROE',
    filters: [
      { field: 'pe_ttm', operator: 'lt', value: 20 },
      { field: 'pb', operator: 'lt', value: 3 },
      { field: 'roe', operator: 'gt', value: 15 }
    ],
    filterLogic: 'AND'
  },

  // 成长股组合
  growthStock: {
    name: '成长股',
    description: '高增长+高ROE',
    filters: [
      { field: 'revenue_yoy', operator: 'gt', value: 30 },
      { field: 'profit_yoy', operator: 'gt', value: 30 },
      { field: 'roe', operator: 'gt', value: 15 }
    ],
    filterLogic: 'AND'
  }
};

// 资金面筛选模板
const MONEYFLOW_FILTERS = {
  // 主力净流入
  mainInflow: {
    type: FilterType.NET_MF,
    name: '主力净流入',
    description: '主力资金净流入为正',
    field: 'net_mf_amount',
    operator: FilterOperator.GT,
    value: 0
  },

  // 主力持续流入
  mainContinuousInflow: {
    type: FilterType.MAIN_FORCE,
    name: '主力持续流入',
    description: '连续3日主力净流入',
    field: 'mf_continuous_days',
    operator: FilterOperator.GTE,
    value: 3
  },

  // 大单占比高
  bigOrderRatio: {
    type: FilterType.BIG_ORDER,
    name: '大单占比高',
    description: '大单成交占比大于30%',
    field: 'big_order_ratio',
    operator: FilterOperator.GT,
    value: 30
  },

  // 换手率适中
  moderateTurnover: {
    type: FilterType.TURNOVER,
    name: '换手率适中',
    description: '换手率在3%-15%之间',
    field: 'turnover_rate',
    operator: FilterOperator.BETWEEN,
    value: 3,
    value2: 15
  },

  // 放量资金流入
  volWithInflow: {
    type: FilterType.MONEYFLOW,
    name: '放量资金流入',
    description: '放量且主力资金大幅流入',
    filters: [
      { field: 'vol_ratio', operator: 'gt', value: 2 },
      { field: 'net_mf_amount', operator: 'gt', value: 1000000 }
    ],
    filterLogic: 'AND'
  }
};

// 形态筛选模板
const PATTERN_FILTERS = {
  // 突破新高
  newHigh: {
    type: FilterType.BREAKOUT,
    name: '突破新高',
    description: '创近60日新高',
    field: 'high_type',
    operator: FilterOperator.EQ,
    value: 'new_high_60'
  },

  // 涨停板
  limitUp: {
    type: FilterType.PRICE_PATTERN,
    name: '涨停板',
    description: '当日涨停',
    field: 'limit_status',
    operator: FilterOperator.EQ,
    value: 'limit_up'
  },

  // 连板股
  continuousLimit: {
    type: FilterType.PRICE_PATTERN,
    name: '连板股',
    description: '连续涨停',
    field: 'limit_count',
    operator: FilterOperator.GTE,
    value: 2
  },

  // 趋势向上
  trendUp: {
    type: FilterType.PRICE_PATTERN,
    name: '趋势向上',
    description: '股价处于上升趋势',
    field: 'is_trend_up',
    operator: FilterOperator.EQ,
    value: true
  },

  // 量价齐升
  priceVolRise: {
    type: FilterType.PATTERN,
    name: '量价齐升',
    description: '价格上涨同时成交量放大',
    filters: [
      { field: 'pct_chg', operator: 'gt', value: 3 },
      { field: 'vol_ratio', operator: 'gt', value: 1.5 }
    ],
    filterLogic: 'AND'
  },

  // 底部放量
  bottomVolBreakout: {
    type: FilterType.PATTERN,
    name: '底部放量',
    description: '低位放量上涨',
    filters: [
      { field: 'is_near_low', operator: 'eq', value: true },
      { field: 'vol_ratio', operator: 'gt', value: 2 },
      { field: 'pct_chg', operator: 'gt', value: 5 }
    ],
    filterLogic: 'AND'
  },

  // 平台突破
  platformBreakout: {
    type: FilterType.BREAKOUT,
    name: '平台突破',
    description: '突破整理平台',
    field: 'pattern_type',
    operator: FilterOperator.EQ,
    value: 'platform_breakout'
  }
};
```

---

## 三、筛选引擎设计

### 3.1 引擎架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     选股筛选引擎 (StockPickerEngine)              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  策略解析器   │  │  SQL构建器    │  │  结果处理器   │          │
│  │  (Parser)    │  │  (Builder)   │  │  (Processor) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  缓存管理器   │  │  计算优化器   │  │  并发控制器   │          │
│  │  (Cache)     │  │  (Optimizer) │  │  (Executor)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 引擎核心类设计

```typescript
// 选股引擎主类
class StockPickerEngine {
  private parser: FilterParser;
  private builder: SQLBuilder;
  private cache: CacheManager;
  private optimizer: QueryOptimizer;
  private executor: QueryExecutor;

  constructor(config: EngineConfig) {
    this.parser = new FilterParser();
    this.builder = new SQLBuilder();
    this.cache = new CacheManager(config.cache);
    this.optimizer = new QueryOptimizer();
    this.executor = new QueryExecutor(config.db);
  }

  // 执行选股
  async pick(strategy: StockPickerStrategy): Promise<PickResult> {
    const cacheKey = this.generateCacheKey(strategy);

    // 1. 检查缓存
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    // 2. 解析策略
    const parsedFilters = this.parser.parse(strategy.filters);

    // 3. 优化查询
    const optimized = this.optimizer.optimize(parsedFilters);

    // 4. 构建SQL
    const sql = this.builder.build(optimized, strategy);

    // 5. 执行查询
    const results = await this.executor.execute(sql);

    // 6. 处理结果
    const processed = this.processResults(results, strategy);

    // 7. 缓存结果
    await this.cache.set(cacheKey, processed, strategy.cacheTTL);

    return processed;
  }

  // 批量选股
  async pickBatch(strategies: StockPickerStrategy[]): Promise<BatchPickResult> {
    // 合并相似查询，减少数据库访问
    const merged = this.optimizer.mergeStrategies(strategies);

    // 并行执行
    const results = await Promise.all(
      merged.map(s => this.pick(s))
    );

    return { results, summary: this.summarize(results) };
  }

  // 生成缓存键
  private generateCacheKey(strategy: StockPickerStrategy): string {
    return `picker:${strategy.id}:${hash(strategy.filters)}:${strategy.stockPool?.tradeDate}`;
  }

  // 处理结果
  private processResults(rows: any[], strategy: StockPickerStrategy): PickResult {
    // 评分排序
    const scored = this.scoreStocks(rows, strategy);

    // 分页
    const paginated = this.paginate(scored, strategy.pagination);

    return {
      total: rows.length,
      stocks: paginated,
      summary: this.generateSummary(rows),
      executedAt: new Date()
    };
  }
}
```

### 3.3 SQL构建器

```typescript
class SQLBuilder {
  // 构建选股SQL
  build(filters: ParsedFilter[], strategy: StockPickerStrategy): string {
    const parts: string[] = [];

    // SELECT
    parts.push(this.buildSelect(strategy));

    // FROM
    parts.push(this.buildFrom(filters));

    // WHERE
    parts.push(this.buildWhere(filters, strategy.filterLogic));

    // ORDER BY
    if (strategy.sortBy) {
      parts.push(this.buildOrderBy(strategy.sortBy));
    }

    // LIMIT
    if (strategy.pagination) {
      parts.push(this.buildLimit(strategy.pagination));
    }

    return parts.join('\n');
  }

  // 构建SELECT
  private buildSelect(strategy: StockPickerStrategy): string {
    const fields = [
      'a.ts_code',
      'a.name',
      'a.trade_date',
      'a.close_price',
      'a.pct_chg',
      'a.vol_ratio',
      'a.amount',
      'b.pe',
      'b.pe_ttm',
      'b.pb',
      'b.total_mv',
      'c.macd',
      'c.kdj_k',
      'c.kdj_d',
      'c.rsi',
      'd.net_mf_amount'
    ];

    // 添加评分字段
    if (strategy.filters.some(f => f.weight)) {
      fields.push(this.buildScoreField(strategy.filters));
    }

    return `SELECT ${fields.join(', ')}`;
  }

  // 构建FROM（多表关联）
  private buildFrom(filters: ParsedFilter[]): string {
    const tables = this.getRequiredTables(filters);

    let sql = `FROM analysis_technical a`;

    if (tables.includes('daily_basic')) {
      sql += `\nLEFT JOIN daily_basic b ON a.ts_code = b.ts_code AND a.trade_date = b.trade_date`;
    }

    if (tables.includes('stk_factor')) {
      sql += `\nLEFT JOIN stk_factor c ON a.ts_code = c.ts_code AND a.trade_date = c.trade_date`;
    }

    if (tables.includes('moneyflow')) {
      sql += `\nLEFT JOIN moneyflow d ON a.ts_code = d.ts_code AND a.trade_date = d.trade_date`;
    }

    if (tables.includes('fina_indicator')) {
      sql += `\nLEFT JOIN fina_indicator e ON a.ts_code = e.ts_code \
              AND e.ann_date = (SELECT MAX(ann_date) FROM fina_indicator WHERE ts_code = a.ts_code AND ann_date <= a.trade_date)`;
    }

    return sql;
  }

  // 构建WHERE条件
  private buildWhere(filters: ParsedFilter[], logic: 'AND' | 'OR'): string {
    const conditions = filters.map(f => this.buildCondition(f));

    // 添加股票池过滤
    conditions.unshift('a.trade_date = (SELECT MAX(trade_date) FROM analysis_technical)');

    const operator = logic === 'AND' ? 'AND' : 'OR';
    return `WHERE ${conditions.join(`\n  ${operator} `)}`;
  }

  // 构建单个条件
  private buildCondition(filter: ParsedFilter): string {
    const { field, operator, value, value2 } = filter;

    switch (operator) {
      case FilterOperator.EQ:
        return `${field} = ${this.quote(value)}`;
      case FilterOperator.GT:
        return `${field} > ${value}`;
      case FilterOperator.GTE:
        return `${field} >= ${value}`;
      case FilterOperator.LT:
        return `${field} < ${value}`;
      case FilterOperator.LTE:
        return `${field} <= ${value}`;
      case FilterOperator.BETWEEN:
        return `${field} BETWEEN ${value} AND ${value2}`;
      case FilterOperator.IN:
        return `${field} IN (${value.map(v => this.quote(v)).join(',')})`;
      default:
        return `${field} = ${this.quote(value)}`;
    }
  }

  // 构建评分字段
  private buildScoreField(filters: ParsedFilter[]): string {
    const scoreParts = filters
      .filter(f => f.weight)
      .map(f => `(CASE WHEN ${this.buildCondition(f)} THEN ${f.weight} ELSE 0 END)`);

    return `(${scoreParts.join(' + ')}) AS score`;
  }

  // 构建ORDER BY
  private buildOrderBy(sortConfig: SortConfig): string {
    const { field, direction, nulls } = sortConfig;
    let sql = `ORDER BY ${field} ${direction}`;
    if (nulls) sql += ` NULLS ${nulls}`;
    return sql;
  }

  // 构建LIMIT
  private buildLimit(pagination: PaginationConfig): string {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;
    return `LIMIT ${pageSize} OFFSET ${offset}`;
  }
}
```

### 3.4 查询优化器

```typescript
class QueryOptimizer {
  // 优化筛选条件
  optimize(filters: ParsedFilter[]): OptimizedFilter[] {
    let optimized = [...filters];

    // 1. 合并同类条件
    optimized = this.mergeSimilarFilters(optimized);

    // 2. 重新排序（选择性高的条件放前面）
    optimized = this.reorderBySelectivity(optimized);

    // 3. 添加索引提示
    optimized = this.addIndexHints(optimized);

    return optimized;
  }

  // 合并相似策略（批量选股时）
  mergeStrategies(strategies: StockPickerStrategy[]): MergedStrategy[] {
    // 按日期和股票池分组
    const groups = groupBy(strategies, s => 
      `${s.stockPool?.tradeDate}_${s.stockPool?.market}`
    );

    return Object.values(groups).map(group => ({
      baseQuery: this.extractCommonFilters(group),
      subStrategies: group.map(s => ({
        id: s.id,
        specificFilters: this.getSpecificFilters(s, group)
      }))
    }));
  }

  // 合并同类条件
  private mergeSimilarFilters(filters: ParsedFilter[]): ParsedFilter[] {
    const grouped = groupBy(filters, f => f.field);

    return Object.values(grouped).map(group => {
      if (group.length === 1) return group[0];

      // 合并范围条件
      if (group.every(f => ['gt', 'gte'].includes(f.operator))) {
        return { ...group[0], value: Math.max(...group.map(f => f.value)) };
      }

      if (group.every(f => ['lt', 'lte'].includes(f.operator))) {
        return { ...group[0], value: Math.min(...group.map(f => f.value)) };
      }

      return group[0];
    });
  }

  // 按选择性排序
  private reorderBySelectivity(filters: ParsedFilter[]): ParsedFilter[] {
    const selectivityMap: Record<string, number> = {
      'ts_code': 0.01,
      'industry': 0.1,
      'market': 0.2,
      'close_price': 0.5,
      'pe_ttm': 0.6,
      'vol_ratio': 0.7
    };

    return filters.sort((a, b) => {
      const selA = selectivityMap[a.field] || 0.5;
      const selB = selectivityMap[b.field] || 0.5;
      return selA - selB;
    });
  }
}
```

---

## 四、计算性能优化方案

### 4.1 数据库优化

```sql
-- 核心索引设计
-- analysis_technical 表索引
CREATE INDEX idx_analysis_tech_date ON analysis_technical(trade_date);
CREATE INDEX idx_analysis_tech_code_date ON analysis_technical(ts_code, trade_date);
CREATE INDEX idx_analysis_tech_flags ON analysis_technical(is_vol_breakout, is_trend_up, is_new_high);
CREATE INDEX idx_analysis_tech_limit ON analysis_technical(high_type, limit_count);

-- daily_basic 表索引
CREATE INDEX idx_daily_basic_date ON daily_basic(trade_date);
CREATE INDEX idx_daily_basic_code_date ON daily_basic(ts_code, trade_date);
CREATE INDEX idx_daily_basic_valuation ON daily_basic(pe_ttm, pb, ps);

-- stk_factor 表索引
CREATE INDEX idx_stk_factor_code_date ON stk_factor(ts_code, trade_date);
CREATE INDEX idx_stk_factor_macd ON stk_factor(macd_signal);
CREATE INDEX idx_stk_factor_kdj ON stk_factor(kdj_status);

-- moneyflow 表索引
CREATE INDEX idx_moneyflow_code_date ON moneyflow(ts_code, trade_date);
CREATE INDEX idx_moneyflow_net ON moneyflow(net_mf_amount);

-- 复合索引（常用组合）
CREATE INDEX idx_analysis_composite ON analysis_technical(
  trade_date, is_trend_up, is_vol_breakout, high_type
);
```

### 4.2 缓存策略

```typescript
// 多级缓存设计
interface CacheConfig {
  // L1: 内存缓存（热点数据）
  memory: {
    enabled: boolean;
    maxSize: number;        // 最大条目数
    ttl: number;            // 过期时间（秒）
  };

  // L2: Redis缓存
  redis: {
    enabled: boolean;
    ttl: number;
    prefix: string;
  };

  // L3: 数据库查询缓存
  queryCache: {
    enabled: boolean;
    tableName: string;
    ttl: number;
  };
}

// 缓存管理器实现
class CacheManager {
  private memoryCache: LRUCache<string, any>;
  private redis: Redis;

  async get(key: string): Promise<any> {
    // L1: 内存缓存
    const memResult = this.memoryCache.get(key);
    if (memResult) return memResult;

    // L2: Redis缓存
    const redisResult = await this.redis.get(key);
    if (redisResult) {
      this.memoryCache.set(key, redisResult);
      return redisResult;
    }

    return null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    // 更新L1缓存
    this.memoryCache.set(key, value, ttl);

    // 更新L2缓存
    await this.redis.setex(key, ttl || 300, JSON.stringify(value));
  }

  // 预热缓存（每日收盘后）
  async warmup(tradeDate: string): Promise<void> {
    const commonQueries = [
      { name: 'trend_up', sql: 'SELECT * FROM analysis_technical WHERE trade_date = ? AND is_trend_up = 1' },
      { name: 'limit_up', sql: 'SELECT * FROM analysis_technical WHERE trade_date = ? AND high_type = "limit_up"' },
      { name: 'vol_breakout', sql: 'SELECT * FROM analysis_technical WHERE trade_date = ? AND is_vol_breakout = 1' }
    ];

    for (const query of commonQueries) {
      const results = await this.db.query(query.sql, [tradeDate]);
      await this.set(`warmup:${tradeDate}:${query.name}`, results, 86400);
    }
  }
}
```

### 4.3 预计算策略

```typescript
// 预计算服务
class PrecomputeService {
  // 每日收盘后预计算常用指标
  async dailyPrecompute(tradeDate: string): Promise<void> {
    // 1. 计算技术信号
    await this.computeTechnicalSignals(tradeDate);

    // 2. 计算综合评分
    await this.computeCompositeScore(tradeDate);

    // 3. 生成选股池
    await this.generateStockPools(tradeDate);

    // 4. 更新统计指标
    await this.updateStatistics(tradeDate);
  }

  // 计算技术信号
  private async computeTechnicalSignals(tradeDate: string): Promise<void> {
    const sql = `
      UPDATE analysis_technical a
      SET 
        is_macd_golden = CASE 
          WHEN c.macd > c.macd_signal AND c.macd_prev <= c.macd_signal_prev 
          THEN 1 ELSE 0 
        END,
        is_kdj_golden = CASE 
          WHEN c.kdj_k > c.kdj_d AND c.kdj_k_prev <= c.kdj_d_prev AND c.kdj_k < 30
          THEN 1 ELSE 0 
        END,
        is_rsi_oversold = CASE WHEN c.rsi < 30 THEN 1 ELSE 0 END,
        is_rsi_overbought = CASE WHEN c.rsi > 70 THEN 1 ELSE 0 END
      FROM stk_factor c
      WHERE a.ts_code = c.ts_code AND a.trade_date = c.trade_date
      AND a.trade_date = ?
    `;

    await this.db.execute(sql, [tradeDate]);
  }

  // 计算综合评分
  private async computeCompositeScore(tradeDate: string): Promise<void> {
    const sql = `
      UPDATE analysis_technical a
      SET composite_score = (
        -- 技术面评分 (40%)
        (CASE WHEN a.is_trend_up THEN 10 ELSE 0 END +
         CASE WHEN a.is_vol_breakout THEN 10 ELSE 0 END +
         CASE WHEN a.is_new_high THEN 10 ELSE 0 END +
         CASE WHEN c.macd > 0 THEN 10 ELSE 0 END) * 0.4 +

        -- 资金面评分 (30%)
        (CASE WHEN d.net_mf_amount > 0 THEN 15 ELSE 0 END +
         CASE WHEN d.net_mf_amount > 1000000 THEN 15 ELSE 0 END) * 0.3 +

        -- 基本面评分 (30%)
        (CASE WHEN b.pe_ttm < 20 THEN 10 ELSE 0 END +
         CASE WHEN b.pe_ttm < 30 THEN 5 ELSE 0 END +
         CASE WHEN e.roe > 15 THEN 15 ELSE 0 END) * 0.3
      )
      FROM daily_basic b
      LEFT JOIN stk_factor c ON a.ts_code = c.ts_code AND a.trade_date = c.trade_date
      LEFT JOIN moneyflow d ON a.ts_code = d.ts_code AND a.trade_date = d.trade_date
      LEFT JOIN fina_indicator e ON a.ts_code = e.ts_code
      WHERE a.trade_date = ?
    `;

    await this.db.execute(sql, [tradeDate]);
  }

  // 生成常用选股池
  private async generateStockPools(tradeDate: string): Promise<void> {
    const pools = [
      {
        name: '强势股',
        condition: 'is_trend_up = 1 AND is_vol_breakout = 1'
      },
      {
        name: '价值股',
        condition: 'pe_ttm < 20 AND pb < 3 AND roe > 15'
      },
      {
        name: '成长股',
        condition: 'revenue_yoy > 30 AND profit_yoy > 30'
      },
      {
        name: '资金流入',
        condition: 'net_mf_amount > 0 AND vol_ratio > 1.5'
      }
    ];

    for (const pool of pools) {
      await this.db.execute(`
        INSERT INTO stock_pool (trade_date, pool_name, ts_code, score)
        SELECT ?, ?, ts_code, composite_score
        FROM analysis_technical a
        LEFT JOIN daily_basic b ON a.ts_code = b.ts_code AND a.trade_date = b.trade_date
        LEFT JOIN moneyflow c ON a.ts_code = c.ts_code AND a.trade_date = c.trade_date
        WHERE a.trade_date = ? AND ${pool.condition}
      `, [tradeDate, pool.name, tradeDate]);
    }
  }
}
```

### 4.4 并发控制

```typescript
// 查询执行器
class QueryExecutor {
  private connectionPool: Pool;
  private semaphore: Semaphore;

  constructor(config: ExecutorConfig) {
    this.connectionPool = createPool(config.db);
    this.semaphore = new Semaphore(config.maxConcurrent);
  }

  async execute(sql: string, params?: any[]): Promise<any[]> {
    // 获取执行许可
    await this.semaphore.acquire();

    const connection = await this.connectionPool.getConnection();
    const startTime = Date.now();

    try {
      // 设置查询超时
      await connection.query('SET SESSION MAX_EXECUTION_TIME = 30000');

      const [rows] = await connection.execute(sql, params);

      // 记录查询性能
      this.logQueryPerformance(sql, Date.now() - startTime);

      return rows;
    } finally {
      connection.release();
      this.semaphore.release();
    }
  }

  // 并行执行多个查询
  async executeParallel(queries: { sql: string; params?: any[] }[]): Promise<any[][]> {
    return Promise.all(
      queries.map(q => this.execute(q.sql, q.params))
    );
  }
}
```

---

## 五、策略存储结构

### 5.1 数据库表设计

```sql
-- 选股策略表
CREATE TABLE picker_strategy (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category ENUM('technical', 'fundamental', 'moneyflow', 'pattern', 'composite', 'custom'),
  filter_logic ENUM('AND', 'OR') DEFAULT 'AND',
  stock_pool_config JSON,
  sort_config JSON,
  alert_config JSON,
  backtest_config JSON,
  is_active BOOLEAN DEFAULT TRUE,
  run_count INT DEFAULT 0,
  created_by VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 策略筛选条件表
CREATE TABLE picker_strategy_filter (
  id VARCHAR(64) PRIMARY KEY,
  strategy_id VARCHAR(64) NOT NULL,
  filter_type VARCHAR(50) NOT NULL,
  filter_name VARCHAR(100),
  field VARCHAR(100) NOT NULL,
  operator VARCHAR(20) NOT NULL,
  value JSON NOT NULL,
  weight DECIMAL(5,2),
  sort_order INT DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (strategy_id) REFERENCES picker_strategy(id) ON DELETE CASCADE,
  INDEX idx_strategy (strategy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 选股结果表
CREATE TABLE picker_result (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  strategy_id VARCHAR(64) NOT NULL,
  trade_date DATE NOT NULL,
  ts_code VARCHAR(20) NOT NULL,
  name VARCHAR(50),
  close_price DECIMAL(10,2),
  pct_chg DECIMAL(6,2),
  score DECIMAL(8,2),
  rank_num INT,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (strategy_id) REFERENCES picker_strategy(id),
  INDEX idx_strategy_date (strategy_id, trade_date),
  INDEX idx_tscode (ts_code),
  INDEX idx_score (score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 PARTITION BY RANGE (YEAR(trade_date));

-- 策略回测结果表
CREATE TABLE picker_backtest (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  strategy_id VARCHAR(64) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_return DECIMAL(10,4),
  annualized_return DECIMAL(10,4),
  max_drawdown DECIMAL(10,4),
  sharpe_ratio DECIMAL(10,4),
  win_rate DECIMAL(6,4),
  profit_loss_ratio DECIMAL(10,4),
  trade_count INT,
  benchmark_return DECIMAL(10,4),
  alpha DECIMAL(10,4),
  beta DECIMAL(10,4),
  result_detail JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (strategy_id) REFERENCES picker_strategy(id),
  INDEX idx_strategy (strategy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 预警规则表
CREATE TABLE picker_alert_rule (
  id VARCHAR(64) PRIMARY KEY,
  strategy_id VARCHAR(64) NOT NULL,
  name VARCHAR(100) NOT NULL,
  alert_type ENUM('price', 'volume', 'technical', 'composite') NOT NULL,
  condition_config JSON NOT NULL,
  notification_channels JSON,
  check_interval INT DEFAULT 60,
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP NULL,
  trigger_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (strategy_id) REFERENCES picker_strategy(id) ON DELETE CASCADE,
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 预警记录表
CREATE TABLE picker_alert_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  rule_id VARCHAR(64) NOT NULL,
  ts_code VARCHAR(20) NOT NULL,
  trade_date DATE NOT NULL,
  alert_data JSON,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rule (rule_id),
  INDEX idx_tscode_date (ts_code, trade_date),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户收藏策略表
CREATE TABLE user_favorite_strategy (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  strategy_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_strategy (user_id, strategy_id),
  FOREIGN KEY (strategy_id) REFERENCES picker_strategy(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 5.2 策略JSON存储格式

```typescript
// 完整策略JSON示例
const exampleStrategy = {
  id: "strategy_001",
  name: "强势突破选股",
  description: "选择处于上升趋势且突破新高的强势股",
  category: "composite",

  filters: [
    {
      id: "f1",
      type: "pattern",
      name: "趋势向上",
      field: "is_trend_up",
      operator: "eq",
      value: true,
      weight: 20,
      enabled: true
    },
    {
      id: "f2",
      type: "pattern",
      name: "突破新高",
      field: "is_new_high",
      operator: "eq",
      value: true,
      weight: 25,
      enabled: true
    },
    {
      id: "f3",
      type: "volume",
      name: "放量上涨",
      field: "vol_ratio",
      operator: "gt",
      value: 1.5,
      weight: 20,
      enabled: true
    },
    {
      id: "f4",
      type: "moneyflow",
      name: "资金流入",
      field: "net_mf_amount",
      operator: "gt",
      value: 0,
      weight: 15,
      enabled: true
    },
    {
      id: "f5",
      type: "technical",
      name: "MACD正值",
      field: "macd",
      operator: "gt",
      value: 0,
      weight: 10,
      enabled: true
    },
    {
      id: "f6",
      type: "fundamental",
      name: "合理估值",
      field: "pe_ttm",
      operator: "between",
      value: 5,
      value2: 50,
      weight: 10,
      enabled: true
    }
  ],

  filterLogic: "AND",

  stockPool: {
    markets: ["主板", "创业板", "科创板"],
    excludeST: true,
    minMarketCap: 1000000000,
    maxMarketCap: null,
    industries: [],
    listDateBefore: null
  },

  sortBy: {
    field: "score",
    direction: "DESC",
    nulls: "LAST"
  },

  pagination: {
    page: 1,
    pageSize: 50
  },

  backtest: {
    enabled: true,
    startDate: "2023-01-01",
    endDate: "2024-12-31",
    initialCapital: 1000000,
    positionSize: 0.1,
    maxPositions: 10,
    rebalanceFrequency: "daily",
    commission: 0.0003,
    slippage: 0.001
  },

  alert: {
    enabled: true,
    rules: [
      {
        type: "new_match",
        message: "发现新的符合条件的股票"
      },
      {
        type: "score_change",
        threshold: 10,
        message: "股票评分变化超过10分"
      }
    ],
    channels: ["app", "email"]
  },

  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  isActive: true,
  runCount: 156
};
```

---

## 六、结果展示方式

### 6.1 选股结果数据结构

```typescript
// 选股结果
interface PickResult {
  // 基本信息
  strategyId: string;
  strategyName: string;
  tradeDate: string;
  executedAt: Date;

  // 分页信息
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };

  // 股票列表
  stocks: PickedStock[];

  // 汇总统计
  summary: PickSummary;

  // 执行统计
  execution: {
    sql: string;
    executionTime: number;
    cacheHit: boolean;
  };
}

// 选中的股票
interface PickedStock {
  // 基础信息
  tsCode: string;
  name: string;
  industry: string;
  market: string;

  // 价格信息
  close: number;
  pctChg: number;
  amount: number;

  // 技术指标
  technical: {
    isTrendUp: boolean;
    isVolBreakout: boolean;
    isNewHigh: boolean;
    macd: number;
    kdjK: number;
    kdjD: number;
    rsi: number;
    ma5: number;
    ma10: number;
    ma20: number;
  };

  // 基本面
  fundamental: {
    pe: number;
    peTtm: number;
    pb: number;
    ps: number;
    roe: number;
    roa: number;
    grossMargin: number;
    netMargin: number;
    debtRatio: number;
  };

  // 资金面
  moneyflow: {
    netMfAmount: number;
    mainForceRatio: number;
    bigOrderRatio: number;
    turnoverRate: number;
  };

  // 评分
  score: number;
  scoreBreakdown: {
    technical: number;
    fundamental: number;
    moneyflow: number;
    pattern: number;
  };
  rank: number;

  // 匹配的条件
  matchedFilters: string[];

  // 图表数据
  chartData?: {
    prices: number[];
    volumes: number[];
    dates: string[];
  };
}

// 选股汇总
interface PickSummary {
  totalCount: number;
  avgPe: number;
  avgPb: number;
  avgRoe: number;
  avgScore: number;
  industryDistribution: Record<string, number>;
  marketDistribution: Record<string, number>;
  scoreDistribution: {
    range: string;
    count: number;
  }[];
}
```

### 6.2 前端展示组件

```typescript
// 选股结果展示组件
const StockPickerResult: React.FC<PickResultProps> = ({ result }) => {
  return (
    <div className="stock-picker-result">
      {/* 头部信息 */}
      <ResultHeader 
        strategyName={result.strategyName}
        tradeDate={result.tradeDate}
        total={result.pagination.total}
        executionTime={result.execution.executionTime}
      />

      {/* 统计概览 */}
      <SummaryCards summary={result.summary} />

      {/* 分布图表 */}
      <DistributionCharts 
        industryDistribution={result.summary.industryDistribution}
        scoreDistribution={result.summary.scoreDistribution}
      />

      {/* 股票列表 */}
      <StockTable 
        stocks={result.stocks}
        sortable={true}
        onSort={handleSort}
        onStockClick={handleStockClick}
      />

      {/* 分页 */}
      <Pagination 
        current={result.pagination.page}
        pageSize={result.pagination.pageSize}
        total={result.pagination.total}
        onChange={handlePageChange}
      />
    </div>
  );
};

// 股票详情卡片
const StockDetailCard: React.FC<{ stock: PickedStock }> = ({ stock }) => {
  return (
    <Card className="stock-detail-card">
      <div className="stock-header">
        <h3>{stock.name} <span>{stock.tsCode}</span></h3>
        <Tag color={stock.pctChg >= 0 ? 'red' : 'green'}>
          {stock.pctChg >= 0 ? '+' : ''}{stock.pctChg.toFixed(2)}%
        </Tag>
        <ScoreBadge score={stock.score} />
      </div>

      <Tabs>
        <TabPane tab="技术指标" key="technical">
          <TechnicalIndicators data={stock.technical} />
        </TabPane>
        <TabPane tab="基本面" key="fundamental">
          <FundamentalMetrics data={stock.fundamental} />
        </TabPane>
        <TabPane tab="资金面" key="moneyflow">
          <MoneyflowData data={stock.moneyflow} />
        </TabPane>
        <TabPane tab="评分详情" key="score">
          <ScoreBreakdown breakdown={stock.scoreBreakdown} />
        </TabPane>
        <TabPane tab="K线图" key="chart">
          <MiniKLine data={stock.chartData} />
        </TabPane>
      </Tabs>
    </Card>
  );
};
```

### 6.3 数据导出格式

```typescript
// 导出配置
interface ExportConfig {
  format: 'csv' | 'excel' | 'json' | 'pdf';
  filename?: string;
  fields?: string[];
  includeCharts?: boolean;
  includeSummary?: boolean;
}

// CSV导出示例
const csvExportExample = `
股票代码,股票名称,行业,收盘价,涨跌幅,PE_TTM,PB,ROE,综合评分
000001.SZ,平安银行,银行,12.50,2.35,5.20,0.65,12.50,85.5
000002.SZ,万科A,房地产,15.30,-1.20,8.50,0.80,15.20,78.0
600519.SH,贵州茅台,白酒,1680.00,1.50,28.50,8.50,25.30,92.5
`;

// Excel导出（多Sheet）
const excelExportStructure = {
  sheets: [
    {
      name: '选股结果',
      columns: ['股票代码', '股票名称', '行业', '收盘价', '涨跌幅', '评分'],
      data: []
    },
    {
      name: '技术指标',
      columns: ['股票代码', 'MACD', 'KDJ_K', 'KDJ_D', 'RSI', '趋势'],
      data: []
    },
    {
      name: '基本面',
      columns: ['股票代码', 'PE', 'PB', 'ROE', '毛利率', '负债率'],
      data: []
    },
    {
      name: '汇总统计',
      columns: ['指标', '数值'],
      data: []
    }
  ]
};
```

---

## 七、回测框架设计

### 7.1 回测引擎架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      回测引擎 (BacktestEngine)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  数据加载器   │  │  信号生成器   │  │  交易模拟器   │          │
│  │  (DataFeed)  │  │  (SignalGen) │  │  (Simulator) │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  组合管理器   │  │  绩效计算器   │  │  报告生成器   │          │
│  │  (Portfolio) │  │  (Metrics)   │  │  (Reporter)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 回测核心类

```typescript
// 回测引擎
class BacktestEngine {
  private dataFeed: DataFeed;
  private signalGenerator: SignalGenerator;
  private simulator: TradeSimulator;
  private portfolio: PortfolioManager;
  private metrics: PerformanceMetrics;
  private reporter: ReportGenerator;

  constructor(config: BacktestConfig) {
    this.dataFeed = new DataFeed(config.data);
    this.signalGenerator = new SignalGenerator();
    this.simulator = new TradeSimulator(config.trading);
    this.portfolio = new PortfolioManager(config.portfolio);
    this.metrics = new PerformanceMetrics();
    this.reporter = new ReportGenerator();
  }

  // 执行回测
  async run(strategy: StockPickerStrategy): Promise<BacktestResult> {
    const config = strategy.backtest;

    // 1. 加载历史数据
    const historicalData = await this.dataFeed.load(
      config.startDate,
      config.endDate
    );

    // 2. 按日期遍历
    const trades: Trade[] = [];
    const dailyValues: DailyValue[] = [];

    for (const date of this.getTradeDates(historicalData)) {
      const dayData = historicalData[date];

      // 2.1 生成选股信号
      const signals = await this.signalGenerator.generate(
        strategy,
        dayData,
        date
      );

      // 2.2 执行交易
      const dayTrades = await this.simulator.execute(
        signals,
        this.portfolio,
        date
      );
      trades.push(...dayTrades);

      // 2.3 更新组合
      this.portfolio.update(dayData, date);

      // 2.4 记录每日净值
      dailyValues.push({
        date,
        totalValue: this.portfolio.getTotalValue(),
        cash: this.portfolio.getCash(),
        positions: this.portfolio.getPositions()
      });
    }

    // 3. 计算绩效指标
    const performance = this.metrics.calculate(
      dailyValues,
      trades,
      config
    );

    // 4. 生成报告
    const report = this.reporter.generate({
      strategy,
      trades,
      dailyValues,
      performance
    });

    return {
      summary: performance,
      trades,
      dailyValues,
      report,
      charts: this.generateCharts(dailyValues, trades)
    };
  }
}

// 数据加载器
class DataFeed {
  async load(startDate: string, endDate: string): Promise<HistoricalData> {
    // 加载日线数据
    const dailyData = await this.loadDailyData(startDate, endDate);

    // 加载技术指标
    const technicalData = await this.loadTechnicalData(startDate, endDate);

    // 加载基本面数据
    const fundamentalData = await this.loadFundamentalData(startDate, endDate);

    // 加载资金流向
    const moneyflowData = await this.loadMoneyflowData(startDate, endDate);

    // 加载基准指数
    const benchmarkData = await this.loadBenchmarkData(startDate, endDate);

    return this.mergeData({
      daily: dailyData,
      technical: technicalData,
      fundamental: fundamentalData,
      moneyflow: moneyflowData,
      benchmark: benchmarkData
    });
  }
}

// 信号生成器
class SignalGenerator {
  async generate(
    strategy: StockPickerStrategy,
    dayData: DayData,
    date: string
  ): Promise<Signal[]> {
    // 应用筛选条件
    const filtered = this.applyFilters(strategy.filters, dayData);

    // 计算评分
    const scored = this.calculateScores(filtered, strategy);

    // 排序并选取TopN
    const selected = this.selectTopStocks(
      scored,
      strategy.backtest.maxPositions
    );

    // 生成交易信号
    return selected.map(stock => ({
      tsCode: stock.tsCode,
      action: 'BUY',
      price: stock.close,
      score: stock.score,
      date,
      reason: this.generateReason(stock, strategy)
    }));
  }
}

// 交易模拟器
class TradeSimulator {
  async execute(
    signals: Signal[],
    portfolio: PortfolioManager,
    date: string
  ): Promise<Trade[]> {
    const trades: Trade[] = [];

    for (const signal of signals) {
      // 检查是否已有持仓
      if (portfolio.hasPosition(signal.tsCode)) {
        continue;
      }

      // 检查是否达到最大持仓数
      if (portfolio.getPositionCount() >= this.config.maxPositions) {
        // 需要调仓：卖出评分最低的股票
        const weakestPosition = portfolio.getWeakestPosition();
        const sellTrade = await this.createSellTrade(
          weakestPosition,
          date,
          'rebalance'
        );
        trades.push(sellTrade);
        portfolio.removePosition(weakestPosition.tsCode);
      }

      // 创建买入交易
      const positionSize = this.calculatePositionSize(signal, portfolio);
      const buyTrade = await this.createBuyTrade(signal, positionSize, date);
      trades.push(buyTrade);
      portfolio.addPosition({
        tsCode: signal.tsCode,
        shares: buyTrade.shares,
        cost: buyTrade.price,
        date
      });
    }

    return trades;
  }

  private calculatePositionSize(signal: Signal, portfolio: PortfolioManager): number {
    const totalValue = portfolio.getTotalValue();
    const positionValue = totalValue * this.config.positionSize;
    return Math.floor(positionValue / signal.price / 100) * 100; // 100股为单位
  }
}
```

### 7.3 绩效指标计算

```typescript
// 绩效计算器
class PerformanceMetrics {
  calculate(
    dailyValues: DailyValue[],
    trades: Trade[],
    config: BacktestConfig
  ): PerformanceSummary {
    const returns = this.calculateReturns(dailyValues);

    return {
      // 收益指标
      totalReturn: this.calculateTotalReturn(dailyValues),
      annualizedReturn: this.calculateAnnualizedReturn(dailyValues),

      // 风险指标
      volatility: this.calculateVolatility(returns),
      maxDrawdown: this.calculateMaxDrawdown(dailyValues),
      maxDrawdownPeriod: this.calculateMaxDrawdownPeriod(dailyValues),

      // 风险调整收益
      sharpeRatio: this.calculateSharpeRatio(returns, config),
      sortinoRatio: this.calculateSortinoRatio(returns, config),
      calmarRatio: this.calculateCalmarRatio(dailyValues),

      // 交易统计
      totalTrades: trades.length,
      winRate: this.calculateWinRate(trades),
      profitFactor: this.calculateProfitFactor(trades),
      avgWin: this.calculateAvgWin(trades),
      avgLoss: this.calculateAvgLoss(trades),
      profitLossRatio: this.calculateProfitLossRatio(trades),

      // 相对收益
      benchmarkReturn: this.calculateBenchmarkReturn(dailyValues),
      alpha: this.calculateAlpha(dailyValues, config),
      beta: this.calculateBeta(dailyValues, config),
      informationRatio: this.calculateInformationRatio(dailyValues, config),

      // 其他指标
      turnoverRate: this.calculateTurnoverRate(trades, dailyValues),
      avgHoldingPeriod: this.calculateAvgHoldingPeriod(trades)
    };
  }

  // 计算最大回撤
  private calculateMaxDrawdown(dailyValues: DailyValue[]): number {
    let maxDrawdown = 0;
    let peak = dailyValues[0].totalValue;

    for (const day of dailyValues) {
      if (day.totalValue > peak) {
        peak = day.totalValue;
      }
      const drawdown = (peak - day.totalValue) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  // 计算夏普比率
  private calculateSharpeRatio(
    returns: number[],
    config: BacktestConfig
  ): number {
    const excessReturns = returns.map(r => r - config.riskFreeRate / 252);
    const avgExcessReturn = mean(excessReturns);
    const stdExcessReturn = std(excessReturns);

    return (avgExcessReturn / stdExcessReturn) * Math.sqrt(252);
  }

  // 计算Alpha和Beta
  private calculateAlphaBeta(
    dailyValues: DailyValue[],
    config: BacktestConfig
  ): { alpha: number; beta: number } {
    const strategyReturns = this.calculateReturns(dailyValues);
    const benchmarkReturns = this.calculateBenchmarkReturns(dailyValues);

    // 线性回归计算Beta
    const beta = this.calculateBeta(strategyReturns, benchmarkReturns);

    // 计算Alpha
    const avgStrategyReturn = mean(strategyReturns) * 252;
    const avgBenchmarkReturn = mean(benchmarkReturns) * 252;
    const alpha = avgStrategyReturn - config.riskFreeRate - 
                  beta * (avgBenchmarkReturn - config.riskFreeRate);

    return { alpha, beta };
  }
}
```

### 7.4 回测结果结构

```typescript
// 回测结果
interface BacktestResult {
  // 基本信息
  strategyId: string;
  strategyName: string;
  startDate: string;
  endDate: string;

  // 绩效汇总
  summary: PerformanceSummary;

  // 交易记录
  trades: Trade[];

  // 每日净值
  dailyValues: DailyValue[];

  // 持仓历史
  positionHistory: PositionHistory[];

  // 图表数据
  charts: BacktestCharts;

  // 详细报告
  report: BacktestReport;
}

// 绩效汇总
interface PerformanceSummary {
  // 收益指标
  totalReturn: number;           // 总收益率
  annualizedReturn: number;      // 年化收益率

  // 风险指标
  volatility: number;            // 波动率
  maxDrawdown: number;           // 最大回撤
  maxDrawdownPeriod: {           // 最大回撤期间
    start: string;
    end: string;
    duration: number;
  };

  // 风险调整收益
  sharpeRatio: number;           // 夏普比率
  sortinoRatio: number;          // 索提诺比率
  calmarRatio: number;           // 卡玛比率

  // 交易统计
  totalTrades: number;           // 总交易次数
  winRate: number;               // 胜率
  profitFactor: number;          // 盈亏比
  avgWin: number;                // 平均盈利
  avgLoss: number;               // 平均亏损
  profitLossRatio: number;       // 盈亏比

  // 相对收益
  benchmarkReturn: number;       // 基准收益
  alpha: number;                 // Alpha
  beta: number;                  // Beta
  informationRatio: number;      // 信息比率

  // 其他
  turnoverRate: number;          // 换手率
  avgHoldingPeriod: number;      // 平均持仓天数
}

// 回测图表数据
interface BacktestCharts {
  // 净值曲线
  equityCurve: {
    dates: string[];
    strategy: number[];
    benchmark: number[];
  };

  // 回撤曲线
  drawdownCurve: {
    dates: string[];
    drawdown: number[];
  };

  // 月度收益热力图
  monthlyReturns: {
    months: string[];
    returns: number[];
  }[];

  // 收益分布
  returnDistribution: {
    bins: string[];
    frequency: number[];
  };

  // 行业配置
  sectorAllocation: {
    sector: string;
    avgWeight: number;
  }[];
}
```

---

## 八、预警提醒功能

### 8.1 预警规则引擎

```typescript
// 预警规则
interface AlertRule {
  id: string;
  strategyId: string;
  name: string;
  type: AlertType;
  condition: AlertCondition;
  channels: NotificationChannel[];
  cooldown: number;              // 冷却时间（分钟）
  isActive: boolean;
  lastTriggered?: Date;
}

// 预警类型
enum AlertType {
  NEW_MATCH = 'new_match',       // 新匹配股票
  SCORE_CHANGE = 'score_change', // 评分变化
  PRICE_THRESHOLD = 'price_threshold', // 价格阈值
  TECHNICAL_SIGNAL = 'technical_signal', // 技术信号
  VOLUME_SPIKE = 'volume_spike', // 成交量异动
  RANK_CHANGE = 'rank_change'    // 排名变化
}

// 预警条件
interface AlertCondition {
  metric: string;                // 监控指标
  operator: 'gt' | 'lt' | 'eq' | 'change_pct';
  threshold: number;
  lookbackPeriod?: number;       // 回溯周期
}

// 预警引擎
class AlertEngine {
  private rules: Map<string, AlertRule>;
  private monitor: StockMonitor;
  private notifier: NotificationService;

  constructor() {
    this.rules = new Map();
    this.monitor = new StockMonitor();
    this.notifier = new NotificationService();
  }

  // 添加预警规则
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  // 检查预警
  async checkAlerts(stockData: StockData): Promise<Alert[]> {
    const triggered: Alert[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.isActive) continue;

      // 检查冷却时间
      if (rule.lastTriggered && 
          Date.now() - rule.lastTriggered.getTime() < rule.cooldown * 60000) {
        continue;
      }

      // 评估条件
      const isTriggered = await this.evaluateCondition(
        rule.condition,
        stockData
      );

      if (isTriggered) {
        triggered.push({
          ruleId: rule.id,
          ruleName: rule.name,
          type: rule.type,
          stockData,
          triggeredAt: new Date()
        });

        // 更新最后触发时间
        rule.lastTriggered = new Date();

        // 发送通知
        await this.sendNotification(rule, stockData);
      }
    }

    return triggered;
  }

  // 评估条件
  private async evaluateCondition(
    condition: AlertCondition,
    stockData: StockData
  ): Promise<boolean> {
    const currentValue = stockData[condition.metric];

    switch (condition.operator) {
      case 'gt':
        return currentValue > condition.threshold;
      case 'lt':
        return currentValue < condition.threshold;
      case 'eq':
        return currentValue === condition.threshold;
      case 'change_pct':
        const previousValue = await this.getPreviousValue(
          stockData.tsCode,
          condition.metric,
          condition.lookbackPeriod
        );
        const changePct = (currentValue - previousValue) / previousValue * 100;
        return Math.abs(changePct) > condition.threshold;
      default:
        return false;
    }
  }
}
```

### 8.2 通知服务

```typescript
// 通知服务
class NotificationService {
  private channels: Map<string, NotificationChannel>;

  constructor() {
    this.channels = new Map();
    this.registerDefaultChannels();
  }

  // 发送通知
  async send(
    rule: AlertRule,
    stockData: StockData
  ): Promise<void> {
    const message = this.buildMessage(rule, stockData);

    for (const channel of rule.channels) {
      const channelImpl = this.channels.get(channel.type);
      if (channelImpl) {
        await channelImpl.send({
          ...message,
          target: channel.target
        });
      }
    }
  }

  // 构建消息
  private buildMessage(rule: AlertRule, stockData: StockData): AlertMessage {
    return {
      title: `【${rule.name}】${stockData.name}(${stockData.tsCode})`,
      content: this.generateContent(rule, stockData),
      data: stockData,
      timestamp: new Date()
    };
  }

  // 生成内容
  private generateContent(rule: AlertRule, stockData: StockData): string {
    switch (rule.type) {
      case AlertType.NEW_MATCH:
        return `股票 ${stockData.name} 符合您的选股策略"${rule.name}"，当前评分：${stockData.score}`;
      case AlertType.SCORE_CHANGE:
        return `股票 ${stockData.name} 评分变化超过阈值，当前评分：${stockData.score}`;
      case AlertType.PRICE_THRESHOLD:
        return `股票 ${stockData.name} 价格${rule.condition.operator === 'gt' ? '突破' : '跌破'} ${rule.condition.threshold}元`;
      case AlertType.TECHNICAL_SIGNAL:
        return `股票 ${stockData.name} 出现${rule.name}技术信号`;
      default:
        return `股票 ${stockData.name} 触发预警：${rule.name}`;
    }
  }
}

// 推送通知渠道
class PushChannel implements NotificationChannel {
  async send(message: AlertMessage): Promise<void> {
    // 调用推送服务API
    await pushService.send({
      userId: message.target,
      title: message.title,
      body: message.content,
      data: message.data
    });
  }
}

// 邮件通知渠道
class EmailChannel implements NotificationChannel {
  async send(message: AlertMessage): Promise<void> {
    await emailService.send({
      to: message.target,
      subject: message.title,
      html: this.buildEmailTemplate(message)
    });
  }
}

// 短信通知渠道
class SMSChannel implements NotificationChannel {
  async send(message: AlertMessage): Promise<void> {
    await smsService.send({
      phone: message.target,
      content: message.content.substring(0, 70) // 短信长度限制
    });
  }
}

// WebSocket实时推送
class WebSocketChannel implements NotificationChannel {
  async send(message: AlertMessage): Promise<void> {
    wsServer.broadcast(message.target, {
      type: 'alert',
      data: message
    });
  }
}
```

---

## 九、API接口设计

### 9.1 选股接口

```typescript
// 执行选股
POST /api/picker/execute
Request: {
  strategyId?: string;           // 使用已有策略
  strategy?: StockPickerStrategy; // 或使用临时策略
  tradeDate?: string;            // 指定日期，默认最新
}
Response: PickResult

// 保存策略
POST /api/picker/strategy
Request: StockPickerStrategy
Response: { id: string }

// 获取策略列表
GET /api/picker/strategies
Query: {
  category?: StrategyCategory;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}
Response: {
  total: number;
  strategies: StockPickerStrategy[];
}

// 获取策略详情
GET /api/picker/strategy/:id
Response: StockPickerStrategy

// 更新策略
PUT /api/picker/strategy/:id
Request: Partial<StockPickerStrategy>
Response: StockPickerStrategy

// 删除策略
DELETE /api/picker/strategy/:id
Response: { success: boolean }

// 获取选股结果历史
GET /api/picker/results
Query: {
  strategyId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}
Response: {
  total: number;
  results: PickResult[];
}

// 导出选股结果
GET /api/picker/export/:resultId
Query: {
  format: 'csv' | 'excel' | 'json';
}
Response: File
```

### 9.2 回测接口

```typescript
// 执行回测
POST /api/picker/backtest
Request: {
  strategyId: string;
  startDate: string;
  endDate: string;
  initialCapital?: number;
  positionSize?: number;
  maxPositions?: number;
}
Response: BacktestResult

// 获取回测结果
GET /api/picker/backtest/:id
Response: BacktestResult

// 获取回测列表
GET /api/picker/backtests
Query: {
  strategyId?: string;
  page?: number;
  pageSize?: number;
}
Response: {
  total: number;
  backtests: BacktestSummary[];
}

// 对比多个回测
POST /api/picker/backtest/compare
Request: {
  backtestIds: string[];
}
Response: BacktestComparison
```

### 9.3 预警接口

```typescript
// 创建预警规则
POST /api/picker/alert
Request: AlertRule
Response: { id: string }

// 获取预警规则列表
GET /api/picker/alerts
Response: AlertRule[]

// 更新预警规则
PUT /api/picker/alert/:id
Request: Partial<AlertRule>
Response: AlertRule

// 删除预警规则
DELETE /api/picker/alert/:id
Response: { success: boolean }

// 获取预警记录
GET /api/picker/alert-logs
Query: {
  ruleId?: string;
  startDate?: string;
  endDate?: string;
  isRead?: boolean;
}
Response: AlertLog[]

// 标记已读
PUT /api/picker/alert-logs/:id/read
Response: { success: boolean }
```

---

## 十、总结

### 核心设计要点

1. **模块化设计**：筛选引擎、回测引擎、预警引擎独立设计，便于扩展和维护

2. **性能优化**：
   - 多级缓存策略（内存+Redis+查询缓存）
   - 预计算常用指标
   - 数据库索引优化
   - 并发查询控制

3. **灵活配置**：
   - 支持多维度组合筛选
   - 灵活的评分权重配置
   - 可自定义回测参数

4. **数据完整性**：
   - 完整的选股结果存储
   - 详细的回测记录
   - 预警日志追踪

### 技术栈建议

- **后端**：Node.js/Python + TypeScript
- **数据库**：PostgreSQL/MySQL + Redis
- **缓存**：Redis + LRU内存缓存
- **消息队列**：RabbitMQ/Redis Pub-Sub（用于预警）
- **定时任务**：node-cron/celery（用于预计算）

### 扩展性考虑

1. 支持自定义指标计算
2. 支持机器学习模型选股
3. 支持多因子模型
4. 支持实时流式选股

# 股票数据看板 - 市场概览模块设计文档

## 一、模块概述

市场概览模块是股票数据看板的首页核心模块，为投资者提供A股市场全景视图，包括大盘指数、涨跌分布、资金流向、市场情绪等关键指标。

### 1.1 设计目标
- 提供市场全景视图，帮助投资者快速把握市场大势
- 关键数据一目了然，支持快速决策
- 实时数据更新，确保信息时效性
- 响应式设计，支持多终端访问

### 1.2 数据来源
基于tushare提供的8张核心数据表：
- `daily` - A股日线行情
- `daily_basic` - 每日指标
- `index_dailybasic` - 大盘指数每日指标
- `limit_list_d` - 涨跌停列表
- `moneyflow_mkt_dc` - 大盘资金流向
- `moneyflow_hsgt` - 沪深港通资金流向
- `hsgt_top10` - 沪深股通十大成交股
- `kpl_list` - 开盘啦榜单数据

---

## 二、页面组件结构

### 2.1 整体布局

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           市场概览模块 (MarketOverview)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    大盘指数展示区 (IndexDisplay)                        │  │
│  │  [上证指数] [深证成指] [创业板指] [科创50] [北证50]                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │      涨跌分布 (UpDownStats)  │  │       市场成交额 (VolumeAnalysis)   │  │
│  │    涨跌家数柱状图/饼图       │  │    分时成交额曲线 + 量比指标         │  │
│  └─────────────────────────────┘  └─────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │    北向资金流向 (NorthFlow)  │  │      市场情绪 (MarketSentiment)     │  │
│  │    净流入曲线 + 累计柱状图   │  │    涨跌比 + 换手率 + 涨跌中位数      │  │
│  └─────────────────────────────┘  └─────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                  涨跌停统计 (LimitUpDownStats)                         │  │
│  │      涨停数 | 跌停数 | 炸板数 | 连板高度 | 涨停原因分布                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │   板块资金流向 (SectorFlow)  │  │     沪深股通Top10 (HSGTTop10)       │  │
│  │    行业资金净流入排行        │  │    北向资金买卖十大成交股           │  │
│  └─────────────────────────────┘  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 组件详细设计

#### 2.2.1 大盘指数展示区 (IndexDisplay)

```typescript
interface IndexDisplayProps {
  indices: IndexData[];
  loading: boolean;
  onRefresh: () => void;
}

interface IndexData {
  code: string;           // 指数代码 000001.SH
  name: string;           // 指数名称 上证指数
  current: number;        // 当前点数
  change: number;         // 涨跌点数
  pctChange: number;      // 涨跌幅%
  volume: number;         // 成交量(亿)
  amount: number;         // 成交额(亿)
  high: number;           // 最高
  low: number;            // 最低
  preClose: number;       // 昨收
  updateTime: string;     // 更新时间
}

// 子组件
- IndexCard: 单个指数卡片
  - 显示指数名称、当前点数、涨跌幅
  - 红涨绿跌颜色标识
  - 迷你分时图(sparkline)
  - 成交量/成交额显示
```

**展示指数列表：**
| 指数代码 | 指数名称 | 数据源 |
|---------|---------|--------|
| 000001.SH | 上证指数 | index_dailybasic |
| 399001.SZ | 深证成指 | index_dailybasic |
| 399006.SZ | 创业板指 | index_dailybasic |
| 000688.SH | 科创50 | index_dailybasic |
| 899050.BJ | 北证50 | index_dailybasic |

#### 2.2.2 涨跌分布 (UpDownStats)

```typescript
interface UpDownStatsProps {
  stats: {
    upCount: number;      // 上涨家数
    downCount: number;    // 下跌家数
    flatCount: number;    // 平盘家数
    limitUpCount: number; // 涨停家数
    limitDownCount: number; // 跌停家数
    distribution: {       // 涨跌区间分布
      range: string;      // 区间如 "+5%~+7%"
      count: number;      // 家数
    }[];
  };
}

// 子组件
- UpDownBarChart: 涨跌区间分布柱状图
- UpDownPieChart: 涨跌家数占比饼图
- StatCard: 统计卡片(上涨/下跌/涨停/跌停数量)
```

**涨跌区间划分：**
- 涨停 (>9.9%)
- +7% ~ +9.9%
- +5% ~ +7%
- +3% ~ +5%
- +1% ~ +3%
- -1% ~ +1% (平盘附近)
- -3% ~ -1%
- -5% ~ -3%
- -7% ~ -5%
- -9.9% ~ -7%
- 跌停 (<-9.9%)

#### 2.2.3 市场成交额 (VolumeAnalysis)

```typescript
interface VolumeAnalysisProps {
  data: {
    currentAmount: number;    // 当前成交额(亿)
    preAmount: number;        // 昨日成交额(亿)
    volumeRatio: number;      // 量比
    timeSeries: {             // 分时成交额
      time: string;
      amount: number;
      preAmount: number;
    }[];
    fiveDayAvg: number;       // 5日均额
    tenDayAvg: number;        // 10日均额
  };
}

// 子组件
- VolumeChart: 成交额分时对比图(今日vs昨日)
- VolumeRatioGauge: 量比仪表盘
- VolumeStats: 成交额统计卡片
```

#### 2.2.4 北向资金流向 (NorthFlow)

```typescript
interface NorthFlowProps {
  data: {
    netInflow: number;        // 当日净流入(亿)
    shInflow: number;         // 沪股通净流入
    szInflow: number;         // 深股通净流入
    cumulative: {             // 累计净流入
      date: string;
      amount: number;
    }[];
    timeSeries: {             // 分时流向
      time: string;
      amount: number;
    }[];
  };
}

// 子组件
- NetFlowCard: 净流入卡片(红入绿出)
- FlowTimeChart: 分时资金流向曲线
- CumulativeChart: 累计净流入柱状图
- SHSZFlow: 沪股通/深股通分别显示
```

#### 2.2.5 市场情绪 (MarketSentiment)

```typescript
interface MarketSentimentProps {
  data: {
    upDownRatio: number;      // 涨跌比
    avgChange: number;        // 平均涨跌幅
    medianChange: number;     // 涨跌幅中位数
    avgTurnover: number;      // 平均换手率
    limitUpSuccessRate: number; // 涨停成功率
    prevSentiment: string;    // 上一交易日情绪
    currentSentiment: string; // 当前情绪(乐观/中性/悲观)
  };
}

// 子组件
- SentimentGauge: 情绪指数仪表盘
- SentimentTrend: 情绪趋势指示器
- SentimentStats: 情绪相关统计数据
```

**情绪指数计算：**
- 综合涨跌比、涨跌停比、成交额变化、北向资金流向
- 输出: 极度恐慌(<20) / 恐慌(20-40) / 中性(40-60) / 乐观(60-80) / 极度乐观(>80)

#### 2.2.6 涨跌停统计 (LimitUpDownStats)

```typescript
interface LimitUpDownStatsProps {
  data: {
    limitUpCount: number;     // 涨停数
    limitDownCount: number;   // 跌停数
    brokenCount: number;      // 炸板数
    continuousBoard: {        // 连板高度
      height: number;         // 连板数
      stocks: string[];       // 股票列表
    };
    reasons: {                // 涨停原因分布
      reason: string;
      count: number;
    }[];
    limitUpList: LimitUpItem[]; // 涨停股票列表
  };
}

interface LimitUpItem {
  code: string;
  name: string;
  price: number;
  limitTime: string;        // 首次涨停时间
  limitAmount: number;      // 封单金额(万)
  turnoverRate: number;     // 换手率
  continuousDays: number;   // 连板天数
  tag: string;              // 标签(如"次新股")
  theme: string;            // 所属题材
}

// 子组件
- LimitStatsCard: 涨跌停数量卡片
- ContinuousBoard: 连板高度展示
- LimitReasonChart: 涨停原因饼图/词云
- LimitUpTable: 涨停股票列表
```

#### 2.2.7 板块资金流向 (SectorFlow)

```typescript
interface SectorFlowProps {
  data: {
    inflowSectors: SectorFlowItem[];   // 净流入板块
    outflowSectors: SectorFlowItem[];  // 净流出板块
  };
}

interface SectorFlowItem {
  sector: string;           // 板块名称
  netAmount: number;        // 净流入金额(亿)
  mainAmount: number;       // 主力净流入
  stockCount: number;       // 板块内上涨家数
  leadingStock: string;     // 领涨股
}

// 子组件
- SectorFlowList: 板块资金流向排行列表
- SectorFlowBar: 板块资金流向横向条形图
```

#### 2.2.8 沪深股通Top10 (HSGTTop10)

```typescript
interface HSGTTop10Props {
  data: {
    buyList: HSGTItem[];    // 买入Top10
    sellList: HSGTItem[];   // 卖出Top10
  };
}

interface HSGTItem {
  rank: number;             // 排名
  code: string;             // 股票代码
  name: string;             // 股票名称
  price: number;            // 收盘价
  change: number;           // 涨跌幅
  amount: number;           // 成交金额(亿)
  netAmount: number;        // 净买入金额(亿)
}

// 子组件
- HSGTTable: 沪深股通成交表格
- HSGTNetBar: 净买入/卖出条形图
```

---

## 三、数据流转设计

### 3.1 数据流架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        数据层 (Data Layer)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │   Tushare   │ │   iFinD     │ │  WebSocket  │ │   Redis    │ │
│  │    API      │ │    API      │ │  实时推送   │ │   缓存     │ │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────┬──────┘ │
└─────────┼───────────────┼───────────────┼──────────────┼────────┘
          │               │               │              │
          ▼               ▼               ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      服务层 (Service Layer)                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ DataFetcher  │ │DataProcessor │ │    RealtimePusher        │ │
│  │   数据获取   │ │   数据处理   │ │      实时推送            │ │
│  └──────┬───────┘ └──────┬───────┘ └───────────┬──────────────┘ │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      状态层 (State Layer)                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Zustand / Redux Store                        │  │
│  │  - marketData: 市场数据                                  │  │
│  │  - indexData: 指数数据                                   │  │
│  │  - sentimentData: 情绪数据                               │  │
│  │  - flowData: 资金流向数据                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      视图层 (View Layer)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │IndexCard │ │UpDown    │ │Volume    │ │NorthFlow │ │Sentiment│ │
│  │          │ │Chart     │ │Chart     │ │Chart     │ │Gauge   │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 数据获取策略

#### 3.2.1 指数数据获取

```typescript
// 指数数据获取流程
async function fetchIndexData(): Promise<IndexData[]> {
  const indexCodes = ['000001.SH', '399001.SZ', '399006.SZ', '000688.SH', '899050.BJ'];
  
  // 1. 尝试从Redis缓存获取
  const cached = await redis.get('index_data');
  if (cached && isFresh(cached.timestamp, 5)) {
    return cached.data;
  }
  
  // 2. 从数据库获取
  const data = await db.index_dailybasic.findMany({
    where: { 
      ts_code: { in: indexCodes },
      trade_date: getLatestTradeDate()
    }
  });
  
  // 3. 缓存到Redis
  await redis.setex('index_data', 60, JSON.stringify(data));
  
  return data;
}
```

#### 3.2.2 涨跌分布数据获取

```typescript
// 涨跌分布数据获取
async function fetchUpDownStats(): Promise<UpDownStats> {
  // 从daily表获取当日所有股票涨跌数据
  const stocks = await db.daily.findMany({
    where: { trade_date: getLatestTradeDate() },
    select: { ts_code: true, pct_chg: true }
  });
  
  // 统计涨跌分布
  const distribution = calculateDistribution(stocks);
  const stats = {
    upCount: stocks.filter(s => s.pct_chg > 0).length,
    downCount: stocks.filter(s => s.pct_chg < 0).length,
    flatCount: stocks.filter(s => s.pct_chg === 0).length,
    limitUpCount: stocks.filter(s => s.pct_chg >= 9.9).length,
    limitDownCount: stocks.filter(s => s.pct_chg <= -9.9).length,
    distribution
  };
  
  return stats;
}
```

#### 3.2.3 北向资金数据获取

```typescript
// 北向资金流向数据
async function fetchNorthFlow(): Promise<NorthFlowData> {
  // 从moneyflow_hsgt表获取
  const flowData = await db.moneyflow_hsgt.findFirst({
    where: { trade_date: getLatestTradeDate() },
    orderBy: { trade_date: 'desc' }
  });
  
  // 获取历史累计数据(近30日)
  const cumulative = await db.moneyflow_hsgt.findMany({
    where: { 
      trade_date: { gte: getDateBefore(30) }
    },
    orderBy: { trade_date: 'asc' },
    select: { trade_date: true, north_money: true }
  });
  
  return {
    netInflow: flowData.north_money,
    shInflow: flowData.hgt,
    szInflow: flowData.sgt,
    cumulative
  };
}
```

#### 3.2.4 涨跌停数据获取

```typescript
// 涨跌停数据获取
async function fetchLimitData(): Promise<LimitData> {
  // 从limit_list_d表获取涨跌停列表
  const limitList = await db.limit_list_d.findMany({
    where: { trade_date: getLatestTradeDate() },
    orderBy: { first_time: 'asc' }
  });
  
  // 从kpl_list获取更详细的涨停数据
  const kplData = await db.kpl_list.findMany({
    where: { trade_date: getLatestTradeDate() }
  });
  
  // 合并处理数据
  return processLimitData(limitList, kplData);
}
```

### 3.3 数据更新时序

| 数据类型 | 更新频率 | 数据源 | 缓存时间 |
|---------|---------|--------|---------|
| 指数数据 | 实时(3秒) | WebSocket + API | 5秒 |
| 涨跌分布 | 1分钟 | API | 30秒 |
| 成交额 | 实时(3秒) | WebSocket | 5秒 |
| 北向资金 | 实时(3秒) | WebSocket + API | 5秒 |
| 涨跌停 | 实时 | WebSocket + API | 10秒 |
| 情绪指标 | 5分钟 | 计算 | 1分钟 |
| 板块资金 | 5分钟 | API | 2分钟 |
| 沪深股通Top10 | 收盘后 | API | 1小时 |

---

## 四、推荐的图表库和组件

### 4.1 图表库选择

#### 推荐方案：Apache ECharts

**原因：**
- 功能强大，支持多种图表类型
- 性能优异，支持大数据量渲染
- 中文文档完善，社区活跃
- 支持响应式设计和移动端适配
- 支持实时数据更新

**备选方案：**
- **Lightweight Charts**: 轻量级金融图表，适合K线和分时图
- **AntV G2Plot**: 阿里出品，配置简单，适合统计图表
- **D3.js**: 灵活性高，但学习成本大

### 4.2 组件库选择

#### 推荐方案：Ant Design + Ant Design Charts

**原因：**
- 企业级UI组件库，稳定可靠
- 完善的表格、卡片、表单组件
- 支持主题定制
- 响应式布局支持

### 4.3 具体图表配置

#### 4.3.1 指数分时图 (Sparkline)

```typescript
// ECharts 配置
const indexSparklineOption = {
  grid: { top: 0, bottom: 0, left: 0, right: 0 },
  xAxis: { show: false, type: 'category' },
  yAxis: { show: false, type: 'value', scale: true },
  series: [{
    type: 'line',
    data: priceData,
    smooth: true,
    symbol: 'none',
    lineStyle: { width: 2 },
    areaStyle: {
      opacity: 0.2,
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: 'rgba(255, 0, 0, 0.3)' },
        { offset: 1, color: 'rgba(255, 0, 0, 0)' }
      ])
    }
  }]
};
```

#### 4.3.2 涨跌分布柱状图

```typescript
const upDownBarOption = {
  tooltip: { trigger: 'axis' },
  grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
  xAxis: { type: 'category', data: ranges },
  yAxis: { type: 'value', name: '家数' },
  series: [{
    type: 'bar',
    data: counts,
    itemStyle: {
      color: (params: any) => {
        // 根据涨跌设置颜色
        return params.dataIndex < 5 ? '#ff4d4f' : '#52c41a';
      }
    }
  }]
};
```

#### 4.3.3 北向资金流向图

```typescript
const northFlowOption = {
  tooltip: { trigger: 'axis' },
  legend: { data: ['沪股通', '深股通', '合计'] },
  xAxis: { type: 'category', data: times },
  yAxis: { type: 'value', name: '亿元' },
  series: [
    {
      name: '沪股通',
      type: 'line',
      data: shFlow,
      smooth: true
    },
    {
      name: '深股通',
      type: 'line',
      data: szFlow,
      smooth: true
    },
    {
      name: '合计',
      type: 'line',
      data: totalFlow,
      smooth: true,
      lineStyle: { width: 3 }
    }
  ]
};
```

#### 4.3.4 情绪指数仪表盘

```typescript
const sentimentGaugeOption = {
  series: [{
    type: 'gauge',
    startAngle: 180,
    endAngle: 0,
    min: 0,
    max: 100,
    splitNumber: 5,
    axisLine: {
      lineStyle: {
        width: 10,
        color: [
          [0.2, '#ff4d4f'],  // 极度恐慌
          [0.4, '#faad14'],  // 恐慌
          [0.6, '#52c41a'],  // 中性
          [0.8, '#1890ff'],  // 乐观
          [1, '#722ed1']     // 极度乐观
        ]
      }
    },
    pointer: { itemStyle: { color: 'auto' } },
    detail: {
      valueAnimation: true,
      formatter: '{value}',
      fontSize: 24
    },
    data: [{ value: sentimentScore, name: '情绪指数' }]
  }]
};
```

### 4.4 自定义组件

#### 4.4.1 指数卡片组件

```typescript
// IndexCard.tsx
interface IndexCardProps {
  data: IndexData;
  sparklineData: number[];
  onClick?: () => void;
}

const IndexCard: React.FC<IndexCardProps> = ({ data, sparklineData, onClick }) => {
  const isUp = data.pctChange >= 0;
  const color = isUp ? '#ff4d4f' : '#52c41a';
  
  return (
    <Card className="index-card" onClick={onClick} hoverable>
      <div className="index-header">
        <span className="index-name">{data.name}</span>
        <span className="update-time">{data.updateTime}</span>
      </div>
      <div className="index-value" style={{ color }}>
        {data.current.toFixed(2)}
      </div>
      <div className="index-change" style={{ color }}>
        {isUp ? '+' : ''}{data.change.toFixed(2)} 
        ({isUp ? '+' : ''}{data.pctChange.toFixed(2)}%)
      </div>
      <div className="index-sparkline">
        <Sparkline data={sparklineData} color={color} />
      </div>
      <div className="index-volume">
        成交: {(data.amount / 100000000).toFixed(0)}亿
      </div>
    </Card>
  );
};
```

#### 4.4.2 统计卡片组件

```typescript
// StatCard.tsx
interface StatCardProps {
  title: string;
  value: number;
  suffix?: string;
  trend?: 'up' | 'down' | 'flat';
  trendValue?: string;
  icon?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, value, suffix, trend, trendValue, icon 
}) => {
  const trendColor = {
    up: '#ff4d4f',
    down: '#52c41a',
    flat: '#8c8c8c'
  }[trend || 'flat'];
  
  return (
    <Card className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-title">{title}</div>
        <div className="stat-value" style={{ color: trendColor }}>
          {value}{suffix}
        </div>
        {trend && (
          <div className="stat-trend" style={{ color: trendColor }}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </div>
        )}
      </div>
    </Card>
  );
};
```

---

## 五、数据刷新机制

### 5.1 实时数据推送架构

```
┌─────────────────────────────────────────────────────────────┐
│                    实时数据推送架构                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐         WebSocket          ┌──────────┐ │
│   │  行情服务器   │◄──────────────────────────►│  客户端   │ │
│   │  (Tushare)   │                            │  (React) │ │
│   └──────┬───────┘                            └────┬─────┘ │
│          │                                         │       │
│          │ 数据推送                                 │       │
│          ▼                                         ▼       │
│   ┌──────────────┐                          ┌──────────┐  │
│   │  消息队列    │                          │ 状态管理 │  │
│   │  (Redis/   │                          │(Zustand) │  │
│   │   Kafka)   │                          └──────────┘  │
│   └──────────────┘                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 刷新策略

#### 5.2.1 交易时段刷新策略

| 时间段 | 刷新频率 | 数据类型 |
|-------|---------|---------|
| 09:15-09:25 (集合竞价) | 3秒 | 指数、涨跌停 |
| 09:30-11:30 (上午盘) | 3秒 | 全部实时数据 |
| 11:30-13:00 (午间休市) | 60秒 | 仅指数 |
| 13:00-14:57 (下午盘) | 3秒 | 全部实时数据 |
| 14:57-15:00 (收盘竞价) | 3秒 | 指数、涨跌停 |
| 15:00后 (收盘后) | 300秒 | 仅展示数据 |
| 非交易日 | 3600秒 | 展示历史数据 |

#### 5.2.2 WebSocket连接管理

```typescript
// useMarketWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { useMarketStore } from '@/store/marketStore';

export const useMarketWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout | null>(null);
  const { updateIndexData, updateUpDownStats, updateFlowData } = useMarketStore();
  
  const connect = useCallback(() => {
    const ws = new WebSocket('wss://api.example.com/market/ws');
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      // 订阅数据
      ws.send(JSON.stringify({
        action: 'subscribe',
        channels: ['index', 'updown', 'flow', 'limit']
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'index':
          updateIndexData(data.payload);
          break;
        case 'updown':
          updateUpDownStats(data.payload);
          break;
        case 'flow':
          updateFlowData(data.payload);
          break;
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // 重连
      reconnectRef.current = setTimeout(connect, 3000);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    wsRef.current = ws;
  }, [updateIndexData, updateUpDownStats, updateFlowData]);
  
  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);
  
  return wsRef.current;
};
```

#### 5.2.3 轮询降级方案

```typescript
// useMarketPolling.ts
import { useEffect, useRef } from 'react';
import { useMarketStore } from '@/store/marketStore';

export const useMarketPolling = (interval: number = 5000) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { fetchAllMarketData } = useMarketStore();
  
  useEffect(() => {
    // 立即执行一次
    fetchAllMarketData();
    
    // 定时轮询
    timerRef.current = setInterval(fetchAllMarketData, interval);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [fetchAllMarketData, interval]);
};
```

### 5.3 数据一致性保障

```typescript
// 数据版本控制
interface DataVersion {
  timestamp: number;
  sequence: number;
  checksum: string;
}

// 数据合并策略
function mergeMarketData(
  cachedData: MarketData,
  newData: MarketData
): MarketData {
  // 根据sequence判断数据新旧
  if (newData.version.sequence < cachedData.version.sequence) {
    return cachedData; // 丢弃旧数据
  }
  
  // 合并数据
  return {
    ...cachedData,
    ...newData,
    version: newData.version
  };
}
```

---

## 六、性能优化建议

### 6.1 前端性能优化

#### 6.1.1 虚拟列表

对于涨跌停列表等长列表数据，使用虚拟列表优化渲染性能：

```typescript
import { VirtualList } from 'react-virtual-list';

const LimitUpTable: React.FC<{ data: LimitUpItem[] }> = ({ data }) => {
  return (
    <VirtualList
      items={data}
      itemHeight={48}
      renderItem={(item) => (
        <LimitUpRow key={item.code} data={item} />
      )}
    />
  );
};
```

#### 6.1.2 图表性能优化

```typescript
// ECharts 性能优化配置
const chartOption = {
  // 使用appendData进行增量更新
  series: [{
    type: 'line',
    data: [],
    // 大数据量优化
    large: true,
    largeThreshold: 500,
    // 降采样
    sampling: 'lttb',
    // 关闭动画提升性能
    animation: false
  }]
};

// 增量更新数据
function appendData(chart: echarts.ECharts, newData: number[]) {
  chart.appendData({
    seriesIndex: 0,
    data: newData
  });
}
```

#### 6.1.3 组件懒加载

```typescript
import { lazy, Suspense } from 'react';

// 懒加载图表组件
const VolumeChart = lazy(() => import('./VolumeChart'));
const NorthFlowChart = lazy(() => import('./NorthFlowChart'));

const MarketOverview: React.FC = () => {
  return (
    <div className="market-overview">
      <IndexDisplay />
      <Suspense fallback={<Skeleton active />}>
        <VolumeChart />
      </Suspense>
      <Suspense fallback={<Skeleton active />}>
        <NorthFlowChart />
      </Suspense>
    </div>
  );
};
```

#### 6.1.4 状态优化

```typescript
// 使用Zustand进行细粒度状态管理
import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

interface MarketState {
  indexData: IndexData[];
  upDownStats: UpDownStats;
  volumeData: VolumeData;
  flowData: FlowData;
  // 单独更新方法
  updateIndexData: (data: IndexData[]) => void;
  updateUpDownStats: (data: UpDownStats) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  indexData: [],
  upDownStats: {} as UpDownStats,
  volumeData: {} as VolumeData,
  flowData: {} as FlowData,
  updateIndexData: (data) => set({ indexData: data }),
  updateUpDownStats: (data) => set({ upDownStats: data })
}));

// 组件中使用shallow比较
const IndexDisplay = () => {
  const indexData = useMarketStore(
    state => state.indexData,
    shallow
  );
  // ...
};
```

### 6.2 后端性能优化

#### 6.2.1 数据库优化

```sql
-- 索引优化
CREATE INDEX idx_daily_trade_date ON daily(trade_date);
CREATE INDEX idx_daily_ts_code ON daily(ts_code);
CREATE INDEX idx_daily_basic_trade_date ON daily_basic(trade_date);
CREATE INDEX idx_limit_list_trade_date ON limit_list_d(trade_date);
CREATE INDEX idx_moneyflow_trade_date ON moneyflow_hsgt(trade_date);

-- 复合索引
CREATE INDEX idx_daily_code_date ON daily(ts_code, trade_date);
```

#### 6.2.2 缓存策略

```typescript
// Redis缓存分层
interface CacheStrategy {
  // L1缓存 - 内存缓存(进程内)
  l1: { ttl: number }; // 5秒
  
  // L2缓存 - Redis缓存
  l2: { ttl: number }; // 30秒
  
  // L3缓存 - 数据库
  l3: { source: string };
}

const cacheStrategies: Record<string, CacheStrategy> = {
  indexData: { l1: { ttl: 5 }, l2: { ttl: 30 }, l3: { source: 'index_dailybasic' } },
  upDownStats: { l1: { ttl: 10 }, l2: { ttl: 60 }, l3: { source: 'daily' } },
  volumeData: { l1: { ttl: 5 }, l2: { ttl: 30 }, l3: { source: 'daily' } },
  flowData: { l1: { ttl: 5 }, l2: { ttl: 30 }, l3: { source: 'moneyflow_hsgt' } }
};
```

#### 6.2.3 数据预计算

```typescript
// 定时任务预计算统计数据
class MarketDataPrecomputer {
  // 每分钟预计算涨跌分布
  @Cron('*/1 * * * *')
  async precomputeUpDownStats() {
    const stats = await this.calculateUpDownStats();
    await redis.setex('precomputed:updown', 120, JSON.stringify(stats));
  }
  
  // 每5分钟预计算情绪指标
  @Cron('*/5 * * * *')
  async precomputeSentiment() {
    const sentiment = await this.calculateSentiment();
    await redis.setex('precomputed:sentiment', 600, JSON.stringify(sentiment));
  }
}
```

### 6.3 网络性能优化

#### 6.3.1 数据压缩

```typescript
// 启用gzip压缩
import compression from 'compression';
app.use(compression());

// 数据精简传输
function compressMarketData(data: MarketData): CompressedMarketData {
  return {
    // 使用短字段名
    i: data.indices.map(idx => ({
      c: idx.code,
      n: idx.name,
      p: idx.current,
      ch: idx.change,
      pct: idx.pctChange
    })),
    t: Date.now() // 时间戳
  };
}
```

#### 6.3.2 增量更新

```typescript
// 只传输变化的数据
interface DataDelta {
  sequence: number;
  updates: Partial<MarketData>;
  deleted: string[];
}

function calculateDelta(
  oldData: MarketData,
  newData: MarketData
): DataDelta {
  const updates: Partial<MarketData> = {};
  
  // 对比指数数据
  if (JSON.stringify(oldData.indices) !== JSON.stringify(newData.indices)) {
    updates.indices = newData.indices;
  }
  
  // 对比涨跌统计
  if (oldData.upDownStats.upCount !== newData.upDownStats.upCount) {
    updates.upDownStats = newData.upDownStats;
  }
  
  return {
    sequence: newData.version.sequence,
    updates,
    deleted: []
  };
}
```

### 6.4 关键性能指标(KPI)

| 指标 | 目标值 | 测量方法 |
|-----|-------|---------|
| 首屏加载时间 | < 2s | Lighthouse |
| 数据更新延迟 | < 500ms | 服务端埋点 |
| 图表渲染时间 | < 100ms | Performance API |
| 内存占用 | < 100MB | Chrome DevTools |
| 接口响应时间 | < 200ms | 服务端监控 |
| WebSocket重连时间 | < 3s | 客户端埋点 |
| 并发用户数 | > 10000 | 压测 |

---

## 七、响应式设计

### 7.1 断点设计

```scss
// 断点定义
$breakpoints: (
  'xs': 0,      // 手机竖屏
  'sm': 576px,  // 手机横屏
  'md': 768px,  // 平板
  'lg': 992px,  // 小桌面
  'xl': 1200px, // 大桌面
  'xxl': 1600px // 超大屏幕
);

// 响应式布局
.market-overview {
  display: grid;
  gap: 16px;
  
  // 移动端：单列
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
  
  // 平板：两列
  @media (min-width: 768px) and (max-width: 992px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  // 桌面：多列
  @media (min-width: 992px) {
    grid-template-columns: repeat(12, 1fr);
  }
}

// 指数卡片响应式
.index-display {
  display: grid;
  gap: 12px;
  
  @media (max-width: 576px) {
    grid-template-columns: 1fr;
  }
  
  @media (min-width: 576px) and (max-width: 992px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (min-width: 992px) {
    grid-template-columns: repeat(5, 1fr);
  }
}
```

### 7.2 移动端适配

```typescript
// 检测移动端
const isMobile = () => window.innerWidth < 768;

// 移动端简化展示
const MobileMarketOverview: React.FC = () => {
  return (
    <div className="mobile-market-overview">
      {/* 只展示核心指数 */}
      <IndexDisplay showCount={3} />
      
      {/* 涨跌分布简化 */}
      <UpDownStats simplified />
      
      {/* 北向资金 */}
      <NorthFlow simplified />
      
      {/* 涨跌停数量 */}
      <LimitUpDownStats showList={false} />
    </div>
  );
};
```

---

## 八、错误处理

### 8.1 错误边界

```typescript
// MarketErrorBoundary.tsx
class MarketErrorBoundary extends React.Component<
  { fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Market data error:', error, info);
    // 上报错误
    reportError(error, info);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

### 8.2 降级方案

```typescript
// 数据获取失败时显示缓存数据
const useMarketDataWithFallback = () => {
  const [data, setData] = useState<MarketData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    fetchMarketData()
      .then(setData)
      .catch(async (err) => {
        setError(err);
        // 尝试从localStorage获取缓存数据
        const cached = localStorage.getItem('market_data_cache');
        if (cached) {
          setData(JSON.parse(cached));
        }
      });
  }, []);
  
  return { data, error };
};
```

---

## 九、总结

### 9.1 模块组件清单

| 组件名称 | 类型 | 数据来源 | 刷新频率 |
|---------|-----|---------|---------|
| IndexDisplay | 展示 | index_dailybasic | 3秒 |
| UpDownStats | 图表 | daily | 1分钟 |
| VolumeAnalysis | 图表 | daily | 3秒 |
| NorthFlow | 图表 | moneyflow_hsgt | 3秒 |
| MarketSentiment | 仪表盘 | 计算 | 5分钟 |
| LimitUpDownStats | 表格+图表 | limit_list_d, kpl_list | 实时 |
| SectorFlow | 列表 | daily_basic | 5分钟 |
| HSGTTop10 | 表格 | hsgt_top10 | 收盘后 |

### 9.2 技术栈推荐

| 层级 | 技术选型 |
|-----|---------|
| 前端框架 | React 18 + TypeScript |
| 状态管理 | Zustand |
| UI组件库 | Ant Design 5.x |
| 图表库 | Apache ECharts |
| 后端框架 | Node.js + NestJS |
| 数据库 | PostgreSQL |
| 缓存 | Redis |
| 实时通信 | WebSocket + Socket.io |

### 9.3 文件结构

```
src/
├── components/
│   └── market/
│       ├── IndexDisplay/
│       │   ├── IndexCard.tsx
│       │   ├── IndexSparkline.tsx
│       │   └── index.tsx
│       ├── UpDownStats/
│       │   ├── UpDownBarChart.tsx
│       │   ├── UpDownPieChart.tsx
│       │   └── index.tsx
│       ├── VolumeAnalysis/
│       │   ├── VolumeChart.tsx
│       │   ├── VolumeRatioGauge.tsx
│       │   └── index.tsx
│       ├── NorthFlow/
│       │   ├── FlowTimeChart.tsx
│       │   ├── CumulativeChart.tsx
│       │   └── index.tsx
│       ├── MarketSentiment/
│       │   ├── SentimentGauge.tsx
│       │   └── index.tsx
│       ├── LimitUpDownStats/
│       │   ├── LimitStatsCard.tsx
│       │   ├── ContinuousBoard.tsx
│       │   ├── LimitUpTable.tsx
│       │   └── index.tsx
│       └── index.tsx
├── hooks/
│   ├── useMarketWebSocket.ts
│   ├── useMarketPolling.ts
│   └── useMarketData.ts
├── store/
│   └── marketStore.ts
├── services/
│   └── marketService.ts
└── types/
    └── market.ts
```

---

*文档版本：v1.0*
*创建日期：2025-01-20*
*作者：金融数据产品架构师*

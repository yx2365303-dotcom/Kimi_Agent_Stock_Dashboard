# 股票数据看板 - 整体技术架构设计

## 一、技术栈选型

### 1.1 前端技术栈

| 层级 | 技术选型 | 版本 | 选型理由 |
|------|----------|------|----------|
| **框架** | React 18 | ^18.2.0 | 组件化开发、生态丰富、性能优秀 |
| **语言** | TypeScript | ^5.0.0 | 类型安全、IDE支持好、可维护性强 |
| **状态管理** | Zustand | ^4.4.0 | 轻量、简洁、TypeScript友好 |
| **路由** | React Router v6 | ^6.20.0 | 官方推荐、支持嵌套路由 |
| **UI组件库** | Ant Design | ^5.12.0 | 企业级组件、金融场景成熟 |
| **图表库** | ECharts 5 + TradingView | ^5.4.0 | 专业金融图表、K线支持完善 |
| **样式方案** | TailwindCSS + CSS Modules | ^3.3.0 | 原子化CSS、 Scoped样式 |
| **构建工具** | Vite | ^5.0.0 | 极速HMR、Tree-shaking优化 |
| **HTTP客户端** | Axios | ^1.6.0 | 拦截器、请求取消、TypeScript支持 |
| **WebSocket** | Socket.io-client | ^4.7.0 | 自动重连、心跳机制 |
| **测试框架** | Vitest + React Testing Library | ^1.0.0 | 与Vite集成、现代测试方案 |

### 1.2 后端技术栈

| 层级 | 技术选型 | 版本 | 选型理由 |
|------|----------|------|----------|
| **主要语言** | Python | 3.11+ | 数据科学生态、量化分析库丰富 |
| **Web框架** | FastAPI | ^0.104.0 | 异步高性能、自动API文档、类型提示 |
| **异步任务** | Celery + Redis | ^5.3.0 | 分布式任务队列、定时任务支持 |
| **缓存** | Redis | 7.x | 高性能缓存、Pub/Sub、数据结构丰富 |
| **消息队列** | RabbitMQ / Kafka | 3.12 / 3.6 | 可靠消息传递、高吞吐量 |
| **WS服务器** | Socket.io / WebSocket | ^4.7.0 | 实时数据推送、自动降级 |
| **数据科学** | Pandas, NumPy, TA-Lib | 最新版 | 金融数据分析标准库 |
| **AI/ML** | PyTorch / TensorFlow | 2.x | 深度学习框架、NLP/预测模型 |

### 1.3 数据库选型

| 类型 | 技术选型 | 用途 | 选型理由 |
|------|----------|------|----------|
| **时序数据库** | TimescaleDB / ClickHouse | K线、Tick数据 | 时序数据压缩率高、查询性能优秀 |
| **关系数据库** | PostgreSQL | 用户、配置、元数据 | ACID保证、JSON支持、扩展性强 |
| **缓存数据库** | Redis Cluster | 热点数据、会话 | 亚毫秒响应、集群支持 |
| **搜索引擎** | Elasticsearch | 全文检索、日志 | 分词搜索、聚合分析 |
| **文档数据库** | MongoDB (可选) | 研报、资讯 | 灵活Schema、大文本存储 |

### 1.4 基础设施

| 类别 | 技术选型 | 用途 |
|------|----------|------|
| **容器化** | Docker + Docker Compose | 开发环境、服务打包 |
| **编排** | Kubernetes | 生产环境容器编排 |
| **网关** | Kong / Nginx | API网关、负载均衡 |
| **CI/CD** | GitHub Actions / GitLab CI | 自动化构建部署 |
| **监控** | Prometheus + Grafana | 指标监控、告警 |
| **日志** | ELK Stack (Elasticsearch + Logstash + Kibana) | 日志收集分析 |
| **链路追踪** | Jaeger / Zipkin | 分布式追踪 |

---

## 二、系统架构设计

### 2.1 整体架构图（分层架构）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              客户端层 (Client Layer)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Web端     │  │   移动端    │  │  小程序端   │  │    第三方接入       │ │
│  │  (React)    │  │(React Native)│  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           接入层 (Gateway Layer)                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │  Nginx (负载均衡) → Kong (API网关) → WAF (安全防护)                      ││
│  │  - 限流熔断  - 认证鉴权  - 请求路由  - SSL终结                           ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         应用服务层 (Application Layer)                        │
│                                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌─────────────────┐ │
│  │  用户服务     │ │  行情服务     │ │  选股服务     │ │   AI分析服务    │ │
│  │  User Svc     │ │  Market Svc   │ │  Screener Svc │ │   AI Svc        │ │
│  │  - 注册登录   │ │  - 实时行情   │ │  - 条件选股   │ │  - 智能诊断     │ │
│  │  - 权限管理   │ │  - K线数据    │ │  - 策略回测   │ │  - 情绪分析     │ │
│  │  - 个人中心   │ │  - 板块数据   │ │  - 预警通知   │ │  - 研报解读     │ │
│  └───────────────┘ └───────────────┘ └───────────────┘ └─────────────────┘ │
│                                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌─────────────────┐ │
│  │  资讯服务     │ │  通知服务     │ │  计算服务     │ │   数据同步服务  │ │
│  │  News Svc     │ │  Notify Svc   │ │  Compute Svc  │ │   Sync Svc      │ │
│  │  - 快讯推送   │ │  - 站内消息   │ │  - 指标计算   │ │  - 数据采集     │ │
│  │  - 公告研报   │ │  - 邮件通知   │ │  - 技术分析   │ │  - 数据清洗     │ │
│  │  - 搜索索引   │ │  - 推送服务   │ │  - 量化模型   │ │  - 数据入库     │ │
│  └───────────────┘ └───────────────┘ └───────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          数据服务层 (Data Service Layer)                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    FastAPI 统一数据服务层                                ││
│  │  - 统一数据访问接口  - 数据权限控制  - 缓存策略  - 查询优化              ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          数据存储层 (Data Storage Layer)                      │
│                                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌─────────────────┐ │
│  │  TimescaleDB  │ │  PostgreSQL   │ │  Redis Cluster│ │  Elasticsearch  │ │
│  │  (时序数据)   │ │  (关系数据)   │ │  (缓存)       │ │  (搜索引擎)     │ │
│  │  - K线数据    │ │  - 用户信息   │ │  - 热点缓存   │ │  - 全文检索     │ │
│  │  - Tick数据   │ │  - 股票元数据 │ │  - 会话存储   │ │  - 日志分析     │ │
│  │  - 分钟线     │ │  - 系统配置   │ │  - 排行榜     │ │  - 聚合分析     │ │
│  └───────────────┘ └───────────────┘ └───────────────┘ └─────────────────┘ │
│                                                                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐                      │
│  │  MinIO/OSS    │ │  RabbitMQ     │ │  ClickHouse   │                      │
│  │  (对象存储)   │ │  (消息队列)   │ │  (OLAP分析)   │                      │
│  │  - K线图片    │ │  - 任务队列   │ │  - 大数据分析 │                      │
│  │  - 用户头像   │ │  - 事件总线   │ │  - 报表统计   │                      │
│  └───────────────┘ └───────────────┘ └───────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          外部数据源层 (External Data Layer)                   │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌─────────────────┐ │
│  │  交易所数据   │ │  财经数据商   │ │  新闻数据源   │ │   AI模型服务    │ │
│  │  - 深交所     │ │  - 同花顺     │ │  - 财联社     │ │  - OpenAI API   │ │
│  │  - 上交所     │ │  - 东方财富   │ │  - 华尔街见闻 │ │  - 自研模型     │ │
│  │  - 北交所     │ │  - Wind       │ │  - 公司公告   │ │  - 第三方AI     │ │
│  └───────────────┘ └───────────────┘ └───────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 微服务划分

```
┌─────────────────────────────────────────────────────────────────┐
│                        微服务架构                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │  API Gateway│◄───│   注册中心   │    │  配置中心   │         │
│  │   (Kong)    │    │  (Consul)   │    │ (Apollo)   │         │
│  └──────┬──────┘    └─────────────┘    └─────────────┘         │
│         │                                                       │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    服务网格 (Service Mesh)               │   │
│  │              (Istio / Linkerd - 可选)                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                                                       │
│    ┌────┴────┬────────┬────────┬────────┬────────┬────────┐   │
│    ▼         ▼        ▼        ▼        ▼        ▼        ▼   │
│ ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌────┐│
│ │用户 │  │行情 │  │选股 │  │AI  │  │资讯 │  │通知 │  │计算││
│ │服务 │  │服务 │  │服务 │  │服务│  │服务 │  │服务 │  │服务││
│ │:8001│  │:8002│  │:8003│  │:8004│  │:8005│  │:8006│  │:8007││
│ └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘  └──┬──┘  └──┬─┘│
│    │        │        │        │        │        │        │   │
│    └────────┴────────┴────────┴────────┴────────┴────────┘   │
│                         │                                      │
│                    ┌────┴────┐                                 │
│                    │ 消息总线 │                                 │
│                    │(RabbitMQ│                                 │
│                    │/Kafka)  │                                 │
│                    └─────────┘                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、API设计规范

### 3.1 RESTful API设计原则

```yaml
# API设计规范

# 1. URL设计
# - 使用名词复数形式
# - 使用小写字母和连字符
# - 层级关系用斜杠表示

# 2. HTTP方法语义
GET    /api/v1/stocks              # 获取股票列表
GET    /api/v1/stocks/{code}        # 获取单个股票详情
POST   /api/v1/stocks               # 创建股票（管理员）
PUT    /api/v1/stocks/{code}        # 更新股票信息
DELETE /api/v1/stocks/{code}        # 删除股票（管理员）

# 3. 版本控制
/api/v1/...    # 当前稳定版本
/api/v2/...    # 新版本（向后不兼容时）

# 4. 响应格式标准
{
  "code": 200,           # HTTP状态码
  "success": true,       # 业务成功标识
  "message": "success",  # 提示信息
  "data": { ... },       # 业务数据
  "timestamp": 1703001600,  # 服务器时间戳
  "request_id": "uuid"   # 请求追踪ID
}

# 5. 错误响应格式
{
  "code": 400,
  "success": false,
  "message": "参数错误",
  "errors": [
    {
      "field": "stock_code",
      "message": "股票代码格式不正确"
    }
  ],
  "timestamp": 1703001600,
  "request_id": "uuid"
}
```

### 3.2 核心API列表

#### 市场数据 API

```yaml
# 大盘指数
GET /api/v1/market/indices
Response: {
  "data": [
    {
      "code": "000001.SH",
      "name": "上证指数",
      "price": 2950.50,
      "change": 15.30,
      "change_pct": 0.52,
      "volume": 285000000,
      "amount": 32500000000,
      "update_time": "2024-01-15 14:30:00"
    }
  ]
}

# 涨跌分布
GET /api/v1/market/stats/distribution
Response: {
  "data": {
    "up_count": 2850,
    "down_count": 1850,
    "flat_count": 300,
    "limit_up": 45,
    "limit_down": 8,
    "distribution": [
      {"range": "-10%~-7%", "count": 25},
      {"range": "-7%~-5%", "count": 120}
    ]
  }
}

# 资金流向
GET /api/v1/market/capital/flow
Query: { "type": "all|north|main", "period": "1d|5d|10d" }
Response: {
  "data": {
    "main_inflow": 1250000000,
    "main_outflow": -980000000,
    "net_inflow": 270000000,
    "details": [...]
  }
}
```

#### 股票详情 API

```yaml
# 股票基本信息
GET /api/v1/stocks/{code}/profile
Response: {
  "data": {
    "code": "000001.SZ",
    "name": "平安银行",
    "market": "SZ",
    "industry": "银行",
    "concept": ["金融科技", "区块链"],
    "total_cap": 250000000000,
    "float_cap": 180000000000,
    "pe_ttm": 4.5,
    "pb": 0.65,
    "roe": 12.5
  }
}

# K线数据
GET /api/v1/stocks/{code}/kline
Query: { 
  "period": "1min|5min|15min|30min|60min|day|week|month",
  "start_date": "2024-01-01",
  "end_date": "2024-01-15",
  "limit": 500
}
Response: {
  "data": [
    {
      "timestamp": 1705276800,
      "open": 10.50,
      "high": 10.80,
      "low": 10.40,
      "close": 10.75,
      "volume": 1250000,
      "amount": 13437500
    }
  ]
}

# 分时数据
GET /api/v1/stocks/{code}/intraday
Query: { "date": "2024-01-15" }
Response: {
  "data": {
    "pre_close": 10.50,
    "ticks": [
      {
        "time": "09:30:00",
        "price": 10.55,
        "volume": 52000,
        "avg_price": 10.52
      }
    ]
  }
}

# 技术指标
GET /api/v1/stocks/{code}/indicators
Query: { "indicators": "MA,MACD,KDJ,RSI,BOLL" }
Response: {
  "data": {
    "MA": { "MA5": 10.55, "MA10": 10.45, "MA20": 10.30 },
    "MACD": { "DIF": 0.15, "DEA": 0.12, "MACD": 0.06 },
    "KDJ": { "K": 65.5, "D": 58.2, "J": 80.1 }
  }
}
```

#### 板块热点 API

```yaml
# 行业板块
GET /api/v1/sectors/industry
Query: { "sort_by": "change_pct|amount", "limit": 50 }
Response: {
  "data": [
    {
      "code": "BK0475",
      "name": "银行",
      "change_pct": 2.35,
      "leading_stocks": ["000001.SZ", "600036.SH"]
    }
  ]
}

# 概念板块
GET /api/v1/sectors/concept
Response: { ... }

# 开盘啦题材
GET /api/v1/sectors/themes/kpl
Response: {
  "data": [
    {
      "theme_id": "T001",
      "theme_name": "人工智能",
      "heat_score": 95,
      "related_stocks": ["000938.SZ", "600756.SH"],
      "news_summary": "..."
    }
  ]
}
```

#### 选股系统 API

```yaml
# 条件选股
POST /api/v1/screener/scan
Body: {
  "conditions": [
    { "field": "change_pct", "operator": ">", "value": 5 },
    { "field": "volume_ratio", "operator": ">", "value": 2 },
    { "field": "MA5", "operator": ">", "value": "MA10" }
  ],
  "sort": { "field": "change_pct", "order": "desc" },
  "limit": 100
}
Response: {
  "data": {
    "total": 45,
    "stocks": [
      { "code": "000001.SZ", "name": "...", "match_score": 95 }
    ]
  }
}

# 策略回测
POST /api/v1/screener/backtest
Body: {
  "strategy_id": "STR_001",
  "start_date": "2023-01-01",
  "end_date": "2023-12-31",
  "initial_capital": 1000000
}
Response: {
  "data": {
    "total_return": 35.5,
    "annual_return": 35.5,
    "max_drawdown": -15.2,
    "sharpe_ratio": 1.85,
    "trades": [...]
  }
}
```

#### AI分析 API

```yaml
# 智能诊断
GET /api/v1/ai/diagnosis/{code}
Response: {
  "data": {
    "overall_score": 78,
    "technical_analysis": "...",
    "fundamental_analysis": "...",
    "risk_assessment": "...",
    "suggestions": ["..."]
  }
}

# 情绪分析
GET /api/v1/ai/sentiment/{code}
Response: {
  "data": {
    "sentiment_score": 0.65,
    "sentiment_label": "乐观",
    "news_sentiment": 0.70,
    "social_sentiment": 0.60,
    "key_topics": ["业绩预增", "行业利好"]
  }
}

# 研报解读
POST /api/v1/ai/research/interpret
Body: { "report_url": "..." }
Response: {
  "data": {
    "summary": "...",
    "key_points": ["..."],
    "rating": "买入",
    "target_price": 15.50
  }
}
```

#### 资讯中心 API

```yaml
# 快讯列表
GET /api/v1/news/flash
Query: { "category": "全部|宏观|行业|公司", "limit": 20 }
Response: {
  "data": [
    {
      "id": "N001",
      "title": "...",
      "content": "...",
      "publish_time": "2024-01-15 14:30:00",
      "importance": 3,
      "related_stocks": ["000001.SZ"]
    }
  ]
}

# 公司公告
GET /api/v1/news/announcements/{code}
Query: { "type": "定期报告|重大事项|股权激励", "limit": 20 }
Response: { ... }

# 研报列表
GET /api/v1/news/research
Query: { "industry": "银行", "rating": "买入", "limit": 20 }
Response: { ... }
```

### 3.3 WebSocket实时推送

```yaml
# WebSocket连接
wss://api.example.com/ws

# 认证方式
# 1. 连接时通过Query参数传递token
wss://api.example.com/ws?token=xxx

# 2. 或在连接后发送认证消息
{ "type": "auth", "token": "xxx" }

# 订阅消息格式
# 订阅大盘指数
{ "action": "subscribe", "channel": "market.indices" }

# 订阅个股行情
{ "action": "subscribe", "channel": "stock.quote", "code": "000001.SZ" }

# 订阅板块排行
{ "action": "subscribe", "channel": "sector.ranking", "type": "industry" }

# 推送消息格式
{
  "type": "market.indices",
  "timestamp": 1703001600,
  "data": {
    "000001.SH": { "price": 2950.50, "change": 15.30, ... }
  }
}

# 心跳机制
# 客户端发送
{ "type": "ping", "timestamp": 1703001600 }
# 服务器响应
{ "type": "pong", "timestamp": 1703001600 }
```

---

## 四、数据库设计

### 4.1 数据库选型策略

```
┌─────────────────────────────────────────────────────────────────┐
│                      数据库架构设计                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    数据分类存储策略                      │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │  时序数据 (K线/Tick) ──────► TimescaleDB/ClickHouse    │   │
│  │  - 自动分区  - 数据压缩  - 高效查询                      │   │
│  │                                                         │   │
│  │  业务数据 (用户/配置) ─────► PostgreSQL                 │   │
│  │  - ACID保证  - JSON支持  - 复杂查询                      │   │
│  │                                                         │   │
│  │  热点数据 (缓存) ──────────► Redis Cluster              │   │
│  │  - 亚毫秒响应  - 分布式锁  - Pub/Sub                     │   │
│  │                                                         │   │
│  │  搜索/日志 ────────────────► Elasticsearch              │   │
│  │  - 全文检索  - 聚合分析  - 日志存储                      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 核心表结构设计

```sql
-- ========== PostgreSQL - 业务数据 ==========

-- 用户表
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    status INTEGER DEFAULT 1, -- 0:禁用 1:正常
    vip_level INTEGER DEFAULT 0,
    vip_expire_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 股票基础信息表
CREATE TABLE stocks (
    code VARCHAR(20) PRIMARY KEY, -- 如: 000001.SZ
    name VARCHAR(100) NOT NULL,
    market VARCHAR(10) NOT NULL, -- SH/SZ/BJ/HK/US
    industry_code VARCHAR(20),
    industry_name VARCHAR(50),
    total_shares BIGINT,
    float_shares BIGINT,
    list_date DATE,
    status INTEGER DEFAULT 1, -- 0:退市 1:正常
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户自选股表
CREATE TABLE user_watchlists (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    stock_code VARCHAR(20) REFERENCES stocks(code),
    group_name VARCHAR(50) DEFAULT '默认',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, stock_code)
);

-- 选股策略表
CREATE TABLE screening_strategies (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    conditions JSONB NOT NULL, -- 存储条件JSON
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 预警规则表
CREATE TABLE alert_rules (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    stock_code VARCHAR(20) REFERENCES stocks(code),
    alert_type VARCHAR(50) NOT NULL, -- price_change/volume/indicator
    condition JSONB NOT NULL,
    notify_channels JSONB DEFAULT '["app"]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== TimescaleDB - 时序数据 ==========

-- 日线数据表 (使用TimescaleDB自动分区)
CREATE TABLE stock_daily (
    code VARCHAR(20) NOT NULL,
    trade_date DATE NOT NULL,
    open DECIMAL(12,4),
    high DECIMAL(12,4),
    low DECIMAL(12,4),
    close DECIMAL(12,4),
    pre_close DECIMAL(12,4),
    volume BIGINT,
    amount DECIMAL(18,4),
    change DECIMAL(12,4),
    change_pct DECIMAL(8,4),
    turnover DECIMAL(8,4),
    PRIMARY KEY (code, trade_date)
);

-- 转换为超表，按年分区
SELECT create_hypertable('stock_daily', 'trade_date', chunk_time_interval => INTERVAL '1 year');

-- 分钟线数据表
CREATE TABLE stock_minute (
    code VARCHAR(20) NOT NULL,
    trade_time TIMESTAMP NOT NULL,
    open DECIMAL(12,4),
    high DECIMAL(12,4),
    low DECIMAL(12,4),
    close DECIMAL(12,4),
    volume BIGINT,
    amount DECIMAL(18,4),
    PRIMARY KEY (code, trade_time)
);

SELECT create_hypertable('stock_minute', 'trade_time', chunk_time_interval => INTERVAL '1 month');

-- Tick数据表
CREATE TABLE stock_tick (
    code VARCHAR(20) NOT NULL,
    trade_time TIMESTAMP NOT NULL,
    price DECIMAL(12,4),
    volume INTEGER,
    type VARCHAR(10), -- buy/sell
    PRIMARY KEY (code, trade_time)
);

SELECT create_hypertable('stock_tick', 'trade_time', chunk_time_interval => INTERVAL '1 week');

-- ========== Redis 数据结构 ==========

-- 实时行情哈希表
-- HSET stock:realtime:000001.SZ price 10.50 change 0.25 ...

-- 热门股票排行榜 (Sorted Set)
-- ZADD stock:ranking:volume 1250000 000001.SZ
-- ZADD stock:ranking:amount 13437500 000001.SZ

-- 板块热度排行
-- ZADD sector:industry:heat 95.5 BK0475

-- 用户会话
-- SET session:user:123 token_value EX 3600

-- 限流计数器
-- INCR rate_limit:api:123:1703001600
-- EXPIRE rate_limit:api:123:1703001600 60

-- ========== Elasticsearch 索引设计 ==========

-- 快讯索引
PUT /news_flash
{
  "mappings": {
    "properties": {
      "title": { "type": "text", "analyzer": "ik_max_word" },
      "content": { "type": "text", "analyzer": "ik_max_word" },
      "category": { "type": "keyword" },
      "publish_time": { "type": "date" },
      "importance": { "type": "integer" },
      "related_stocks": { "type": "keyword" }
    }
  }
}

-- 研报索引
PUT /research_reports
{
  "mappings": {
    "properties": {
      "title": { "type": "text", "analyzer": "ik_max_word" },
      "content": { "type": "text", "analyzer": "ik_max_word" },
      "stock_code": { "type": "keyword" },
      "rating": { "type": "keyword" },
      "target_price": { "type": "float" },
      "publish_date": { "type": "date" },
      "source": { "type": "keyword" }
    }
  }
}
```

### 4.3 数据存储估算

```
┌─────────────────────────────────────────────────────────────────┐
│                      数据存储估算                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  日线数据: 5000股 × 250交易日/年 × 10年 × 200字节 ≈ 2.5GB       │
│  分钟线: 5000股 × 240分钟 × 250天 × 100字节 ≈ 30GB/年          │
│  Tick数据: 5000股 × 3000笔/天 × 250天 × 80字节 ≈ 300GB/年      │
│  用户数据: 10万用户 × 10KB ≈ 1GB                               │
│  资讯数据: 预估 5GB/年                                         │
│  日志数据: 预估 100GB/年                                       │
│                                                                 │
│  首年总存储: ~450GB                                            │
│  3年总存储: ~1.5TB (考虑数据压缩后约800GB)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 五、认证授权方案

### 5.1 认证架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      认证授权架构                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   客户端    │────►│  API Gateway │────►│  认证服务   │       │
│  │             │     │  (Kong)      │     │  (Auth Svc) │       │
│  └─────────────┘     └─────────────┘     └──────┬──────┘       │
│                                                  │              │
│                          ┌───────────────────────┘              │
│                          ▼                                      │
│                   ┌─────────────┐                               │
│                   │  Redis      │                               │
│                   │ (Token存储) │                               │
│                   └─────────────┘                               │
│                                                                 │
│  认证流程:                                                      │
│  1. 用户登录 → 认证服务验证 → 生成JWT + Refresh Token          │
│  2. 网关验证JWT → 转发请求 → 服务处理                          │
│  3. Token过期 → 用Refresh Token换取新Token                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 JWT Token设计

```python
# Access Token 载荷
{
    "sub": "user_id",           # 用户ID
    "username": "john_doe",      # 用户名
    "roles": ["user", "vip"],    # 角色
    "permissions": ["read:stocks", "write:watchlist"],
    "iat": 1703001600,           # 签发时间
    "exp": 1703005200,           # 过期时间(1小时)
    "jti": "unique_token_id"     # Token唯一标识
}

# Refresh Token 载荷
{
    "sub": "user_id",
    "type": "refresh",
    "iat": 1703001600,
    "exp": 1705593600,           # 过期时间(30天)
    "jti": "unique_refresh_id"
}
```

### 5.3 权限控制模型 (RBAC)

```yaml
# 角色定义
roles:
  - name: guest
    permissions:
      - read:market_overview
      - read:stock_basic
  
  - name: user
    permissions:
      - read:market_overview
      - read:stock_detail
      - write:watchlist
      - read:screener_basic
  
  - name: vip
    permissions:
      - inherit: user
      - read:ai_analysis
      - read:research_report
      - use:advanced_screener
  
  - name: admin
    permissions:
      - "*"

# API权限注解
@require_permission("read:stock_detail")
@require_role(["user", "vip"])
async def get_stock_detail(code: str):
    ...
```

---

## 六、性能优化策略

### 6.1 缓存策略

```
┌─────────────────────────────────────────────────────────────────┐
│                      多级缓存架构                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  L1: 浏览器缓存 (静态资源)                                      │
│      - JS/CSS/图片: max-age=31536000                            │
│      - 使用文件名hash实现长期缓存                               │
│                                                                 │
│  L2: CDN缓存 (边缘节点)                                         │
│      - 静态资源分发                                             │
│      - API响应缓存 (短时效)                                     │
│                                                                 │
│  L3: 应用缓存 (Redis)                                           │
│      ┌─────────────────────────────────────────────────────┐   │
│      │ 热点数据缓存策略                                     │   │
│      ├─────────────────────────────────────────────────────┤   │
│      │ 实时行情: TTL=5s  (快速变化)                        │   │
│      │ 大盘指数: TTL=10s                                   │   │
│      │ 股票列表: TTL=60s                                   │   │
│      │ 板块排行: TTL=30s                                   │   │
│      │ K线数据: TTL=300s (历史数据不变)                    │   │
│      │ 用户会话: TTL=3600s                                 │   │
│      └─────────────────────────────────────────────────────┘   │
│                                                                 │
│  L4: 数据库缓存 (查询缓存)                                      │
│      - PostgreSQL查询缓存                                       │
│      - TimescaleDB连续聚合                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 数据库优化

```sql
-- 索引优化
CREATE INDEX idx_stock_daily_code_date ON stock_daily(code, trade_date DESC);
CREATE INDEX idx_stock_minute_code_time ON stock_minute(code, trade_time DESC);
CREATE INDEX idx_stocks_industry ON stocks(industry_code);

-- TimescaleDB连续聚合 (预计算日/周/月K线)
CREATE MATERIALIZED VIEW stock_daily_1min_agg
WITH (timescaledb.continuous) AS
SELECT
    code,
    time_bucket('1 minute', trade_time) AS bucket,
    first(open, trade_time) AS open,
    max(high) AS high,
    min(low) AS low,
    last(close, trade_time) AS close,
    sum(volume) AS volume
FROM stock_tick
GROUP BY code, bucket;

-- 分区策略
-- TimescaleDB自动按时间分区
-- PostgreSQL按用户ID范围分区 (大表)
```

### 6.3 前端性能优化

```
┌─────────────────────────────────────────────────────────────────┐
│                      前端性能优化策略                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 代码分割 (Code Splitting)                                   │
│     - 路由级别懒加载                                            │
│     - 组件级别懒加载                                            │
│     - 使用React.lazy + Suspense                                 │
│                                                                 │
│  2. 虚拟滚动 (Virtual Scrolling)                                │
│     - 股票列表使用react-window                                  │
│     - 大量数据只渲染可视区域                                    │
│                                                                 │
│  3. 图表优化                                                    │
│     - 数据采样 (大数据集时)                                     │
│     - 使用Canvas渲染                                            │
│     - 懒加载历史K线                                             │
│                                                                 │
│  4. 状态管理优化                                                │
│     - 使用原子化状态 (Zustand)                                  │
│     - 避免不必要的重渲染                                        │
│     - 使用React.memo/useMemo/useCallback                        │
│                                                                 │
│  5. 网络优化                                                    │
│     - 请求合并 (批量获取)                                       │
│     - 数据压缩 (gzip/brotli)                                    │
│     - HTTP/2 多路复用                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 七、部署架构

### 7.1 开发环境

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - REACT_APP_API_URL=http://localhost:8000

  api:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/stockdb
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: timescale/timescaledb:latest-pg15
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
```

### 7.2 生产环境 (Kubernetes)

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stock-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: stock-api
  template:
    metadata:
      labels:
        app: stock-api
    spec:
      containers:
      - name: api
        image: registry.example.com/stock-api:v1.0.0
        ports:
        - containerPort: 8000
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: stock-api-service
spec:
  selector:
    app: stock-api
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: stock-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt
spec:
  tls:
  - hosts:
    - api.example.com
    secretName: api-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: stock-api-service
            port:
              number: 80
```

### 7.3 部署架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      生产环境部署架构                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                         ┌─────────┐                             │
│                         │   CDN   │                             │
│                         │ (阿里云)│                             │
│                         └────┬────┘                             │
│                              │                                  │
│  ┌───────────────────────────┼───────────────────────────┐     │
│  │                      K8s Cluster                       │     │
│  │  ┌──────────────────────┼──────────────────────┐      │     │
│  │  │                  Ingress                      │      │     │
│  │  │              (Nginx Ingress)                  │      │     │
│  │  └──────────────────────┬──────────────────────┘      │     │
│  │                         │                             │     │
│  │  ┌─────────────┐  ┌─────┴─────┐  ┌─────────────┐     │     │
│  │  │  API Svc    │  │  API Svc  │  │  API Svc    │     │     │
│  │  │  (Pod x3)   │  │  (Pod x3) │  │  (Pod x3)   │     │     │
│  │  └─────────────┘  └───────────┘  └─────────────┘     │     │
│  │                                                        │     │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │     │
│  │  │  WS Svc     │  │  Worker     │  │  Scheduler  │    │     │
│  │  │  (Pod x2)   │  │  (Pod x2)   │  │  (Pod x1)   │    │     │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │     │
│  └────────────────────────────────────────────────────────┘     │
│                              │                                  │
│  ┌───────────────────────────┼───────────────────────────┐     │
│  │                      数据层                             │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │     │
│  │  │PostgreSQL│ │Timescale │ │  Redis   │ │   ES     │  │     │
│  │  │ (主从)   │ │   DB     │ │ Cluster  │ │ Cluster  │  │     │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 八、监控与日志方案

### 8.1 监控体系

```
┌─────────────────────────────────────────────────────────────────┐
│                      监控告警体系                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Prometheus (指标采集)                 │   │
│  │  - 系统指标: CPU/内存/磁盘/网络                          │   │
│  │  - 应用指标: QPS/延迟/错误率                             │   │
│  │  - 业务指标: 在线人数/选股次数                           │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Grafana (可视化)                      │   │
│  │  - 系统监控大盘                                          │   │
│  │  - 业务监控大盘                                          │   │
│  │  - 告警配置                                              │   │
│  └─────────────────────────┬───────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    AlertManager (告警)                   │   │
│  │  - 邮件通知                                              │   │
│  │  - 钉钉/企业微信                                         │   │
│  │  - PagerDuty                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  核心监控指标:                                                  │
│  - API响应时间: P99 < 200ms                                    │
│  - API错误率: < 0.1%                                           │
│  - 系统可用性: 99.9%                                           │
│  - 数据库连接池使用率: < 80%                                   │
│  - Redis命中率: > 95%                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 日志方案

```
┌─────────────────────────────────────────────────────────────────┐
│                      日志收集分析                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  应用日志 ──► Filebeat ──► Logstash ──► Elasticsearch ──► Kibana│
│                                                                 │
│  日志规范:                                                      │
│  {
│    "timestamp": "2024-01-15T14:30:00Z",
│    "level": "INFO|WARN|ERROR",
│    "service": "stock-api",
│    "request_id": "uuid",
│    "user_id": "123",
│    "message": "...",
│    "context": { ... }
│  }
│                                                                 │
│  日志级别:                                                      │
│  - DEBUG: 开发调试                                              │
│  - INFO: 正常操作日志                                           │
│  - WARN: 警告但不影响功能                                       │
│  - ERROR: 错误需要处理                                          │
│  - FATAL: 严重错误                                              │
│                                                                 │
│  日志保留策略:                                                  │
│  - 应用日志: 30天                                               │
│  - 访问日志: 90天                                               │
│  - 审计日志: 1年                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 链路追踪

```
┌─────────────────────────────────────────────────────────────────┐
│                      分布式链路追踪                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  请求 ──► Gateway ──► Auth Svc ──► Market Svc ──► Database     │
│            │              │            │            │           │
│            └──────────────┴────────────┴────────────┘           │
│                         │                                       │
│                         ▼                                       │
│                    Jaeger/Zipkin                                │
│                                                                 │
│  Trace ID贯穿整个请求链路                                       │
│  - 请求入口生成Trace ID                                         │
│  - 各服务传递Trace ID                                           │
│  - 记录每个span的耗时                                           │
│  - 可视化展示调用链                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 九、扩展性设计

### 9.1 水平扩展策略

```
┌─────────────────────────────────────────────────────────────────┐
│                      水平扩展方案                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 应用层扩展                                                  │
│     - K8s HPA根据CPU/内存自动扩缩容                            │
│     - 最小副本数: 3, 最大副本数: 20                            │
│                                                                 │
│  2. 数据库扩展                                                  │
│     - PostgreSQL: 读写分离 + 主从复制                          │
│     - TimescaleDB: 数据分片 (按股票代码)                       │
│     - Redis: Cluster模式自动分片                               │
│                                                                 │
│  3. 缓存扩展                                                    │
│     - Redis Cluster: 6主6从                                    │
│     - 热点数据本地缓存 (Caffeine)                              │
│                                                                 │
│  4. 消息队列扩展                                                │
│     - Kafka: 多分区消费                                        │
│     - 消费者组水平扩展                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 容量规划

```
┌─────────────────────────────────────────────────────────────────┐
│                      容量规划建议                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  初期配置 (1000并发):                                           │
│  - API服务: 3 Pod × 1C2G                                       │
│  - WebSocket: 2 Pod × 1C2G                                     │
│  - PostgreSQL: 2C4G 主从                                       │
│  - TimescaleDB: 4C8G                                           │
│  - Redis: 2C4G Cluster                                         │
│                                                                 │
│  中期扩展 (5000并发):                                           │
│  - API服务: 6 Pod × 2C4G                                       │
│  - WebSocket: 4 Pod × 2C4G                                     │
│  - PostgreSQL: 4C8G 主从                                       │
│  - TimescaleDB: 8C16G 分片                                     │
│  - Redis: 4C8G Cluster                                         │
│                                                                 │
│  后期扩展 (20000+并发):                                         │
│  - API服务: 15+ Pod × 4C8G                                     │
│  - WebSocket: 10+ Pod × 4C8G                                   │
│  - PostgreSQL: 8C16G 主从 + 读写分离                          │
│  - TimescaleDB: 16C32G 多节点                                  │
│  - Redis: 8C16G Cluster                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 十、总结

### 技术栈总览

| 层级 | 核心技术 | 备选方案 |
|------|----------|----------|
| 前端 | React + TypeScript + Vite | Vue3 + Vite |
| 后端 | FastAPI + Python | Go + Gin |
| 时序DB | TimescaleDB | ClickHouse, InfluxDB |
| 关系DB | PostgreSQL | MySQL 8.0 |
| 缓存 | Redis Cluster | Memcached |
| 搜索 | Elasticsearch | Meilisearch |
| 消息队列 | RabbitMQ | Kafka, NATS |
| 容器编排 | Kubernetes | Docker Swarm |
| 监控 | Prometheus + Grafana | Datadog |
| 日志 | ELK Stack | Loki + Grafana |

### 关键设计决策

1. **微服务 vs 单体**: 初期采用模块化单体，后期按需拆分微服务
2. **同步 vs 异步**: 实时行情用WebSocket，其他用REST API
3. **SQL vs NoSQL**: 核心业务用PostgreSQL，时序数据用TimescaleDB
4. **自研 vs 第三方**: 核心功能自研，数据接入第三方

### 风险与应对

| 风险 | 应对措施 |
|------|----------|
| 数据量大 | 分区存储 + 冷热分离 + 压缩 |
| 实时性要求高 | WebSocket + 本地缓存 + 数据采样 |
| 并发压力大 | 水平扩展 + 限流熔断 + 缓存 |
| 数据安全 | 加密传输 + 访问控制 + 审计日志 |

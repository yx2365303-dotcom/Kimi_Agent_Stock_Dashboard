# 股票数据看板 - 数据管理层设计方案

## 一、数据表分类与特性分析

### 1.1 数据分类总览

| 数据类别 | 表数量 | 更新频率 | 数据量 | 优先级 | 典型保留期 |
|---------|-------|---------|-------|-------|-----------|
| 行情数据类 | 6 | 日/周 | 高 | 高 | 3-5年 |
| 财务数据类 | 7 | 季度/事件 | 中 | 高 | 永久 |
| 市场数据类 | 6 | 日 | 中-高 | 高 | 2-3年 |
| 特色数据类 | 5 | 实时/日 | 中-高 | 高 | 1-2年 |
| 基础数据类 | 3 | 日/年 | 低 | 高 | 永久 |

### 1.2 更新频率分类

| 更新类型 | 数据表 | 更新时机 | 预估数据量 |
|---------|-------|---------|-----------|
| 实时数据 | kpl_concept, kpl_list, ths_hot | 盘中实时 | ~1000条/分钟 |
| 日频数据 | daily, moneyflow, limit_list_d等 | 收盘后17:00-20:00 | ~50万条/日 |
| 周频数据 | weekly | 每周五收盘后 | ~10万条/周 |
| 季度数据 | fina_*系列 | 财报季后 | ~5万条/季度 |
| 事件触发 | express_vip, forecast_vip | 公告发布时 | 不定 |
| 年度数据 | trade_cal, fina_audit | 年初 | ~1万条/年 |

---

## 二、数据流架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              数据源层 (Tushare API)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  行情数据   │  │  财务数据   │  │  市场数据   │  │  特色数据   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              数据采集层 (Data Collector)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  实时数据流采集  │  │  批量数据拉取   │  │  增量更新引擎   │                  │
│  │  (WebSocket)    │  │  (Scheduler)    │  │  (Delta Sync)   │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│      实时数据流处理      │ │      批量数据处理        │ │      数据质量检查        │
│    (Real-time Stream)   │ │    (Batch Process)      │ │    (Quality Check)      │
│  ┌───────────────────┐  │ │  ┌───────────────────┐  │ │  ┌───────────────────┐  │
│  │  Kafka/Redis      │  │ │  │  数据清洗转换      │  │ │  │  完整性校验        │  │
│  │  消息队列         │  │ │  │  格式标准化        │  │ │  │  一致性校验        │  │
│  │  流式计算         │  │ │  │  异常检测          │  │ │  │  时效性校验        │  │
│  └───────────────────┘  │ │  └───────────────────┘  │ │  └───────────────────┘  │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
                    │                   │                   │
                    └───────────────────┼───────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              数据存储层 (Data Storage)                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        主数据库 (PostgreSQL)                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │  热数据区   │  │  温数据区   │  │  冷数据区   │  │  归档区     │    │   │
│  │  │  (SSD)      │  │  (SATA)     │  │  (对象存储) │  │  ( Glacier) │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        缓存层 (Redis Cluster)                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
│  │  │  L1:热点缓存 │  │  L2:查询缓存 │  │  L3:会话缓存 │  │  Pub/Sub    │    │   │
│  │  │  (内存)     │  │  (Redis)    │  │  (Redis)    │  │  (实时推送) │    │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              数据服务层 (Data Service)                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  RESTful API    │  │  GraphQL API    │  │  WebSocket API  │                  │
│  │  (查询接口)     │  │  (灵活查询)     │  │  (实时推送)     │                  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              应用层 (Frontend)                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  行情看板   │  │  财务分析   │  │  市场监控   │  │  实时预警   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 数据流向说明

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           数据流向矩阵                                       │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│    数据类型      │    采集方式      │    存储位置      │      缓存策略         │
├─────────────────┼─────────────────┼─────────────────┼───────────────────────┤
│  实时行情数据    │  WebSocket流    │  Redis+主库     │  L1内存缓存(30s)      │
│  (kpl, ths_hot) │                 │                 │  L2 Redis(5min)       │
├─────────────────┼─────────────────┼─────────────────┼───────────────────────┤
│  日频行情数据    │  API批量拉取    │  主库热数据区   │  L2 Redis(1h)         │
│  (daily等)      │  定时任务       │                 │  L3 LocalStorage(1d)  │
├─────────────────┼─────────────────┼─────────────────┼───────────────────────┤
│  财务数据        │  API增量拉取    │  主库热数据区   │  L2 Redis(24h)        │
│  (fina_*)       │  季度触发       │                 │  L3 LocalStorage(7d)  │
├─────────────────┼─────────────────┼─────────────────┼───────────────────────┤
│  历史行情数据    │  归档恢复       │  冷数据区/归档  │  按需加载             │
│  (>3年)         │                 │                 │                       │
├─────────────────┼─────────────────┼─────────────────┼───────────────────────┤
│  基础数据        │  API全量拉取    │  主库热数据区   │  L2 Redis(24h)        │
│  (stock_basic)  │  日更新         │                 │  L3 LocalStorage(7d)  │
└─────────────────┴─────────────────┴─────────────────┴───────────────────────┘
```

---

## 三、多级缓存策略设计

### 3.1 缓存层级架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           三级缓存架构                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         L1: 内存缓存层                               │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  应用内存缓存 (In-Memory Cache)                              │   │   │
│  │  │  - 容量: 512MB - 1GB                                         │   │   │
│  │  │  - 存储: 热点股票实时数据、计算结果                          │   │   │
│  │  │  - TTL: 30秒 - 5分钟                                         │   │   │
│  │  │  - 淘汰策略: LRU                                             │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         L2: Redis缓存层                              │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  Redis Cluster (主从+哨兵)                                   │   │   │
│  │  │  - 容量: 16GB - 32GB                                         │   │   │
│  │  │  - 存储: 查询结果、会话数据、排行榜                          │   │   │
│  │  │  - TTL: 5分钟 - 24小时                                       │   │   │
│  │  │  - 数据结构: String, Hash, SortedSet, Stream                 │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      L3: 浏览器本地缓存                              │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  LocalStorage / IndexedDB                                    │   │   │
│  │  │  - 容量: 5MB - 50MB (按域名)                                 │   │   │
│  │  │  - 存储: 股票基础信息、用户配置、历史查询                    │   │   │
│  │  │  - TTL: 1天 - 30天                                           │   │   │
│  │  │  - 更新策略: 后台静默更新                                    │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 缓存策略矩阵

| 数据类型 | L1缓存 | L2缓存 | L3缓存 | 缓存Key设计 | 更新触发 |
|---------|-------|-------|-------|------------|---------|
| 实时热股排行 | 60s | 5min | 30min | `hot:{type}:{ts}` | 数据变更 |
| 个股行情数据 | 30s | 15min | - | `quote:{code}:{date}` | 定时+事件 |
| K线数据 | - | 1h | 1d | `kline:{code}:{type}:{range}` | 日终更新 |
| 财务指标 | - | 24h | 7d | `fina:{code}:{report_date}` | 季报发布 |
| 股票基础信息 | 5min | 24h | 7d | `basic:{code}` | 日终更新 |
| 涨跌停列表 | 5min | 30min | - | `limit:{date}` | 日终更新 |
| 龙虎榜数据 | - | 2h | 1d | `toplist:{date}` | 日终更新 |
| 资金流向 | 2min | 10min | - | `moneyflow:{code}:{ts}` | 实时更新 |
| 用户会话 | - | 30min | - | `session:{user_id}` | 活跃续期 |
| 计算结果 | 10min | 1h | - | `calc:{hash}` | 依赖变更 |

### 3.3 Redis缓存结构设计

```yaml
# Redis Key命名规范: {domain}:{entity}:{identifier}:{attribute}

# 1. 实时数据 (Sorted Set - 按时间排序)
realtime:hot:concept          # 热门题材 ZSET score=热度值
realtime:hot:stock            # 热门股票 ZSET score=热度值
realtime:moneyflow:{code}     # 个股资金流向 Stream

# 2. 行情数据 (Hash - 字段存储)
quote:daily:{code}:{date}     # 日线数据 Hash
quote:basic:{code}            # 基础行情 Hash
quote:factor:{code}:{date}    # 技术因子 Hash

# 3. K线数据 (String - JSON压缩)
kline:{code}:1d:{start}:{end}   # 日K数据 (压缩存储)
kline:{code}:1w:{start}:{end}   # 周K数据
kline:{code}:1m:{start}:{end}   # 月K数据

# 4. 财务数据 (Hash)
fina:indicator:{code}:{date}    # 财务指标
fina:express:{code}:{date}      # 业绩快报
fina:forecast:{code}:{date}     # 业绩预告

# 5. 榜单数据 (Sorted Set)
rank:limit_up:{date}            # 涨停榜
rank:limit_down:{date}          # 跌停榜
rank:toplist:{date}             # 龙虎榜
rank:moneyflow:{date}           # 资金流向榜

# 6. 会话与配置 (String/Hash)
session:{user_id}               # 用户会话
config:user:{user_id}           # 用户配置
cache:query:{hash}              # 查询缓存

# 7. 元数据与锁 (String)
meta:last_update:{table}        # 最后更新时间
meta:version:{table}            # 数据版本
lock:update:{table}             # 更新锁
```

### 3.4 缓存更新策略

```python
# 伪代码: 缓存更新策略

class CacheManager:
    
    # 1. Cache-Aside 模式 (旁路缓存)
    async def get_data(self, key, fetch_func, ttl):
        # 先查缓存
        data = await self.cache.get(key)
        if data:
            return data
        
        # 缓存未命中，查数据库
        data = await fetch_func()
        if data:
            await self.cache.set(key, data, ttl)
        return data
    
    # 2. Write-Through 模式 (直写缓存)
    async def update_data(self, key, data, ttl):
        # 先更新数据库
        await self.db.update(key, data)
        # 同步更新缓存
        await self.cache.set(key, data, ttl)
    
    # 3. Write-Behind 模式 (异步写)
    async def batch_update(self, updates):
        # 先更新缓存
        for key, data in updates:
            await self.cache.set(key, data)
        # 异步批量写入数据库
        await self.queue.put(updates)
    
    # 4. 缓存失效策略
    async def invalidate(self, pattern):
        # 按模式批量失效
        keys = await self.cache.keys(pattern)
        await self.cache.delete(*keys)
    
    # 5. 热点数据预热
    async def preload_hot_data(self):
        hot_stocks = await self.get_hot_stocks()
        for stock in hot_stocks:
            data = await self.db.get_stock_data(stock.code)
            await self.cache.set(f"quote:{stock.code}", data, 300)
```

---

## 四、数据更新策略设计

### 4.1 更新策略分类

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           数据更新策略分类                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        全量更新策略                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  适用场景:                                                    │   │   │
│  │  │  - 首次数据初始化                                             │   │   │
│  │  │  - 数据结构变更                                               │   │   │
│  │  │  - 数据修复/重建                                              │   │   │
│  │  │  - 基础数据表 (stock_basic, trade_cal)                        │   │   │
│  │  │                                                               │   │   │
│  │  │  执行方式:                                                    │   │   │
│  │  │  - 低峰期执行 (凌晨 2:00-5:00)                                │   │   │
│  │  │  - 分批处理 (每批1000条)                                      │   │   │
│  │  │  - 事务保证                                                   │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        增量更新策略                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  适用场景:                                                    │   │   │
│  │  │  - 日频数据更新 (daily, moneyflow)                            │   │   │
│  │  │  - 实时数据流 (kpl_concept, ths_hot)                          │   │   │
│  │  │  - 事件触发数据 (express_vip, forecast_vip)                   │   │   │
│  │  │                                                               │   │   │
│  │  │  执行方式:                                                    │   │   │
│  │  │  - 基于时间戳的增量拉取                                       │   │   │
│  │  │  - 基于变更日志的同步                                         │   │   │
│  │  │  - 冲突检测与解决                                             │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        合并更新策略                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  适用场景:                                                    │   │   │
│  │  │  - 季度财务数据 (fina_indicator, balancesheet)                │   │   │
│  │  │  - 历史数据补全                                               │   │   │
│  │  │                                                               │   │   │
│  │  │  执行方式:                                                    │   │   │
│  │  │  - 增量检测变更                                               │   │   │
│  │  │  - 全量替换分区                                               │   │   │
│  │  │  - 原子性切换                                                 │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 各数据表更新策略详情

```yaml
# ============================================
# 行情数据类更新策略
# ============================================

daily:  # 日线数据
  update_mode: incremental
  schedule: "0 18 * * 1-5"  # 工作日18:00
  batch_size: 5000
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "quote:daily:*:{date}"
  quality_checks:
    - check_volume_not_null
    - check_price_range
    - check_continuity

weekly:  # 周线数据
  update_mode: incremental
  schedule: "0 19 * * 5"  # 周五19:00
  batch_size: 5000
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "quote:weekly:*"

stk_factor:  # 技术因子
  update_mode: incremental
  schedule: "30 18 * * 1-5"  # 工作日18:30
  batch_size: 3000
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "quote:factor:*:{date}"

stk_factor_pro:  # 专业版因子
  update_mode: incremental
  schedule: "0 19 * * 1-5"  # 工作日19:00
  batch_size: 2000
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "quote:factor_pro:*:{date}"

daily_basic:  # 每日指标
  update_mode: incremental
  schedule: "0 18 * * 1-5"  # 工作日18:00
  batch_size: 5000
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "quote:basic:*:{date}"

adj_factor:  # 复权因子
  update_mode: incremental
  schedule: "0 6 * * 1-5"  # 工作日06:00
  batch_size: 5000
  retry_times: 5
  conflict_resolution: merge  # 合并更新
  cache_invalidate: "quote:adj:*"

# ============================================
# 财务数据类更新策略
# ============================================

fina_indicator:  # 财务指标
  update_mode: merge
  schedule: "event_driven"  # 财报发布事件
  batch_size: 2000
  retry_times: 5
  conflict_resolution: replace
  cache_invalidate: "fina:indicator:*"
  quality_checks:
    - check_report_date_valid
    - check_indicator_consistency
    - check_cross_validation

balancesheet_vip:  # 资产负债表
  update_mode: merge
  schedule: "event_driven"
  batch_size: 1000
  retry_times: 5
  conflict_resolution: replace
  cache_invalidate: "fina:balance:*"

income_vip:  # 利润表
  update_mode: merge
  schedule: "event_driven"
  batch_size: 1000
  retry_times: 5
  conflict_resolution: replace
  cache_invalidate: "fina:income:*"

cashflow_vip:  # 现金流量表
  update_mode: merge
  schedule: "event_driven"
  batch_size: 1000
  retry_times: 5
  conflict_resolution: replace
  cache_invalidate: "fina:cashflow:*"

express_vip:  # 业绩快报
  update_mode: incremental
  schedule: "event_driven"  # 公告发布时
  batch_size: 500
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "fina:express:*"

forecast_vip:  # 业绩预告
  update_mode: incremental
  schedule: "event_driven"
  batch_size: 500
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "fina:forecast:*"

fina_audit:  # 财务审计
  update_mode: merge
  schedule: "0 2 1 5 *"  # 每年5月1日
  batch_size: 1000
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "fina:audit:*"

# ============================================
# 市场数据类更新策略
# ============================================

limit_list_d:  # 涨跌停
  update_mode: incremental
  schedule: "30 15 * * 1-5"  # 收盘后15:30
  batch_size: 2000
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "rank:limit_*:{date}"

top_list:  # 龙虎榜
  update_mode: incremental
  schedule: "0 17 * * 1-5"  # 17:00
  batch_size: 1000
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "rank:toplist:{date}"

hm_detail:  # 游资明细
  update_mode: incremental
  schedule: "0 17 * * 1-5"  # 17:00
  batch_size: 1000
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "rank:hm:*"

moneyflow:  # 资金流向
  update_mode: incremental
  schedule: "0 18 * * 1-5"  # 18:00
  batch_size: 5000
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "realtime:moneyflow:*"

margin:  # 融资融券
  update_mode: incremental
  schedule: "0 19 * * 1-5"  # 19:00
  batch_size: 3000
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "quote:margin:*"

moneyflow_hsgt:  # 沪深港通资金流向
  update_mode: incremental
  schedule: "0 18 * * 1-5"  # 18:00
  batch_size: 1000
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "moneyflow:hsgt:*"

# ============================================
# 特色数据类更新策略
# ============================================

kpl_concept:  # 开盘啦题材
  update_mode: realtime
  schedule: "continuous"  # 持续轮询
  poll_interval: 30  # 30秒
  batch_size: 500
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "realtime:hot:concept"

kpl_list:  # 开盘啦榜单
  update_mode: realtime
  schedule: "continuous"
  poll_interval: 30
  batch_size: 500
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "realtime:kpl:*"

ths_hot:  # 同花顺热榜
  update_mode: realtime
  schedule: "continuous"
  poll_interval: 60  # 60秒
  batch_size: 500
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "realtime:hot:stock"

cyq_chips:  # 筹码分布
  update_mode: incremental
  schedule: "0 19 * * 1-5"  # 19:00
  batch_size: 3000
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "quote:cyq:*"

cyq_perf:  # 筹码胜率
  update_mode: incremental
  schedule: "0 20 * * 1-5"  # 20:00
  batch_size: 2000
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "quote:cyq_perf:*"

# ============================================
# 基础数据类更新策略
# ============================================

stock_basic:  # 股票基础信息
  update_mode: full
  schedule: "0 6 * * 1-5"  # 工作日06:00
  batch_size: 5000
  retry_times: 5
  conflict_resolution: merge
  cache_invalidate: "basic:*"
  quality_checks:
    - check_code_uniqueness
    - check_list_date_valid
    - check_status_consistency

stock_company:  # 公司信息
  update_mode: full
  schedule: "0 6 * * 1-5"  # 工作日06:00
  batch_size: 3000
  retry_times: 3
  conflict_resolution: merge
  cache_invalidate: "company:*"

trade_cal:  # 交易日历
  update_mode: full
  schedule: "0 2 1 1 *"  # 每年1月1日
  batch_size: 1000
  retry_times: 3
  conflict_resolution: replace
  cache_invalidate: "meta:trade_cal"
```

### 4.3 增量更新优化策略

```python
# 增量更新优化策略 - 伪代码

class IncrementalUpdateOptimizer:
    
    def __init__(self):
        self.watermark_store = WatermarkStore()  # 水位线存储
        self.change_detector = ChangeDetector()   # 变更检测器
        self.batch_processor = BatchProcessor()   # 批处理器
    
    # 1. 基于时间戳的增量拉取
    async def timestamp_based_incremental(self, table, last_sync_time):
        """
        适用于: daily, moneyflow 等有时间戳字段的表
        """
        # 获取上次同步时间
        watermark = await self.watermark_store.get(table)
        
        # 构建增量查询条件
        query = f"""
            SELECT * FROM {table} 
            WHERE update_time > '{watermark}' 
            ORDER BY update_time
        """
        
        # 流式拉取数据
        async for batch in self.stream_fetch(query, batch_size=5000):
            # 批量写入
            await self.batch_upsert(table, batch)
            
            # 更新水位线
            new_watermark = max(row['update_time'] for row in batch)
            await self.watermark_store.set(table, new_watermark)
    
    # 2. 基于变更日志的同步 (CDC)
    async def cdc_based_sync(self, table):
        """
        适用于: 支持CDC的数据库表
        """
        # 监听变更日志
        async for change in self.change_detector.listen(table):
            if change['type'] == 'INSERT':
                await self.insert(table, change['data'])
            elif change['type'] == 'UPDATE':
                await self.update(table, change['data'])
            elif change['type'] == 'DELETE':
                await self.delete(table, change['data'])
    
    # 3. 基于哈希的变更检测
    async def hash_based_change_detection(self, table, pk_columns):
        """
        适用于: 无时间戳字段的表
        """
        # 计算源表哈希
        source_hashes = await self.compute_hashes(table, pk_columns)
        
        # 计算目标表哈希
        target_hashes = await self.get_target_hashes(table)
        
        # 检测变更
        to_insert = []
        to_update = []
        to_delete = []
        
        for pk, source_hash in source_hashes.items():
            if pk not in target_hashes:
                to_insert.append(pk)
            elif target_hashes[pk] != source_hash:
                to_update.append(pk)
        
        for pk in target_hashes:
            if pk not in source_hashes:
                to_delete.append(pk)
        
        # 执行变更
        await self.apply_changes(table, to_insert, to_update, to_delete)
    
    # 4. 分区并行更新
    async def partitioned_parallel_update(self, table, partition_column, num_partitions):
        """
        分区并行处理，加速大批量更新
        """
        # 获取分区范围
        partitions = await self.get_partition_ranges(table, partition_column, num_partitions)
        
        # 并行处理各分区
        tasks = []
        for start, end in partitions:
            task = self.process_partition(table, partition_column, start, end)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 合并结果
        total_updated = sum(r for r in results if not isinstance(r, Exception))
        return total_updated
    
    # 5. 批量Upsert优化
    async def optimized_batch_upsert(self, table, data_batch):
        """
        优化的批量Upsert，减少数据库往返
        """
        if not data_batch:
            return 0
        
        # 使用INSERT ON CONFLICT (PostgreSQL)
        query = f"""
            INSERT INTO {table} ({columns})
            VALUES {placeholders}
            ON CONFLICT ({pk_columns}) DO UPDATE SET
                {update_set}
        """
        
        # 分批执行，每批1000条
        total = 0
        for i in range(0, len(data_batch), 1000):
            batch = data_batch[i:i+1000]
            result = await self.execute(query, batch)
            total += result.rowcount
        
        return total
```

---

## 五、历史数据管理方案

### 5.1 数据生命周期管理

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        数据生命周期管理流程                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   热数据区 (SSD)        温数据区 (SATA)        冷数据区 (对象存储)    归档区 │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌────────┐│
│   │  最近3个月  │ ──▶  │  3月-1年    │ ──▶  │  1年-3年    │ ──▶  │  >3年  ││
│   │  高频访问   │      │  中频访问   │      │  低频访问   │      │  合规  ││
│   │  实时查询   │      │  历史分析   │      │  深度分析   │      │  留存  ││
│   └─────────────┘      └─────────────┘      └─────────────┘      └────────┘│
│          │                    │                    │                  │     │
│          ▼                    ▼                    ▼                  ▼     │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌────────┐│
│   │  存储: 500GB│      │  存储: 2TB  │      │  存储: 10TB │      │  50TB  ││
│   │  查询: <50ms│      │  查询: <200ms│     │  查询: <1s  │      │  恢复  ││
│   │  保留策略:  │      │  保留策略:  │      │  保留策略:  │      │  按需  ││
│   │  自动过期   │      │  手动迁移   │      │  自动归档   │      │        ││
│   └─────────────┘      └─────────────┘      └─────────────┘      └────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 分区表设计

```sql
-- PostgreSQL 分区表示例

-- 1. 日线数据分区表 (按月份分区)
CREATE TABLE daily (
    ts_code VARCHAR(20) NOT NULL,
    trade_date DATE NOT NULL,
    open DECIMAL(10,4),
    high DECIMAL(10,4),
    low DECIMAL(10,4),
    close DECIMAL(10,4),
    vol BIGINT,
    amount DECIMAL(18,4),
    PRIMARY KEY (ts_code, trade_date)
) PARTITION BY RANGE (trade_date);

-- 创建月分区
CREATE TABLE daily_2024_01 PARTITION OF daily
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE daily_2024_02 PARTITION OF daily
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- ... 更多分区

-- 2. 资金流向分区表 (按日期分区)
CREATE TABLE moneyflow (
    ts_code VARCHAR(20) NOT NULL,
    trade_date DATE NOT NULL,
    buy_sm_vol BIGINT,
    sell_sm_vol BIGINT,
    -- ... 其他字段
    PRIMARY KEY (ts_code, trade_date)
) PARTITION BY RANGE (trade_date);

-- 3. 财务数据分区表 (按报告期年份分区)
CREATE TABLE fina_indicator (
    ts_code VARCHAR(20) NOT NULL,
    ann_date DATE,
    end_date DATE NOT NULL,
    eps DECIMAL(10,4),
    -- ... 其他字段
    PRIMARY KEY (ts_code, end_date)
) PARTITION BY RANGE (end_date);

-- 4. 自动分区管理函数
CREATE OR REPLACE FUNCTION create_monthly_partition(
    p_table_name TEXT,
    p_year INT,
    p_month INT
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    partition_name := p_table_name || '_' || p_year || '_' || LPAD(p_month::TEXT, 2, '0');
    start_date := MAKE_DATE(p_year, p_month, 1);
    end_date := start_date + INTERVAL '1 month';
    
    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
        partition_name, p_table_name, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;
```

### 5.3 数据归档策略

```python
# 数据归档管理器 - 伪代码

class DataArchiver:
    
    def __init__(self, config):
        self.hot_storage = HotStorage()
        self.cold_storage = ColdStorage()  # S3/MinIO
        self.archive_storage = ArchiveStorage()  # Glacier
        self.metadata_store = MetadataStore()
    
    # 1. 自动归档任务
    async def auto_archive_job(self):
        """
        定时归档任务 - 每月执行
        """
        # 获取可归档的分区
        partitions = await self.get_archivable_partitions()
        
        for partition in partitions:
            try:
                # 数据压缩
                compressed = await self.compress_partition(partition)
                
                # 上传冷存储
                await self.cold_storage.upload(compressed)
                
                # 更新元数据
                await self.metadata_store.mark_archived(partition)
                
                # 删除热存储数据 (可选)
                if partition.age > self.config.delete_after_archive:
                    await self.hot_storage.drop_partition(partition)
                
            except Exception as e:
                logger.error(f"Archive failed for {partition}: {e}")
                await self.alert_manager.send_alert("ARCHIVE_FAILED", partition)
    
    # 2. 数据压缩
    async def compress_partition(self, partition):
        """
        使用Parquet格式压缩，支持列式存储和高效查询
        """
        # 导出为Parquet
        df = await self.hot_storage.read_partition(partition)
        
        # 使用Snappy压缩
        parquet_buffer = df.to_parquet(
            compression='snappy',
            engine='pyarrow'
        )
        
        return parquet_buffer
    
    # 3. 归档数据查询
    async def query_archived_data(self, table, date_range, filters):
        """
        查询归档数据 - 自动路由到正确的存储
        """
        # 确定数据位置
        locations = await self.metadata_store.locate_data(table, date_range)
        
        results = []
        for location in locations:
            if location.storage_type == 'hot':
                data = await self.hot_storage.query(location, filters)
            elif location.storage_type == 'cold':
                data = await self.cold_storage.query(location, filters)
            elif location.storage_type == 'archive':
                # 从归档恢复
                data = await self.restore_and_query(location, filters)
            
            results.append(data)
        
        return pd.concat(results)
    
    # 4. 归档数据恢复
    async def restore_from_archive(self, table, date_range):
        """
        从归档存储恢复数据
        """
        # 获取归档文件列表
        archives = await self.archive_storage.list_archives(table, date_range)
        
        for archive in archives:
            # 发起恢复请求 (Glacier需要几小时)
            restore_job = await self.archive_storage.initiate_restore(archive)
            
            # 等待恢复完成
            await self.wait_for_restore(restore_job)
            
            # 下载并解压
            data = await self.archive_storage.download(archive)
            decompressed = await self.decompress(data)
            
            # 恢复到冷存储
            await self.cold_storage.store(decompressed)
    
    # 5. 数据保留策略
    async def apply_retention_policy(self):
        """
        应用数据保留策略，自动清理过期数据
        """
        policies = {
            'daily': {'hot': 90, 'cold': 365*3, 'archive': 365*5},
            'moneyflow': {'hot': 90, 'cold': 365*2, 'archive': 365*3},
            'kpl_concept': {'hot': 30, 'cold': 365, 'archive': 365*2},
            'fina_indicator': {'hot': 365*2, 'cold': 365*10, 'archive': None},  # 永久保留
        }
        
        for table, policy in policies.items():
            # 清理过期热数据
            if policy['hot']:
                await self.move_to_cold(table, policy['hot'])
            
            # 清理过期冷数据
            if policy['cold']:
                await self.move_to_archive(table, policy['cold'])
            
            # 删除过期归档数据
            if policy['archive']:
                await self.delete_archive(table, policy['archive'])
```

---

## 六、数据质量监控方案

### 6.1 数据质量监控架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        数据质量监控架构                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        数据采集层                                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│   │
│  │  │  完整性检查  │  │  一致性检查  │  │  时效性检查  │  │  准确性检查  ││   │
│  │  │  (Completeness)│ (Consistency)│  │ (Timeliness)│  │ (Accuracy)  ││   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        质量规则引擎                                  │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │  规则定义:                                                     │   │   │
│  │  │  - 字段级规则: 非空、格式、范围                                │   │   │
│  │  │  - 记录级规则: 唯一性、关联性                                  │   │   │
│  │  │  - 表级规则: 行数、增长率、连续性                              │   │   │
│  │  │  - 跨表规则: 外键一致性、汇总平衡                              │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        质量评分与报告                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│   │
│  │  │  质量评分   │  │  异常告警   │  │  趋势分析   │  │  修复建议   ││   │
│  │  │  Dashboard  │  │  (Alert)    │  │  (Trend)    │  │  (Action)   ││   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 数据质量检查规则

```yaml
# 数据质量检查规则配置

rules:
  # ============================================
  # 完整性检查规则
  # ============================================
  completeness:
    - name: daily_required_fields
      table: daily
      check_type: not_null
      fields: [ts_code, trade_date, open, high, low, close, vol]
      threshold: 100  # 100%非空
      severity: critical
      
    - name: stock_basic_completeness
      table: stock_basic
      check_type: not_null
      fields: [ts_code, name, list_date, list_status]
      threshold: 100
      severity: critical
      
    - name: daily_row_count_check
      table: daily
      check_type: row_count
      expected_min: 4000  # 至少4000只股票
      expected_max: 6000  # 最多6000只股票
      severity: warning
  
  # ============================================
  # 一致性检查规则
  # ============================================
  consistency:
    - name: daily_price_logic
      table: daily
      check_type: custom_sql
      sql: |
        SELECT * FROM daily 
        WHERE high < low OR high < open OR high < close 
           OR low > open OR low > close
      expected_count: 0
      severity: critical
      
    - name: fina_indicator_balance
      table: fina_indicator
      check_type: cross_validation
      validation: assets == liabilities + equity
      severity: warning
      
    - name: stock_code_existence
      table: daily
      check_type: referential_integrity
      ref_table: stock_basic
      ref_field: ts_code
      severity: critical
  
  # ============================================
  # 时效性检查规则
  # ============================================
  timeliness:
    - name: daily_update_timeliness
      table: daily
      check_type: freshness
      max_delay: 4h  # 收盘后4小时内更新
      schedule: "0 22 * * 1-5"  # 工作日22:00检查
      severity: warning
      
    - name: realtime_data_freshness
      table: kpl_concept
      check_type: freshness
      max_delay: 5m  # 5分钟内更新
      severity: critical
      
    - name: fina_data_quarterly
      table: fina_indicator
      check_type: schedule_compliance
      expected_schedule: quarterly
      grace_period: 30d  # 财报季后30天
      severity: warning
  
  # ============================================
  # 准确性检查规则
  # ============================================
  accuracy:
    - name: daily_price_range
      table: daily
      check_type: range_check
      fields:
        - field: close
          min: 0.01
          max: 10000
        - field: pct_change
          min: -21  # ST股最大跌幅
          max: 21   # 最大涨幅
      severity: warning
      
    - name: daily_volume_reasonable
      table: daily
      check_type: statistical_check
      field: vol
      check: z_score < 5  # 成交量Z分数不超过5
      severity: info
      
    - name: moneyflow_consistency
      table: moneyflow
      check_type: custom_validation
      validation: buy_amount + sell_amount == total_amount
      tolerance: 0.01  # 1%容差
      severity: warning
```

### 6.3 数据质量监控实现

```python
# 数据质量监控引擎 - 伪代码

class DataQualityEngine:
    
    def __init__(self, config):
        self.rule_engine = RuleEngine(config.rules)
        self.metrics_store = MetricsStore()
        self.alert_manager = AlertManager()
        self.dashboard = QualityDashboard()
    
    # 1. 执行质量检查
    async def run_quality_check(self, table, check_type=None):
        """
        执行数据质量检查
        """
        # 获取适用的规则
        rules = self.rule_engine.get_rules(table, check_type)
        
        results = []
        for rule in rules:
            try:
                result = await self.execute_rule(rule)
                results.append(result)
                
                # 存储指标
                await self.metrics_store.store(result)
                
                # 触发告警
                if result.status == 'failed' and rule.severity in ['critical', 'warning']:
                    await self.alert_manager.send_alert(rule, result)
                    
            except Exception as e:
                logger.error(f"Rule execution failed: {rule.name}, error: {e}")
                results.append(QualityResult(rule.name, 'error', str(e)))
        
        # 更新仪表盘
        await self.dashboard.update(table, results)
        
        return results
    
    # 2. 执行单个规则
    async def execute_rule(self, rule):
        """
        执行单个质量规则
        """
        if rule.check_type == 'not_null':
            return await self.check_not_null(rule)
        elif rule.check_type == 'row_count':
            return await self.check_row_count(rule)
        elif rule.check_type == 'custom_sql':
            return await self.execute_custom_sql(rule)
        elif rule.check_type == 'freshness':
            return await self.check_freshness(rule)
        elif rule.check_type == 'range_check':
            return await self.check_range(rule)
        elif rule.check_type == 'referential_integrity':
            return await self.check_referential_integrity(rule)
        # ... 更多检查类型
    
    # 3. 时效性检查
    async def check_freshness(self, rule):
        """
        检查数据时效性
        """
        # 获取最后更新时间
        last_update = await self.db.get_last_update_time(rule.table)
        
        # 计算延迟
        delay = datetime.now() - last_update
        
        # 判断是否超时
        max_delay = parse_duration(rule.max_delay)
        passed = delay <= max_delay
        
        return QualityResult(
            rule_name=rule.name,
            status='passed' if passed else 'failed',
            details={
                'last_update': last_update.isoformat(),
                'delay_seconds': delay.total_seconds(),
                'max_delay_seconds': max_delay.total_seconds()
            }
        )
    
    # 4. 质量评分计算
    async def calculate_quality_score(self, table, time_range):
        """
        计算数据质量评分
        """
        # 获取历史检查结果
        checks = await self.metrics_store.get_checks(table, time_range)
        
        # 按严重性加权
        weights = {'critical': 10, 'warning': 5, 'info': 1}
        
        total_weight = 0
        failed_weight = 0
        
        for check in checks:
            weight = weights.get(check.severity, 1)
            total_weight += weight
            if check.status == 'failed':
                failed_weight += weight
        
        # 计算评分 (0-100)
        if total_weight == 0:
            score = 100
        else:
            score = 100 * (1 - failed_weight / total_weight)
        
        return round(score, 2)
    
    # 5. 质量报告生成
    async def generate_quality_report(self, period='daily'):
        """
        生成数据质量报告
        """
        tables = await self.get_all_tables()
        
        report = {
            'period': period,
            'generated_at': datetime.now().isoformat(),
            'summary': {},
            'details': []
        }
        
        for table in tables:
            score = await self.calculate_quality_score(table, period)
            issues = await self.get_issues(table, period)
            
            report['details'].append({
                'table': table,
                'quality_score': score,
                'issue_count': len(issues),
                'issues': issues
            })
        
        # 计算总体评分
        scores = [d['quality_score'] for d in report['details']]
        report['summary']['overall_score'] = round(sum(scores) / len(scores), 2)
        report['summary']['total_issues'] = sum(d['issue_count'] for d in report['details'])
        
        return report
```

---

## 七、容灾备份策略

### 7.1 容灾架构设计

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        容灾备份架构                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  生产环境                    同城灾备                      异地灾备          │
│  ┌─────────────┐            ┌─────────────┐            ┌─────────────┐     │
│  │  主数据库    │◄──────────►│  从数据库    │◄──────────►│  异地从库    │     │
│  │  (Master)   │  同步复制   │  (Slave)    │  异步复制   │  (Remote)   │     │
│  │  Region: A  │            │  Region: A  │            │  Region: B  │     │
│  └─────────────┘            └─────────────┘            └─────────────┘     │
│         │                         │                         │              │
│         ▼                         ▼                         ▼              │
│  ┌─────────────┐            ┌─────────────┐            ┌─────────────┐     │
│  │  Redis主   │◄──────────►│  Redis从   │            │  冷备份      │     │
│  │  Cluster   │  哨兵模式   │  Cluster   │            │  (S3)       │     │
│  └─────────────┘            └─────────────┘            └─────────────┘     │
│                                                                             │
│  ================================================================          │
│                                                                             │
│  备份策略:                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  全量备份: 每周日凌晨 2:00                                          │   │
│  │  增量备份: 每日凌晨 1:00                                            │   │
│  │  实时备份: Binlog同步 (保留7天)                                      │   │
│  │  归档备份: 每月1日归档到冷存储                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  恢复目标:                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  RPO (恢复点目标): < 5分钟                                          │   │
│  │  RTO (恢复时间目标): < 30分钟                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 备份策略详情

```yaml
# 备份策略配置

backup:
  # ============================================
  # 数据库备份
  # ============================================
  database:
    full_backup:
      schedule: "0 2 * * 0"  # 每周日凌晨2点
      retention: 4  # 保留4周
      storage: s3://backup/stockdb/full/
      compression: gzip
      encryption: aes256
      
    incremental_backup:
      schedule: "0 1 * * *"  # 每天凌晨1点
      retention: 7  # 保留7天
      storage: s3://backup/stockdb/incremental/
      compression: gzip
      
    binlog_backup:
      enabled: true
      retention: 7d  # 保留7天
      realtime: true  # 实时同步
      
    point_in_time_recovery:
      enabled: true
      retention_window: 7d
  
  # ============================================
  # Redis备份
  # ============================================
  redis:
    rdb_backup:
      schedule: "0 3 * * *"  # 每天凌晨3点
      retention: 7
      storage: s3://backup/redis/
      
    aof_persistence:
      enabled: true
      appendfsync: everysec
      
    cluster_backup:
      enabled: true
      backup_all_masters: true
  
  # ============================================
  # 配置文件备份
  # ============================================
  config:
    schedule: "0 4 * * *"
    paths:
      - /etc/postgresql/
      - /etc/redis/
      - /opt/stockdb/config/
    retention: 30
    storage: s3://backup/config/

# ============================================
# 恢复流程
# ============================================
recovery:
  automated:
    enabled: true
    trigger_conditions:
      - primary_db_down_duration > 60s
      - data_corruption_detected
      - manual_trigger
      
  procedures:
    # 1. 数据库故障恢复
    database_failure:
      steps:
        - detect_failure
        - promote_slave_to_master
        - update_dns_records
        - notify_administrators
        - investigate_root_cause
      estimated_time: 10m
      
    # 2. 数据损坏恢复
    data_corruption:
      steps:
        - stop_corrupted_instance
        - identify_last_good_backup
        - restore_from_backup
        - apply_binlog_to_point_in_time
        - verify_data_integrity
        - resume_service
      estimated_time: 30m
      
    # 3. 完整灾难恢复
    full_disaster:
      steps:
        - activate_disaster_site
        - restore_from_cold_backup
        - apply_incremental_backups
        - apply_binlog
        - verify_all_systems
        - switch_traffic_to_disaster_site
        - notify_stakeholders
      estimated_time: 2h
```

### 7.3 备份与恢复实现

```python
# 备份管理器 - 伪代码

class BackupManager:
    
    def __init__(self, config):
        self.db_backup = DatabaseBackup(config.database)
        self.redis_backup = RedisBackup(config.redis)
        self.storage = CloudStorage(config.storage)
        self.scheduler = Scheduler()
    
    # 1. 执行全量备份
    async def full_backup(self, table=None):
        """
        执行数据库全量备份
        """
        backup_id = generate_backup_id()
        timestamp = datetime.now()
        
        try:
            # 创建备份目录
            backup_dir = f"/tmp/backup/{backup_id}"
            os.makedirs(backup_dir, exist_ok=True)
            
            if table:
                # 单表备份
                await self.db_backup.backup_table(table, backup_dir)
            else:
                # 全库备份
                await self.db_backup.backup_all(backup_dir)
            
            # 压缩备份
            compressed = await self.compress(backup_dir)
            
            # 加密备份
            encrypted = await self.encrypt(compressed)
            
            # 上传到云存储
            storage_path = f"full/{timestamp.strftime('%Y/%m/%d')}/{backup_id}.enc"
            await self.storage.upload(encrypted, storage_path)
            
            # 记录备份元数据
            await self.record_backup_metadata(backup_id, timestamp, storage_path)
            
            logger.info(f"Full backup completed: {backup_id}")
            return backup_id
            
        except Exception as e:
            logger.error(f"Full backup failed: {e}")
            await self.alert_manager.send_alert("BACKUP_FAILED", str(e))
            raise
    
    # 2. 执行增量备份
    async def incremental_backup(self, base_backup_id=None):
        """
        执行增量备份 (基于WAL/Binlog)
        """
        backup_id = generate_backup_id()
        
        # 获取上次备份的LSN/位置
        if not base_backup_id:
            base_backup_id = await self.get_last_full_backup()
        
        base_lsn = await self.get_backup_lsn(base_backup_id)
        
        # 导出增量WAL
        wal_files = await self.db_backup.export_wal_since(base_lsn)
        
        # 上传WAL文件
        for wal_file in wal_files:
            storage_path = f"incremental/{backup_id}/{wal_file.name}"
            await self.storage.upload(wal_file, storage_path)
        
        # 记录增量备份
        await self.record_incremental_backup(backup_id, base_backup_id, wal_files)
        
        return backup_id
    
    # 3. 数据库恢复
    async def restore_database(self, backup_id, target_time=None, target_instance=None):
        """
        恢复数据库到指定时间点
        """
        # 获取备份信息
        backup_info = await self.get_backup_info(backup_id)
        
        # 1. 恢复全量备份
        full_backup_path = await self.storage.download(backup_info.storage_path)
        decrypted = await self.decrypt(full_backup_path)
        decompressed = await self.decompress(decrypted)
        
        await self.db_backup.restore_full(decompressed, target_instance)
        
        # 2. 应用增量备份 (如果有)
        if target_time:
            incremental_backups = await self.get_incremental_backups(backup_id, target_time)
            for inc_backup in incremental_backups:
                await self.db_backup.apply_wal(inc_backup, target_instance)
        
        # 3. 验证恢复结果
        await self.verify_restore(target_instance)
        
        logger.info(f"Database restored from backup: {backup_id}")
    
    # 4. 定期备份任务
    async def scheduled_backup_job(self):
        """
        定时备份任务
        """
        # 全量备份 (每周)
        if is_sunday():
            await self.full_backup()
        
        # 增量备份 (每天)
        await self.incremental_backup()
        
        # 清理过期备份
        await self.cleanup_old_backups()
    
    # 5. 备份验证
    async def verify_backup(self, backup_id):
        """
        验证备份完整性
        """
        backup_info = await self.get_backup_info(backup_id)
        
        # 下载备份
        backup_file = await self.storage.download(backup_info.storage_path)
        
        # 验证校验和
        checksum_valid = await self.verify_checksum(backup_file, backup_info.checksum)
        
        # 尝试解压验证
        try:
            decompressed = await self.decompress(backup_file)
            decompress_valid = True
        except:
            decompress_valid = False
        
        return {
            'backup_id': backup_id,
            'checksum_valid': checksum_valid,
            'decompress_valid': decompress_valid,
            'overall_valid': checksum_valid and decompress_valid
        }
```

---

## 八、数据同步方案

### 8.1 实时数据同步

```python
# 实时数据同步引擎 - 伪代码

class RealtimeSyncEngine:
    
    def __init__(self, config):
        self.kafka = KafkaClient(config.kafka)
        self.redis = RedisClient(config.redis)
        self.db = DatabaseClient(config.database)
        self.ws_clients = []  # WebSocket客户端
    
    # 1. 实时数据流处理
    async def process_realtime_stream(self, data_source):
        """
        处理实时数据流
        """
        async for message in self.kafka.consume(f"stock.{data_source}"):
            try:
                # 解析消息
                data = json.loads(message.value)
                
                # 数据验证
                if not self.validate_realtime_data(data):
                    logger.warning(f"Invalid realtime data: {data}")
                    continue
                
                # 写入Redis (亚毫秒级)
                await self.redis.publish(f"realtime:{data_source}", data)
                
                # 更新内存缓存
                self.update_memory_cache(data_source, data)
                
                # 异步写入数据库
                await self.async_db_write(data_source, data)
                
                # 推送到WebSocket客户端
                await self.broadcast_to_clients(data_source, data)
                
            except Exception as e:
                logger.error(f"Realtime processing error: {e}")
    
    # 2. 批量数据同步
    async def batch_sync(self, table, sync_interval=60):
        """
        批量数据同步
        """
        while True:
            try:
                # 获取待同步数据
                pending = await self.get_pending_sync(table)
                
                if pending:
                    # 批量写入
                    await self.db.batch_upsert(table, pending)
                    
                    # 标记为已同步
                    await self.mark_synced(table, pending)
                    
                    logger.info(f"Batch synced {len(pending)} records to {table}")
                
                await asyncio.sleep(sync_interval)
                
            except Exception as e:
                logger.error(f"Batch sync error: {e}")
                await asyncio.sleep(5)
    
    # 3. 双向同步
    async def bidirectional_sync(self, source, target):
        """
        双向数据同步 (用于多数据中心)
        """
        # 监听源端变更
        async for change in source.watch_changes():
            # 应用到目标端
            await target.apply_change(change)
            
        # 监听目标端变更
        async for change in target.watch_changes():
            # 应用到源端
            await source.apply_change(change)
    
    # 4. 冲突解决
    async def resolve_conflict(self, conflict):
        """
        解决数据冲突
        """
        strategies = {
            'last_write_wins': self.last_write_wins,
            'first_write_wins': self.first_write_wins,
            'merge_fields': self.merge_fields,
            'manual_resolution': self.manual_resolution
        }
        
        strategy = strategies.get(conflict.resolution_strategy)
        if strategy:
            return await strategy(conflict)
        else:
            raise ValueError(f"Unknown resolution strategy: {conflict.resolution_strategy}")
```

---

## 九、性能优化策略

### 9.1 查询优化

```yaml
# 查询优化配置

query_optimization:
  # 索引策略
  indexes:
    - table: daily
      indexes:
        - columns: [ts_code, trade_date]
          type: primary
        - columns: [trade_date]
          type: btree
        - columns: [ts_code]
          type: btree
          
    - table: moneyflow
      indexes:
        - columns: [ts_code, trade_date]
          type: primary
        - columns: [net_mf_amount]
          type: btree  # 用于排序
          
    - table: fina_indicator
      indexes:
        - columns: [ts_code, end_date]
          type: primary
        - columns: [end_date]
          type: btree
  
  # 查询缓存策略
  cache:
    hot_queries:
      - pattern: "SELECT * FROM daily WHERE ts_code = ? AND trade_date = ?"
        ttl: 300
      - pattern: "SELECT * FROM stock_basic WHERE ts_code = ?"
        ttl: 3600
      - pattern: "SELECT * FROM kpl_concept ORDER BY hot_value DESC LIMIT 20"
        ttl: 60
  
  # 连接池配置
  connection_pool:
    max_connections: 100
    min_connections: 10
    max_idle_time: 300
    connection_timeout: 30
```

### 9.2 批量处理优化

```python
# 批量处理优化 - 伪代码

class BatchOptimizer:
    
    # 1. 批量插入优化
    async def optimized_batch_insert(self, table, records, batch_size=1000):
        """
        优化的批量插入
        """
        # 使用COPY命令 (PostgreSQL)
        if len(records) > 1000:
            return await self.copy_insert(table, records)
        else:
            return await self.insert_many(table, records, batch_size)
    
    # 2. COPY命令插入
    async def copy_insert(self, table, records):
        """
        使用PostgreSQL COPY命令高速插入
        """
        import io
        import csv
        
        # 构建CSV数据
        output = io.StringIO()
        writer = csv.writer(output)
        
        for record in records:
            writer.writerow(record.values())
        
        output.seek(0)
        
        # 执行COPY
        async with self.db.acquire() as conn:
            await conn.copy_from(
                output, table,
                columns=list(records[0].keys()),
                format='csv'
            )
    
    # 3. 并行处理
    async def parallel_process(self, items, processor, max_workers=10):
        """
        并行处理大量数据
        """
        semaphore = asyncio.Semaphore(max_workers)
        
        async def process_with_limit(item):
            async with semaphore:
                return await processor(item)
        
        tasks = [process_with_limit(item) for item in items]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        return results
```

---

## 十、监控告警方案

### 10.1 监控指标

```yaml
# 监控指标配置

monitoring:
  # 系统指标
  system:
    - name: cpu_usage
      threshold: 80%
      severity: warning
      
    - name: memory_usage
      threshold: 85%
      severity: warning
      
    - name: disk_usage
      threshold: 80%
      severity: warning
      
    - name: network_io
      threshold: 1000MB/s
      severity: info
  
  # 数据库指标
  database:
    - name: connection_count
      threshold: 80
      severity: warning
      
    - name: query_latency_p99
      threshold: 100ms
      severity: warning
      
    - name: slow_query_count
      threshold: 10/min
      severity: warning
      
    - name: replication_lag
      threshold: 5s
      severity: critical
  
  # 缓存指标
  cache:
    - name: hit_rate
      threshold: 90%
      severity: warning
      
    - name: eviction_rate
      threshold: 100/min
      severity: warning
      
    - name: memory_fragmentation
      threshold: 1.5
      severity: info
  
  # 业务指标
  business:
    - name: data_freshness
      threshold: 5m
      severity: critical
      
    - name: update_failure_rate
      threshold: 1%
      severity: warning
      
    - name: api_error_rate
      threshold: 0.1%
      severity: warning
```

### 10.2 告警规则

```yaml
# 告警规则配置

alerts:
  # 数据更新告警
  - name: data_update_delayed
    condition: data_freshness > 10m
    severity: critical
    channels: [sms, email, dingtalk]
    
  - name: data_update_failed
    condition: update_failure_count > 3
    severity: critical
    channels: [sms, email, dingtalk]
    
  # 系统告警
  - name: database_down
    condition: db_connection_failed
    severity: critical
    channels: [sms, phone, email]
    
  - name: cache_cluster_unhealthy
    condition: redis_node_down > 1
    severity: warning
    channels: [email, dingtalk]
    
  # 数据质量告警
  - name: data_quality_degraded
    condition: quality_score < 90
    severity: warning
    channels: [email]
    
  - name: data_corruption_detected
    condition: integrity_check_failed
    severity: critical
    channels: [sms, email, dingtalk]
```

---

## 十一、技术选型建议

| 组件 | 推荐方案 | 备选方案 | 选型理由 |
|-----|---------|---------|---------|
| 主数据库 | PostgreSQL 15 | MySQL 8.0 | 优秀的JSON支持、分区表、并行查询 |
| 缓存 | Redis 7 Cluster | Memcached | 丰富的数据结构、持久化、集群支持 |
| 消息队列 | Apache Kafka | RabbitMQ | 高吞吐、持久化、流处理能力 |
| 对象存储 | MinIO | AWS S3 | 兼容S3 API、高性能、私有化部署 |
| 时序数据库 | TimescaleDB | ClickHouse | PostgreSQL扩展、SQL兼容 |
| 任务调度 | Apache Airflow | Cron + 自研 | 可视化、依赖管理、监控 |
| 监控 | Prometheus + Grafana | Zabbix | 云原生、丰富的生态 |

---

## 十二、总结

本数据管理层设计方案针对股票数据看板的60+张数据表，提供了完整的数据管理解决方案：

### 核心设计亮点：

1. **多级缓存策略**: L1内存 + L2 Redis + L3本地存储，确保亚秒级响应
2. **智能更新机制**: 全量/增量/合并更新策略，针对不同数据类型优化
3. **分区存储管理**: 热/温/冷/归档四级存储，优化成本与性能
4. **数据质量保障**: 完整性、一致性、时效性、准确性四维检查
5. **容灾备份体系**: 主从复制 + 异地备份 + 定期归档，RPO<5分钟
6. **实时监控告警**: 系统/数据库/业务三层监控，及时发现处理问题

### 性能指标目标：

| 指标 | 目标值 |
|-----|-------|
| 热点数据查询 | < 50ms |
| K线数据加载 | < 200ms |
| 实时数据推送 | < 1s |
| 日终数据更新 | < 2h |
| 数据可用性 | 99.99% |
| RPO | < 5分钟 |
| RTO | < 30分钟 |

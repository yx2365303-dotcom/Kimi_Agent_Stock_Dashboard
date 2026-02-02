# 财经资讯中心模块设计文档

## 一、概述

财经资讯中心是股票数据看板的核心功能模块，提供实时财经资讯、个股新闻、公告信息、研报中心、财经日历等综合服务。

## 二、资讯数据结构设计

### 2.1 核心资讯表 (news_core)

```sql
CREATE TABLE news_core (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    news_id         VARCHAR(64) NOT NULL COMMENT '资讯唯一标识',
    title           VARCHAR(512) NOT NULL COMMENT '标题',
    summary         VARCHAR(2000) COMMENT '摘要',
    content         LONGTEXT COMMENT '正文内容',
    content_type    TINYINT DEFAULT 1 COMMENT '内容类型:1-纯文本 2-富文本 3-Markdown',
    
    -- 来源信息
    source_type     TINYINT NOT NULL COMMENT '来源类型:1-官方公告 2-新闻媒体 3-研报 4-社交媒体 5-交易所',
    source_name     VARCHAR(128) COMMENT '来源名称',
    source_url      VARCHAR(1024) COMMENT '原文链接',
    author          VARCHAR(128) COMMENT '作者',
    
    -- 时间信息
    publish_time    DATETIME NOT NULL COMMENT '发布时间',
    crawl_time      DATETIME COMMENT '抓取时间',
    expire_time     DATETIME COMMENT '过期时间',
    
    -- 状态管理
    status          TINYINT DEFAULT 1 COMMENT '状态:0-待审核 1-已发布 2-已下线 3-已删除',
    importance      TINYINT DEFAULT 3 COMMENT '重要程度:1-紧急 2-重要 3-普通 4-低',
    
    -- 统计字段
    view_count      INT DEFAULT 0 COMMENT '阅读数',
    like_count      INT DEFAULT 0 COMMENT '点赞数',
    share_count     INT DEFAULT 0 COMMENT '分享数',
    comment_count   INT DEFAULT 0 COMMENT '评论数',
    
    -- 元数据
    tags            JSON COMMENT '标签数组',
    stocks          JSON COMMENT '关联股票代码数组',
    industries      JSON COMMENT '关联行业数组',
    concepts        JSON COMMENT '关联概念数组',
    
    -- 扩展字段
    extra_data      JSON COMMENT '扩展数据',
    
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_publish_time (publish_time),
    INDEX idx_source_type (source_type),
    INDEX idx_status (status),
    INDEX idx_importance (importance),
    UNIQUE KEY uk_news_id (news_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='核心资讯表';
```

### 2.2 快讯表 (news_flash)

```sql
CREATE TABLE news_flash (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    flash_id        VARCHAR(64) NOT NULL COMMENT '快讯ID',
    content         VARCHAR(2000) NOT NULL COMMENT '快讯内容',
    source_type     TINYINT NOT NULL COMMENT '来源类型',
    source_name     VARCHAR(128),
    
    -- 分类信息
    category        VARCHAR(64) COMMENT '快讯分类',
    sub_category    VARCHAR(64) COMMENT '子分类',
    
    -- 关联信息
    related_stocks  JSON COMMENT '关联股票',
    related_tags    JSON COMMENT '关联标签',
    
    -- 推送状态
    push_status     TINYINT DEFAULT 0 COMMENT '推送状态:0-未推送 1-已推送 2-推送失败',
    push_time       DATETIME COMMENT '推送时间',
    
    -- 时间
    publish_time    DATETIME NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_publish_time (publish_time),
    INDEX idx_category (category),
    INDEX idx_push_status (push_status),
    UNIQUE KEY uk_flash_id (flash_id)
) ENGINE=InnoDB COMMENT='实时快讯表';
```

### 2.3 公告信息表 (announcement)

```sql
CREATE TABLE announcement (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    ann_id          VARCHAR(64) NOT NULL COMMENT '公告ID',
    ts_code         VARCHAR(20) NOT NULL COMMENT '股票代码',
    stock_name      VARCHAR(128) COMMENT '股票名称',
    
    -- 公告内容
    title           VARCHAR(512) NOT NULL,
    ann_type        VARCHAR(64) COMMENT '公告类型',
    ann_sub_type    VARCHAR(64) COMMENT '公告子类型',
    content         LONGTEXT COMMENT '公告内容',
    file_url        VARCHAR(1024) COMMENT 'PDF文件链接',
    
    -- 来源信息
    source          VARCHAR(128) COMMENT '公告来源',
    ann_date        DATE NOT NULL COMMENT '公告日期',
    
    -- 重要程度
    importance      TINYINT DEFAULT 3 COMMENT '重要程度',
    
    -- 关联数据
    related_anns    JSON COMMENT '相关公告',
    
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_ts_code (ts_code),
    INDEX idx_ann_date (ann_date),
    INDEX idx_ann_type (ann_type),
    INDEX idx_importance (importance),
    UNIQUE KEY uk_ann_id (ann_id)
) ENGINE=InnoDB COMMENT='公告信息表';
```

### 2.4 研报表 (research_report)

```sql
CREATE TABLE research_report (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    report_id       VARCHAR(64) NOT NULL COMMENT '研报ID',
    
    -- 基本信息
    title           VARCHAR(512) NOT NULL COMMENT '研报标题',
    summary         VARCHAR(4000) COMMENT '研报摘要',
    org_name        VARCHAR(128) COMMENT '研究机构',
    author          VARCHAR(128) COMMENT '分析师',
    
    -- 评级信息
    rating          VARCHAR(32) COMMENT '评级',
    rating_change   VARCHAR(32) COMMENT '评级变动',
    pre_rating      VARCHAR(32) COMMENT '上期评级',
    
    -- 目标价/盈利预测
    target_price    DECIMAL(10,2) COMMENT '目标价',
    pre_target_price DECIMAL(10,2) COMMENT '上期目标价',
    eps_forecast    DECIMAL(10,4) COMMENT '预测每股收益',
    pe_forecast     DECIMAL(10,2) COMMENT '预测市盈率',
    
    -- 关联股票
    ts_code         VARCHAR(20) NOT NULL COMMENT '股票代码',
    stock_name      VARCHAR(128) COMMENT '股票名称',
    industry        VARCHAR(64) COMMENT '所属行业',
    
    -- 报告信息
    report_date     DATE NOT NULL COMMENT '报告日期',
    pages           INT COMMENT '页数',
    file_url        VARCHAR(1024) COMMENT 'PDF链接',
    
    -- 统计
    read_count      INT DEFAULT 0,
    download_count  INT DEFAULT 0,
    
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_ts_code (ts_code),
    INDEX idx_report_date (report_date),
    INDEX idx_org_name (org_name),
    INDEX idx_rating (rating),
    UNIQUE KEY uk_report_id (report_id)
) ENGINE=InnoDB COMMENT='研报表';
```

### 2.5 财经日历表 (finance_calendar)

```sql
CREATE TABLE finance_calendar (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    event_id        VARCHAR(64) NOT NULL COMMENT '事件ID',
    
    -- 事件信息
    event_type      VARCHAR(64) NOT NULL COMMENT '事件类型',
    event_name      VARCHAR(256) NOT NULL COMMENT '事件名称',
    event_desc      VARCHAR(2000) COMMENT '事件描述',
    
    -- 关联信息
    ts_code         VARCHAR(20) COMMENT '关联股票代码',
    stock_name      VARCHAR(128) COMMENT '股票名称',
    
    -- 时间
    event_date      DATE NOT NULL COMMENT '事件日期',
    event_time      TIME COMMENT '事件时间',
    
    -- 重要性
    importance      TINYINT DEFAULT 2 COMMENT '重要程度:1-高 2-中 3-低',
    
    -- 状态
    status          TINYINT DEFAULT 0 COMMENT '状态:0-未开始 1-进行中 2-已结束',
    
    -- 提醒设置
    remind_time     DATETIME COMMENT '提醒时间',
    remind_sent     TINYINT DEFAULT 0 COMMENT '提醒是否已发送',
    
    -- 扩展数据
    extra_data      JSON COMMENT '扩展数据',
    
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_event_date (event_date),
    INDEX idx_event_type (event_type),
    INDEX idx_ts_code (ts_code),
    INDEX idx_importance (importance),
    UNIQUE KEY uk_event_id (event_id)
) ENGINE=InnoDB COMMENT='财经日历表';
```

### 2.6 用户自选股资讯表 (user_watchlist_news)

```sql
CREATE TABLE user_watchlist_news (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id         BIGINT NOT NULL COMMENT '用户ID',
    news_id         VARCHAR(64) NOT NULL COMMENT '资讯ID',
    
    -- 关联股票
    ts_code         VARCHAR(20) NOT NULL COMMENT '股票代码',
    
    -- 阅读状态
    is_read         TINYINT DEFAULT 0 COMMENT '是否已读',
    read_time       DATETIME COMMENT '阅读时间',
    
    -- 收藏状态
    is_favorite     TINYINT DEFAULT 0 COMMENT '是否收藏',
    favorite_time   DATETIME COMMENT '收藏时间',
    
    -- 推送状态
    is_pushed       TINYINT DEFAULT 0 COMMENT '是否已推送',
    push_time       DATETIME COMMENT '推送时间',
    
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_ts_code (ts_code),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    UNIQUE KEY uk_user_news (user_id, news_id)
) ENGINE=InnoDB COMMENT='用户自选股资讯表';
```

### 2.7 资讯标签表 (news_tag)

```sql
CREATE TABLE news_tag (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    tag_id          VARCHAR(64) NOT NULL COMMENT '标签ID',
    tag_name        VARCHAR(64) NOT NULL COMMENT '标签名称',
    tag_type        TINYINT NOT NULL COMMENT '标签类型:1-系统 2-自动 3-人工',
    category        VARCHAR(64) COMMENT '标签分类',
    parent_id       VARCHAR(64) COMMENT '父标签ID',
    level           TINYINT DEFAULT 1 COMMENT '标签层级',
    weight          INT DEFAULT 0 COMMENT '权重',
    is_hot          TINYINT DEFAULT 0 COMMENT '是否热门',
    use_count       INT DEFAULT 0 COMMENT '使用次数',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_tag_type (tag_type),
    INDEX idx_category (category),
    INDEX idx_is_hot (is_hot),
    UNIQUE KEY uk_tag_name (tag_name)
) ENGINE=InnoDB COMMENT='资讯标签表';
```

### 2.8 资讯股票关联表 (news_stock_relation)

```sql
CREATE TABLE news_stock_relation (
    id              BIGINT PRIMARY KEY AUTO_INCREMENT,
    news_id         VARCHAR(64) NOT NULL COMMENT '资讯ID',
    ts_code         VARCHAR(20) NOT NULL COMMENT '股票代码',
    stock_name      VARCHAR(128) COMMENT '股票名称',
    
    -- 关联强度
    relevance_score DECIMAL(5,4) COMMENT '关联度得分(0-1)',
    
    -- 关联类型
    relation_type   VARCHAR(32) COMMENT '关联类型:主体/提及/行业/概念',
    
    -- 情感分析
    sentiment       TINYINT COMMENT '情感:1-正面 0-中性 -1-负面',
    sentiment_score DECIMAL(5,4) COMMENT '情感得分',
    
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_news_id (news_id),
    INDEX idx_ts_code (ts_code),
    INDEX idx_relevance (relevance_score),
    INDEX idx_sentiment (sentiment),
    UNIQUE KEY uk_news_stock (news_id, ts_code)
) ENGINE=InnoDB COMMENT='资讯股票关联表';
```

## 三、分类标签体系设计

### 3.1 资讯分类体系（三级分类）

```
资讯分类树
├── 市场动态
│   ├── 大盘走势
│   ├── 板块轮动
│   ├── 资金流向
│   └── 市场情绪
├── 个股资讯
│   ├── 公司新闻
│   ├── 业绩快报
│   ├── 重大事项
│   └── 股价异动
├── 公告信息
│   ├── 定期报告
│   │   ├── 年度报告
│   │   ├── 半年度报告
│   │   └── 季度报告
│   ├── 重大事项
│   │   ├── 并购重组
│   │   ├── 股权变动
│   │   ├── 重大合同
│   │   └── 诉讼仲裁
│   ├── 融资公告
│   │   ├── 增发配股
│   │   ├── 债券发行
│   │   └── 股权激励
│   └── 其他公告
│       ├── 高管变动
│       ├── 分红送转
│       └── 停牌复牌
├── 研究报告
│   ├── 个股研报
│   ├── 行业研报
│   ├── 策略研报
│   └── 宏观研报
├── 财经日历
│   ├── 财报披露
│   ├── 股东大会
│   ├── 新股申购
│   └── 宏观数据
└── 监管动态
    ├── 政策法规
    ├── 监管函件
    └── 问询回复
```

### 3.2 标签体系设计

| 标签类别 | 标签名称 | 说明 |
|---------|---------|------|
| **股票** | 个股标签 | 600519.SH, 000001.SZ 等 |
| **行业** | 行业标签 | 银行、保险、证券、医药、科技等 |
| **概念** | 概念标签 | 人工智能、新能源、芯片、5G等 |
| **地区** | 地区标签 | 北京、上海、广东、浙江等 |
| **市场** | 市场标签 | 主板、创业板、科创板、北交所 |
| **事件** | 事件标签 | 业绩预增、高送转、股权激励等 |

### 3.3 标签权重算法

```python
def calculate_tag_weight(tag, news_content, stock_context):
    # 标签权重 = 基础权重 + 内容匹配度 + 时效性 + 热度
    base_weight = TAG_BASE_WEIGHTS.get(tag, 0.5)
    content_score = tfidf_similarity(tag, news_content)
    time_factor = 1.0 if news_age < 1 else 0.9 ** news_age
    hot_factor = hot_tags.get(tag, 1.0)
    final_weight = base_weight * 0.3 + content_score * 0.4 + time_factor * 0.2 + hot_factor * 0.1
    return final_weight
```

## 四、推送机制设计

### 4.1 推送架构

```
┌─────────────────────────────────────────────────────────────┐
│                      推送服务架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  资讯抓取   │───▶│  内容处理   │───▶│  消息队列   │     │
│  │  (Crawler)  │    │  (Process)  │    │   (Kafka)   │     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │
│                                                │            │
│                       ┌────────────────────────┘            │
│                       ▼                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    推送规则引擎                       │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │   │
│  │  │ 快讯规则 │ │ 个股规则 │ │ 自选股   │            │   │
│  │  └──────────┘ └──────────┘ └──────────┘            │   │
│  └─────────────────────┬───────────────────────────────┘   │
│                        │                                    │
│         ┌──────────────┼──────────────┐                    │
│         ▼              ▼              ▼                    │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐               │
│  │ WebSocket│   │   APP    │   │  短信    │               │
│  │   推送   │   │  推送    │   │  通知    │               │
│  └──────────┘   └──────────┘   └──────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 推送规则配置

```json
{
  "push_rules": {
    "flash_news": {
      "enabled": true,
      "priority": "high",
      "channels": ["websocket", "app"],
      "conditions": {
        "importance": ["emergency", "high"],
        "categories": ["市场异动", "重大公告", "突发新闻"]
      },
      "rate_limit": {
        "max_per_minute": 10,
        "cooldown_seconds": 30
      }
    },
    "watchlist": {
      "enabled": true,
      "priority": "normal",
      "channels": ["websocket", "app"],
      "conditions": {
        "stock_in_watchlist": true,
        "importance": ["high", "normal"],
        "categories": ["公告", "研报", "新闻"]
      },
      "digest": {
        "enabled": true,
        "interval_minutes": 30,
        "max_items": 20
      }
    },
    "holding": {
      "enabled": true,
      "priority": "high",
      "channels": ["websocket", "app", "sms"],
      "conditions": {
        "stock_in_position": true,
        "importance": ["emergency", "high"],
        "categories": ["重大公告", "业绩预告", "股权变动"]
      }
    }
  }
}
```

### 4.3 推送优先级算法

```python
class PushPriorityCalculator:
    PRIORITY_SCORES = {
        'emergency': 100,
        'high': 75,
        'normal': 50,
        'low': 25
    }

    def calculate(self, news, user_context):
        score = 0
        score += self.PRIORITY_SCORES.get(news.importance, 50)
        if news.ts_code in user_context.holdings:
            score += 50
        elif news.ts_code in user_context.watchlist:
            score += 30
        score += self._interest_match_score(news, user_context.interests)
        age_hours = (datetime.now() - news.publish_time).total_seconds() / 3600
        score += max(0, 20 - age_hours * 2)
        score += min(20, news.hot_score / 10)
        return score
```

### 4.4 推送去重策略

```python
class PushDeduplication:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.dedup_window = 3600

    def is_duplicate(self, news_id, user_id):
        key = f"push:dedup:{user_id}:{news_id}"
        return self.redis.exists(key)

    def mark_pushed(self, news_id, user_id):
        key = f"push:dedup:{user_id}:{news_id}"
        self.redis.setex(key, self.dedup_window, 1)
```

## 五、搜索和筛选方案设计

### 5.1 搜索架构

```
┌─────────────────────────────────────────────────────────────┐
│                      搜索服务架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                   搜索接入层                           │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │ │
│  │  │关键词搜索│ │高级筛选 │ │语义搜索 │ │智能推荐 │     │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │ │
│  └────────────────────────┬──────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼──────────────────────────────┐ │
│  │                   搜索引擎层 (Elasticsearch)            │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │ │
│  │  │分词索引 │ │倒排索引 │ │向量索引 │ │聚合分析 │     │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │ │
│  └────────────────────────┬──────────────────────────────┘ │
│                           │                                  │
│  ┌────────────────────────▼──────────────────────────────┐ │
│  │                   数据层                               │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │ │
│  │  │资讯数据 │ │标签数据 │ │股票数据 │ │用户数据 │     │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Elasticsearch索引设计

```json
{
  "mappings": {
    "properties": {
      "news_id": { "type": "keyword" },
      "title": { 
        "type": "text",
        "analyzer": "ik_max_word",
        "search_analyzer": "ik_smart",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "summary": { 
        "type": "text",
        "analyzer": "ik_max_word"
      },
      "content": { 
        "type": "text",
        "analyzer": "ik_max_word"
      },
      "source_type": { "type": "integer" },
      "source_name": { "type": "keyword" },
      "publish_time": { "type": "date" },
      "importance": { "type": "integer" },
      "status": { "type": "integer" },
      "tags": { "type": "keyword" },
      "stocks": { "type": "keyword" },
      "industries": { "type": "keyword" },
      "concepts": { "type": "keyword" },
      "sentiment": { "type": "integer" },
      "view_count": { "type": "integer" },
      "category": { "type": "keyword" },
      "sub_category": { "type": "keyword" },
      "title_vector": { 
        "type": "dense_vector", 
        "dims": 768 
      }
    }
  },
  "settings": {
    "number_of_shards": 5,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "ik_custom": {
          "type": "custom",
          "tokenizer": "ik_max_word",
          "filter": ["lowercase", "synonym_filter"]
        }
      },
      "filter": {
        "synonym_filter": {
          "type": "synonym",
          "synonyms": [
            "茅台, 600519, 贵州茅台",
            "平安, 000001, 中国平安",
            "业绩, 盈利, 利润, 收益"
          ]
        }
      }
    }
  }
}
```

### 5.3 搜索API设计

```python
class NewsSearchService:
    def search(self, query_params: SearchQuery) -> SearchResult:
        search_body = {
            "query": self._build_query(query_params),
            "sort": self._build_sort(query_params),
            "from": (query_params.page - 1) * query_params.page_size,
            "size": query_params.page_size,
            "aggs": self._build_aggregations()
        }
        response = self.es.search(index="news_index", body=search_body)
        return self._parse_response(response)

    def _build_query(self, params):
        must_clauses = []
        filter_clauses = []
        
        if params.keyword:
            must_clauses.append({
                "multi_match": {
                    "query": params.keyword,
                    "fields": ["title^3", "summary^2", "content", "tags^2"],
                    "type": "best_fields",
                    "fuzziness": "AUTO"
                }
            })
        
        if params.source_types:
            filter_clauses.append({"terms": {"source_type": params.source_types}})
        if params.stocks:
            filter_clauses.append({"terms": {"stocks": params.stocks}})
        if params.tags:
            filter_clauses.append({"terms": {"tags": params.tags}})
        if params.date_range:
            filter_clauses.append({
                "range": {
                    "publish_time": {
                        "gte": params.date_range.start,
                        "lte": params.date_range.end
                    }
                }
            })
        if params.sentiment is not None:
            filter_clauses.append({"term": {"sentiment": params.sentiment}})
        
        return {
            "bool": {
                "must": must_clauses,
                "filter": filter_clauses
            }
        }

    def _build_sort(self, params):
        sort_rules = []
        if params.sort_by == "relevance":
            sort_rules.append("_score")
        elif params.sort_by == "time":
            sort_rules.append({"publish_time": "desc"})
        elif params.sort_by == "hot":
            sort_rules.append({"view_count": "desc"})
        elif params.sort_by == "importance":
            sort_rules.append({"importance": "asc"})
        if not sort_rules:
            sort_rules.append({"publish_time": "desc"})
        return sort_rules
```

### 5.4 高级筛选条件

| 筛选类型 | 选项 | 说明 |
|---------|------|------|
| **时间范围** | 今日/昨日/近7天/近30天/近90天 | 按发布时间筛选 |
| **重要程度** | 紧急/重要/普通/低 | 按重要性筛选 |
| **情感倾向** | 正面/中性/负面 | 按情感分析筛选 |
| **来源类型** | 官方公告/新闻媒体/研报/社交媒体/交易所 | 按来源筛选 |
| **是否有附件** | 是/否 | 筛选带PDF附件的公告 |

## 六、与个股关联逻辑设计

### 6.1 关联识别流程

```
┌─────────────────────────────────────────────────────────────┐
│                    资讯-个股关联识别流程                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐ │
│  │ 资讯输入  │──▶│ 预处理   │──▶│ 实体识别 │──▶│ 关联计算 │ │
│  └──────────┘   └──────────┘   └──────────┘   └─────┬────┘ │
│                                                      │      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐         │      │
│  │ 结果输出  │◀──│ 权重排序 │◀──│ 关联验证 │◀────────┘      │
│  └──────────┘   └──────────┘   └──────────┘                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 实体识别算法

```python
class StockEntityRecognizer:
    def __init__(self):
        self.stock_dict = self._load_stock_dictionary()
        self.ner_model = self._load_ner_model()

    def recognize(self, text: str):
        entities = []
        dict_entities = self._dictionary_match(text)
        entities.extend(dict_entities)
        ner_entities = self._ner_recognize(text)
        entities.extend(ner_entities)
        fuzzy_entities = self._fuzzy_match(text)
        entities.extend(fuzzy_entities)
        entities = self._merge_entities(entities)
        return entities

    def _dictionary_match(self, text):
        entities = []
        for stock_code, stock_info in self.stock_dict.items():
            if stock_code in text:
                entities.append({
                    "code": stock_code,
                    "name": stock_info["name"],
                    "match_type": "code_exact"
                })
            if stock_info["name"] in text:
                entities.append({
                    "code": stock_code,
                    "name": stock_info["name"],
                    "match_type": "name_exact"
                })
        return entities
```

### 6.3 关联度计算

```python
class RelevanceCalculator:
    def calculate_relevance(self, news, stock):
        scores = []
        # 标题关联度 (权重: 0.35)
        title_score = self._title_relevance(news.title, stock)
        scores.append(("title", title_score, 0.35))
        # 正文关联度 (权重: 0.30)
        content_score = self._content_relevance(news.content, stock)
        scores.append(("content", content_score, 0.30))
        # 位置关联度 (权重: 0.15)
        position_score = self._position_relevance(news, stock)
        scores.append(("position", position_score, 0.15))
        # 频次关联度 (权重: 0.10)
        frequency_score = self._frequency_relevance(news, stock)
        scores.append(("frequency", frequency_score, 0.10))
        # 上下文关联度 (权重: 0.10)
        context_score = self._context_relevance(news, stock)
        scores.append(("context", context_score, 0.10))
        total_score = sum(score * weight for _, score, weight in scores)
        return min(1.0, total_score)

    def _title_relevance(self, title, stock):
        if stock["name"] in title or stock["code"] in title:
            return 1.0
        keywords = stock.get("keywords", [])
        match_count = sum(1 for kw in keywords if kw in title)
        return min(1.0, match_count * 0.3)
```

## 七、资讯聚合策略设计

### 7.1 聚合架构

```
┌─────────────────────────────────────────────────────────────┐
│                      资讯聚合架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                     原始资讯流                         │ │
│  └─────────────────────────┬─────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼─────────────────────────────┐ │
│  │                   清洗去重层                           │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │ │
│  │  │格式标准化│ │内容去重 │ │垃圾过滤 │ │敏感过滤 │     │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │ │
│  └─────────────────────────┬─────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼─────────────────────────────┐ │
│  │                   内容理解层                           │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │ │
│  │  │实体识别 │ │情感分析 │ │标签提取 │ │分类识别 │     │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │ │
│  └─────────────────────────┬─────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼─────────────────────────────┐ │
│  │                   聚合输出层                           │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │ │
│  │  │快讯聚合 │ │专题聚合 │ │个股聚合 │ │时间线   │     │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 去重策略

```python
class NewsDeduplicationService:
    def __init__(self):
        self.redis = Redis()
        self.simhash_threshold = 3
        self.minhash_threshold = 0.85

    def deduplicate(self, news_list):
        unique_news = self._url_dedup(news_list)
        unique_news = self._title_exact_dedup(unique_news)
        unique_news = self._content_similarity_dedup(unique_news)
        clustered_news = self._event_clustering(unique_news)
        return clustered_news

    def _url_dedup(self, news_list):
        seen_urls = set()
        unique_news = []
        for news in news_list:
            url_key = self._normalize_url(news.source_url)
            if url_key not in seen_urls:
                seen_urls.add(url_key)
                unique_news.append(news)
        return unique_news

    def _content_similarity_dedup(self, news_list):
        unique_news = []
        simhash_index = SimHashIndex()
        for news in news_list:
            content_hash = SimHash(news.title + news.summary)
            similar_hashes = simhash_index.get_near_dups(content_hash, self.simhash_threshold)
            if not similar_hashes:
                unique_news.append(news)
                simhash_index.add(content_hash, news.news_id)
        return unique_news
```

### 7.3 快讯聚合

```python
class FlashNewsAggregator:
    def aggregate(self, flash_news_list, time_window=300):
        aggregated = []
        current_group = []
        for news in sorted(flash_news_list, key=lambda x: x.publish_time):
            if not current_group:
                current_group.append(news)
            else:
                last_news = current_group[-1]
                time_diff = (news.publish_time - last_news.publish_time).total_seconds()
                if time_diff <= time_window and self._is_same_event(news, last_news):
                    current_group.append(news)
                else:
                    aggregated.append(self._create_flash_group(current_group))
                    current_group = [news]
        if current_group:
            aggregated.append(self._create_flash_group(current_group))
        return aggregated
```

### 7.4 个股资讯聚合

```python
class StockNewsAggregator:
    def aggregate_by_stock(self, ts_code, news_list, days=7):
        stock_news = [n for n in news_list if ts_code in n.stocks]
        daily_news = defaultdict(list)
        for news in stock_news:
            date_key = news.publish_time.strftime("%Y-%m-%d")
            daily_news[date_key].append(news)
        result = []
        for date, news_list in sorted(daily_news.items(), reverse=True):
            daily_summary = self._generate_daily_summary(ts_code, date, news_list)
            result.append(daily_summary)
        return result
```

### 7.5 专题聚合

```python
class TopicAggregator:
    def create_topic(self, seed_news, related_news):
        topic = {
            "topic_id": f"topic_{uuid.uuid4().hex[:8]}",
            "title": self._generate_topic_title(seed_news, related_news),
            "summary": self._generate_topic_summary(seed_news, related_news),
            "start_time": min(n.publish_time for n in related_news),
            "end_time": max(n.publish_time for n in related_news),
            "news_count": len(related_news),
            "stocks_involved": list(set(s for n in related_news for s in n.stocks)),
            "timeline": self._build_timeline(related_news)
        }
        return topic
```

## 八、智能推荐设计

### 8.1 推荐架构

```
┌─────────────────────────────────────────────────────────────┐
│                      推荐系统架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                    特征工程层                          │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │ │
│  │  │用户画像 │ │内容特征 │ │上下文  │ │实时特征 │     │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │ │
│  └─────────────────────────┬─────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼─────────────────────────────┐ │
│  │                    召回层                              │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐     │ │
│  │  │协同过滤 │ │内容召回 │ │热榜召回 │ │规则召回 │     │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘     │ │
│  └─────────────────────────┬─────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼─────────────────────────────┐ │
│  │                    排序层                              │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐                 │ │
│  │  │精排模型 │ │规则干预 │ │多样性   │                 │ │
│  │  └─────────┘ └─────────┘ └─────────┘                 │ │
│  └─────────────────────────┬─────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼─────────────────────────────┐ │
│  │                    输出层                              │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 用户画像

```python
class UserProfile:
    def __init__(self, user_id):
        self.user_id = user_id
        self.profile_data = self._load_profile()

    def _load_profile(self):
        return {
            "basic": {
                "register_time": None,
                "last_active": None
            },
            "interests": {
                "stocks": {},
                "industries": {},
                "concepts": {},
                "tags": {}
            },
            "behavior": {
                "read_history": [],
                "search_history": [],
                "click_patterns": {}
            },
            "holdings": [],
            "watchlist": []
        }

    def update_from_behavior(self, behavior_event):
        if behavior_event.type == "read":
            self._update_read_interest(behavior_event)
        elif behavior_event.type == "search":
            self._update_search_interest(behavior_event)
```

### 8.3 推荐算法

```python
class NewsRecommendationEngine:
    def __init__(self):
        self.user_profile_service = UserProfileService()
        self.recall_strategies = [
            CollaborativeFilteringRecall(),
            ContentBasedRecall(),
            HotNewsRecall(),
            RuleBasedRecall()
        ]
        self.rank_model = RankingModel()

    def recommend(self, user_id, context, num_results=20):
        user_profile = self.user_profile_service.get_profile(user_id)
        recall_results = []
        for strategy in self.recall_strategies:
            results = strategy.recall(user_profile, context, num_results * 3)
            recall_results.extend(results)
        unique_results = self._deduplicate(recall_results)
        ranked_results = self.rank_model.rank(unique_results, user_profile, context)
        diverse_results = self._ensure_diversity(ranked_results, num_results)
        final_results = self._apply_business_rules(diverse_results, user_profile)
        return final_results[:num_results]

    def _ensure_diversity(self, results, num_results):
        diverse_results = []
        category_count = defaultdict(int)
        for item in results:
            category = item.category
            if category_count[category] >= num_results // 5:
                continue
            diverse_results.append(item)
            category_count[category] += 1
            if len(diverse_results) >= num_results:
                break
        return diverse_results
```

## 九、API接口设计

### 9.1 资讯查询接口

```
GET /api/news/list
参数:
  - keyword: 关键词搜索
  - stocks: 股票代码(多个用逗号分隔)
  - tags: 标签筛选
  - source_types: 来源类型
  - date_from/date_to: 日期范围
  - importance: 重要程度
  - sentiment: 情感倾向
  - sort_by: 排序方式(time/hot/importance/relevance)
  - page: 页码
  - page_size: 每页数量
```

### 9.2 快讯接口

```
GET /api/news/flash
参数:
  - stocks: 关注的股票
  - categories: 快讯分类
  - limit: 返回数量

WebSocket: /ws/news/flash
实时推送快讯消息
```

### 9.3 个股资讯接口

```
GET /api/news/stock/{ts_code}
参数:
  - days: 查询天数(默认7天)
  - types: 资讯类型(news/announcement/report)
  - page: 页码
```

### 9.4 财经日历接口

```
GET /api/calendar/events
参数:
  - date_from/date_to: 日期范围
  - event_types: 事件类型
  - ts_code: 股票代码
  - importance: 重要程度
```

## 十、数据同步与更新策略

### 10.1 增量同步机制

```python
class NewsSyncService:
    def __init__(self):
        self.last_sync_time = None
        self.batch_size = 1000

    def incremental_sync(self):
        last_time = self.get_last_sync_time()
        new_news = self.fetch_news_after(last_time, self.batch_size)
        for news in new_news:
            cleaned_news = self.clean_content(news)
            entities = self.recognize_entities(cleaned_news)
            sentiment = self.analyze_sentiment(cleaned_news)
            tags = self.extract_tags(cleaned_news)
            self.save_news(cleaned_news, entities, sentiment, tags)
            self.index_to_es(cleaned_news)
        self.update_last_sync_time()
```

### 10.2 缓存策略

```python
class NewsCacheService:
    CACHE_KEYS = {
        "hot_news": "news:hot:{date}",
        "flash_news": "news:flash:{date}",
        "stock_news": "news:stock:{ts_code}:{date}",
        "tag_news": "news:tag:{tag}:{date}",
        "search_result": "news:search:{hash}",
        "user_recommend": "news:rec:{user_id}"
    }
    
    TTL = {
        "hot_news": 300,
        "flash_news": 60,
        "stock_news": 600,
        "tag_news": 600,
        "search_result": 300,
        "user_recommend": 1800
    }
```

## 十一、与现有数据表关联

### 11.1 关联关系图

```
┌─────────────────────────────────────────────────────────────┐
│                    资讯中心数据关联                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐         ┌─────────────┐                   │
│  │ news_core   │◀───────▶│ stock_basic │                   │
│  └──────┬──────┘         └──────┬──────┘                   │
│         │                       │                           │
│         │         ┌─────────────┘                           │
│         │         │                                         │
│         ▼         ▼                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │announcement │  │stk_managers │  │disclosure_  │         │
│  └─────────────┘  └─────────────┘  │    date     │         │
│                                     └─────────────┘         │
│  ┌─────────────┐         ┌─────────────┐                   │
│  │research_    │◀───────▶│ report_rc   │                   │
│  │  report     │         └─────────────┘                   │
│  └─────────────┘                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 11.2 关联使用场景

| 资讯类型 | 关联表 | 使用场景 |
|---------|-------|---------|
| **个股新闻** | stock_basic, stock_company | 获取股票基本信息、公司简介 |
| **公告** | disclosure_date | 关联财报披露计划 |
| **研报** | report_rc | 关联盈利预测数据 |
| **快讯** | top_list, hm_detail | 关联龙虎榜、游资数据 |
| **管理层** | stk_managers, stk_rewards | 关联管理层信息和薪酬持股 |
| **股东变动** | stk_holdertrade | 关联股东增减持信息 |

---

**文档版本**: 1.0  
**更新日期**: 2024年  
**作者**: 财经资讯产品架构师

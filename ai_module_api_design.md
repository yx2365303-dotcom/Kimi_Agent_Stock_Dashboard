# AI行情分析模块 - API接口设计

## 1. 接口概览

```
Base URL: /api/v1/ai
Authentication: Bearer Token
Content-Type: application/json
```

## 2. 行情诊断接口

### 2.1 获取股票综合诊断

```http
GET /api/v1/ai/diagnosis/{ts_code}
```

**请求参数**：
```json
{
  "ts_code": "600519.SH",    // 股票代码 (必填)
  "force_refresh": false,    // 是否强制刷新缓存
  "detail_level": "full"     // 详细程度: brief/standard/full
}
```

**响应示例**：
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "ts_code": "600519.SH",
    "stock_name": "贵州茅台",
    "analysis_date": "2024-01-15",
    "overall": {
      "score": 78,
      "rating": "推荐持有",
      "rating_code": "BUY"
    },
    "technical": {
      "score": 75,
      "summary": "MACD金叉形成，短期动能转强",
      "signals": [
        {"name": "MACD", "signal": "bullish", "description": "金叉形成"},
        {"name": "KDJ", "signal": "neutral", "description": "K值68，未超买"},
        {"name": "RSI", "signal": "bullish", "description": "RSI6=65，强势"}
      ],
      "support_resistance": {
        "support": 1650.0,
        "resistance": 1800.0
      },
      "trend": {
        "short": "上涨",
        "medium": "震荡",
        "long": "上涨"
      }
    },
    "fundamental": {
      "score": 82,
      "summary": "盈利能力优异，品牌价值稳固",
      "strengths": [
        "ROE维持25%以上",
        "毛利率91.5%",
        "营收增速15%"
      ],
      "concerns": [
        "估值处于历史高位"
      ],
      "peer_comparison": "行业领先"
    },
    "capital": {
      "score": 68,
      "summary": "主力资金净流入，机构关注度提升",
      "flow_trend": "流入",
      "institutional_activity": "积极",
      "net_inflow_5d": 12000.5,
      "net_inflow_20d": 45000.0
    },
    "risks": [
      {
        "level": "medium",
        "type": "valuation",
        "description": "估值处于历史85%分位"
      }
    ],
    "confidence": {
      "level": "high",
      "score": 0.85,
      "factors": {
        "data_completeness": 0.98,
        "model_accuracy": 0.82,
        "market_regime": 0.80
      }
    },
    "next_update": "2024-01-16T09:30:00"
  }
}
```

### 2.2 批量获取诊断

```http
POST /api/v1/ai/diagnosis/batch
```

**请求体**：
```json
{
  "ts_codes": ["600519.SH", "000858.SZ", "000568.SZ"],
  "detail_level": "standard"
}
```

## 3. 研报解读接口

### 3.1 获取研报分析

```http
GET /api/v1/ai/research/{ts_code}
```

**请求参数**：
```json
{
  "ts_code": "300750.SZ",
  "days": 30,              // 分析最近N天的研报
  "min_rating_count": 3    // 最少需要几家机构评级
}
```

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "ts_code": "300750.SZ",
    "stock_name": "宁德时代",
    "analysis_period": "2023-12-16 至 2024-01-15",
    "report_count": 15,
    "consensus": {
      "rating": "买入",
      "rating_distribution": {
        "买入": 10,
        "增持": 4,
        "中性": 1,
        "减持": 0,
        "卖出": 0
      },
      "rating_score": 4.6
    },
    "target_price": {
      "avg": 245.5,
      "min": 210.0,
      "max": 280.0,
      "current": 175.0,
      "upside": 40.3
    },
    "earnings_forecast": {
      "eps_2024": {
        "avg": 12.5,
        "min": 11.0,
        "max": 14.0
      },
      "np_2024": {
        "avg": 5500000000,
        "growth": 25.5
      }
    },
    "key_themes": [
      "新能源车渗透率提升",
      "海外市场扩张",
      "储能业务增长"
    ],
    "bull_points": [
      "全球动力电池龙头地位稳固",
      "技术领先优势明显",
      "产能持续扩张"
    ],
    "bear_points": [
      "行业竞争加剧",
      "原材料价格波动风险"
    ],
    "org_accuracy": {
      "中信证券": 0.78,
      "中金公司": 0.75,
      "广发证券": 0.72
    },
    "confidence": 0.82,
    "summary": "机构普遍看好，一致推荐买入，目标价平均245.5元..."
  }
}
```

## 4. 舆情情绪接口

### 4.1 获取情绪分析

```http
GET /api/v1/ai/sentiment/{ts_code}
```

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "ts_code": "002594.SZ",
    "stock_name": "比亚迪",
    "analysis_date": "2024-01-15",
    "overall_sentiment": {
      "level": "乐观",
      "score": 0.65,
      "trend": "上升"
    },
    "dimensions": {
      "news": {
        "score": 0.72,
        "volume": 45,
        "hot_topics": ["新能源车销量", "海外市场"],
        "sentiment_distribution": {
          "positive": 28,
          "neutral": 14,
          "negative": 3
        }
      },
      "institutional": {
        "survey_activity": "高",
        "fund_flow": "流入",
        "dragon_tiger": {
          "appeared": true,
          "net_amount": 25000.0,
          "sentiment": "积极"
        }
      }
    },
    "extreme_signals": [],
    "contrarian_opportunity": false,
    "confidence": 0.75
  }
}
```

## 5. 趋势预测接口

### 5.1 获取趋势预测

```http
GET /api/v1/ai/prediction/{ts_code}
```

**请求参数**：
```json
{
  "ts_code": "600519.SH",
  "horizons": ["short", "medium"]  // 预测周期
}
```

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "ts_code": "600519.SH",
    "stock_name": "贵州茅台",
    "current_price": 1750.0,
    "analysis_date": "2024-01-15",
    "predictions": {
      "short_term": {
        "horizon": "1-5个交易日",
        "direction": "震荡偏强",
        "probability": 0.55,
        "target_range": {
          "low": 1730.0,
          "high": 1800.0
        },
        "key_factors": [
          "技术面MACD金叉支撑",
          "节前消费预期"
        ],
        "risks": [
          "大盘系统性风险",
          "获利盘抛压"
        ],
        "uncertainty": "市场环境震荡，需关注量能配合"
      },
      "medium_term": {
        "horizon": "1-4周",
        "direction": "上涨",
        "probability": 0.60,
        "target_range": {
          "low": 1800.0,
          "high": 1950.0
        },
        "catalysts": [
          "年报业绩预期",
          "春节消费旺季"
        ],
        "risks": [
          "消费复苏不及预期",
          "估值回调压力"
        ],
        "uncertainty": "需关注业绩兑现情况"
      },
      "long_term": {
        "horizon": "1-6月",
        "fair_value": {
          "low": 1700.0,
          "high": 2200.0
        },
        "valuation_opinion": "合理偏低估",
        "uncertainty": "长期预测不确定性较高，仅供参考"
      }
    },
    "confidence_metrics": {
      "model_accuracy": 0.68,
      "data_quality": 0.95,
      "market_regime": "震荡市",
      "overall_confidence": 0.65
    },
    "disclaimer": "本预测仅供参考，不构成投资建议"
  }
}
```

## 6. 风险提示接口

### 6.1 获取风险预警

```http
GET /api/v1/ai/risk/{ts_code}
```

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "ts_code": "002594.SZ",
    "stock_name": "比亚迪",
    "analysis_date": "2024-01-15",
    "risk_level": "medium",
    "risks": {
      "high": [
        {
          "id": "risk_001",
          "type": "technical",
          "name": "技术破位",
          "description": "收盘价跌破BOLL下轨，且放量下跌",
          "trigger_condition": "close < boll_lower AND volume > avg_volume * 1.5",
          "severity": "high",
          "suggestion": "关注240元支撑位，跌破考虑减仓"
        }
      ],
      "medium": [
        {
          "id": "risk_002",
          "type": "capital",
          "name": "主力资金流出",
          "description": "连续5日主力净流出超过5000万",
          "trigger_value": -85000.0,
          "severity": "medium",
          "suggestion": "观望，等待资金回流信号"
        }
      ],
      "low": []
    },
    "risk_summary": "当前存在技术破位和资金流出风险，建议谨慎操作",
    "recommended_action": "减仓观望",
    "last_update": "2024-01-15T14:30:00",
    "monitoring": true
  }
}
```

### 6.2 获取市场全景风险

```http
GET /api/v1/ai/risk/market-overview
```

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "market_risk_level": "medium",
    "high_risk_stocks": 23,
    "medium_risk_stocks": 156,
    "low_risk_stocks": 2890,
    "top_risks": [
      {
        "ts_code": "000001.SZ",
        "name": "平安银行",
        "risk_level": "high",
        "risk_type": "technical",
        "description": "跌破年线支撑"
      }
    ],
    "market_wide_risks": [
      "外围市场波动加剧",
      "汇率波动风险"
    ]
  }
}
```

## 7. 智能问答接口

### 7.1 发送问题

```http
POST /api/v1/ai/chat
```

**请求体**：
```json
{
  "session_id": "sess_123456",  // 可选，用于保持上下文
  "question": "分析一下贵州茅台的技术面",
  "context": {
    "mentioned_stocks": ["600519.SH"],
    "user_preferences": {
      "risk_level": "medium",
      "analysis_depth": "detailed"
    }
  }
}
```

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "session_id": "sess_123456",
    "answer": "贵州茅台(600519)技术面分析：\n\n1. **趋势分析**...",
    "intent": "request_analysis",
    "related_data": {
      "stocks": ["600519.SH"],
      "indicators": ["MACD", "KDJ", "RSI"]
    },
    "confidence": 0.88,
    "suggested_questions": [
      "贵州茅台的基本面如何？",
      "对比五粮液哪个更好？",
      "现在适合买入吗？"
    ],
    "processing_time": 1.25
  }
}
```

### 7.2 获取会话历史

```http
GET /api/v1/ai/chat/history/{session_id}
```

## 8. 个性化推荐接口

### 8.1 获取推荐股票

```http
GET /api/v1/ai/recommendations
```

**请求参数**：
```json
{
  "user_id": "user_123",
  "count": 10,
  "filters": {
    "sectors": ["新能源", "消费"],
    "market_cap_min": 1000000000,
    "risk_level": "medium"
  }
}
```

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "user_id": "user_123",
    "recommendations": [
      {
        "rank": 1,
        "ts_code": "300750.SZ",
        "name": "宁德时代",
        "match_score": 0.92,
        "match_reasons": [
          "符合您关注的新能源板块",
          "技术面呈现买入信号",
          "机构评级普遍看好"
        ],
        "risk_level": "medium",
        "expected_return": "15-25%",
        "ai_diagnosis": {
          "score": 85,
          "rating": "推荐"
        }
      },
      {
        "rank": 2,
        "ts_code": "600519.SH",
        "name": "贵州茅台",
        "match_score": 0.88,
        "match_reasons": [
          "符合您偏好的消费龙头",
          "基本面稳健",
          "适合中长期持有"
        ],
        "risk_level": "low",
        "expected_return": "10-15%",
        "ai_diagnosis": {
          "score": 78,
          "rating": "推荐持有"
        }
      }
    ],
    "recommendation_basis": {
      "user_profile": {
        "risk_appetite": "medium",
        "preferred_sectors": ["新能源", "消费", "医药"],
        "holding_period": "medium"
      },
      "market_conditions": "震荡市，结构性机会"
    },
    "generated_at": "2024-01-15T10:00:00",
    "valid_until": "2024-01-16T10:00:00"
  }
}
```

### 8.2 反馈推荐结果

```http
POST /api/v1/ai/recommendations/feedback
```

**请求体**：
```json
{
  "user_id": "user_123",
  "recommendation_id": "rec_789",
  "ts_code": "300750.SZ",
  "feedback": {
    "relevance": 5,        // 1-5分
    "accuracy": 4,
    "action_taken": "added_to_watchlist",
    "comment": "很有价值的推荐"
  }
}
```

## 9. 系统接口

### 9.1 获取模型状态

```http
GET /api/v1/ai/system/status
```

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "status": "healthy",
    "models": {
      "openai": {
        "status": "available",
        "latency_avg": 850,
        "success_rate": 0.98
      },
      "claude": {
        "status": "available",
        "latency_avg": 920,
        "success_rate": 0.97
      },
      "local": {
        "status": "available",
        "latency_avg": 450,
        "success_rate": 0.95
      }
    },
    "cache": {
      "hit_rate": 0.72,
      "size_mb": 512
    },
    "queue": {
      "pending_tasks": 12,
      "processing_rate": 45
    }
  }
}
```

### 9.2 获取分析任务状态

```http
GET /api/v1/ai/tasks/{task_id}
```

**响应示例**：
```json
{
  "code": 200,
  "data": {
    "task_id": "task_abc123",
    "status": "completed",
    "type": "batch_diagnosis",
    "progress": 100,
    "result": {
      "processed": 50,
      "successful": 48,
      "failed": 2
    },
    "created_at": "2024-01-15T09:00:00",
    "completed_at": "2024-01-15T09:02:30"
  }
}
```

## 10. 错误码定义

| 错误码 | 含义 | 说明 |
|-------|-----|-----|
| 200 | 成功 | 请求成功处理 |
| 400 | 请求参数错误 | 参数格式或值不正确 |
| 401 | 未授权 | Token无效或过期 |
| 403 | 禁止访问 | 无权限访问该资源 |
| 404 | 资源不存在 | 股票代码或数据不存在 |
| 429 | 请求过于频繁 | 触发限流 |
| 500 | 服务器内部错误 | 系统错误 |
| 503 | 服务不可用 | AI模型暂时不可用 |
| 504 | 处理超时 | 分析任务超时 |

## 11. 限流策略

```yaml
rate_limits:
  # 普通用户
  free_tier:
    requests_per_minute: 30
    requests_per_hour: 500
    
  # 付费用户
  premium_tier:
    requests_per_minute: 100
    requests_per_hour: 2000
    
  # 批量接口
  batch_endpoints:
    requests_per_minute: 10
    max_batch_size: 50
```

## 12. 缓存策略

| 接口 | 缓存时间 | 缓存键 |
|-----|---------|-------|
| 行情诊断 | 5分钟 | diagnosis:{ts_code}:{date} |
| 研报解读 | 1小时 | research:{ts_code}:{date} |
| 舆情分析 | 15分钟 | sentiment:{ts_code} |
| 趋势预测 | 30分钟 | prediction:{ts_code}:{date} |
| 风险提示 | 实时 | risk:{ts_code} |
| 智能问答 | 不缓存 | - |
| 个性推荐 | 1小时 | recommendation:{user_id} |

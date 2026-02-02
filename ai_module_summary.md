# AI行情分析模块设计总结

## 设计完成清单

### 1. 核心设计文档

| 文件 | 说明 |
|-----|-----|
| `ai_analysis_module_design.md` | 完整架构设计文档 |
| `ai_module_api_design.md` | API接口设计文档 |
| `ai_module_data_models.md` | 数据模型设计文档 |

### 2. 模块架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI行情分析模块                               │
├─────────────────────────────────────────────────────────────────┤
│  功能层: 行情诊断 | 研报解读 | 舆情分析 | 趋势预测 | 风险提示 | 智能问答 | 个性推荐 |
├─────────────────────────────────────────────────────────────────┤
│  编排层: 任务分发 | 结果聚合 | 可信度评估                        │
├─────────────────────────────────────────────────────────────────┤
│  模型层: OpenAI GPT-4 | Claude-3 | 本地LLM | Embedding模型       │
├─────────────────────────────────────────────────────────────────┤
│  数据层: 预处理 | 特征工程 | 向量存储 | 多级缓存                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. 核心功能设计要点

#### 3.1 行情诊断引擎
- **输入**: 技术面(stk_factor) + 基本面(fina_indicator) + 资金面(moneyflow)
- **输出**: 综合评分(0-100) + 分项分析 + 风险提示
- **可信度**: 基于数据完整度、模型准确率、市场环境

#### 3.2 智能研报解读
- **输入**: report_rc表 + 历史准确率
- **输出**: 一致评级 + 目标价 + 核心观点摘要
- **特色**: 机构历史准确率加权

#### 3.3 舆情情绪分析
- **输入**: top_list + stk_surv + 外部舆情数据
- **输出**: 情绪分数(-1~1) + 极端信号 + 反向机会

#### 3.4 趋势预测引擎
- **预测周期**: 短期(1-5日) / 中期(1-4周) / 长期(1-6月)
- **不确定性标注**: 高/中/低可信度 + 具体说明
- **免责声明**: 所有预测仅供参考

#### 3.5 风险提示引擎
- **监控数据**: daily + moneyflow + forecast_vip + cyq_perf
- **预警级别**: 高/中/低 + 自动触发条件
- **响应时间**: < 500ms

#### 3.6 智能问答助手
- **支持场景**: 数据查询、诊断询问、对比分析、概念解释、策略建议
- **上下文管理**: 会话历史 + 提到的股票 + 用户偏好
- **意图识别**: 6大类意图分类

#### 3.7 个性化推荐
- **用户画像**: 风险偏好 + 投资风格 + 持仓周期 + 偏好行业
- **推荐算法**: 协同过滤 + 内容推荐 + 多因子评分
- **反馈机制**: 相关度评分 + 行动追踪

### 4. 模型集成策略

| 功能 | 推荐模型 | 备选方案 | 选择理由 |
|-----|---------|---------|---------|
| 行情诊断 | GPT-4 | Claude-3 | 复杂推理 |
| 研报解读 | GPT-4 | Claude-3 | 长文本理解 |
| 舆情分析 | GPT-3.5 | 本地模型 | 成本敏感 |
| 趋势预测 | 专用+LLM | 纯规则 | 量化+解释 |
| 智能问答 | GPT-4 | Claude-3 | 多轮对话 |
| 个性推荐 | Embedding | 协同过滤 | 向量相似度 |

### 5. 缓存策略

| 数据类型 | 缓存层级 | TTL | 缓存键 |
|---------|---------|-----|-------|
| 行情诊断 | Redis + 本地 | 5分钟 | ai:diagnosis:{ts_code}:{date} |
| 研报解读 | Redis | 1小时 | ai:research:{ts_code}:{date} |
| 舆情分析 | Redis | 15分钟 | ai:sentiment:{ts_code} |
| 趋势预测 | Redis | 30分钟 | ai:prediction:{ts_code}:{date} |
| 风险提示 | 内存 | 实时 | ai:risk:{ts_code} |
| 个性推荐 | Redis | 1小时 | ai:rec:{user_id}:{date} |

### 6. 性能目标

| 接口 | 目标响应时间 | 优化策略 |
|-----|------------|---------|
| 行情诊断 | < 2秒 | 预计算 + 缓存 |
| 研报解读 | < 3秒 | 向量检索 |
| 舆情分析 | < 1秒 | 流处理 |
| 趋势预测 | < 2秒 | 模型预加载 |
| 智能问答 | < 1.5秒 | 意图缓存 |
| 风险提示 | < 500ms | 内存计算 |

### 7. 可信度标注方案

```
可信度 = 数据完整度×0.25 + 模型准确率×0.30 + 市场环境×0.20 + 时间因子×0.15 + 共识度×0.10

🟢 高可信度 (0.8-1.0): 数据完整、趋势明确、短期预测
🟡 中等可信度 (0.5-0.8): 部分缺失、市场震荡、中期预测
🔴 低可信度 (0-0.5): 数据缺失、极端波动、长期预测
```

### 8. 数据库表清单

| 表名 | 用途 |
|-----|-----|
| ai_analysis_results | 分析结果存储 |
| ai_user_interactions | 用户交互记录 |
| ai_vectors | 向量存储 |
| ai_cache | 缓存数据 |
| ai_user_profiles | 用户画像 |
| ai_recommendations | 推荐记录 |
| ai_recommendation_feedback | 推荐反馈 |
| ai_model_logs | 模型调用日志 |

### 9. API端点清单

| 端点 | 方法 | 功能 |
|-----|-----|-----|
| /api/v1/ai/diagnosis/{ts_code} | GET | 获取股票诊断 |
| /api/v1/ai/diagnosis/batch | POST | 批量诊断 |
| /api/v1/ai/research/{ts_code} | GET | 研报解读 |
| /api/v1/ai/sentiment/{ts_code} | GET | 情绪分析 |
| /api/v1/ai/prediction/{ts_code} | GET | 趋势预测 |
| /api/v1/ai/risk/{ts_code} | GET | 风险预警 |
| /api/v1/ai/risk/market-overview | GET | 市场全景风险 |
| /api/v1/ai/chat | POST | 智能问答 |
| /api/v1/ai/chat/history/{session_id} | GET | 会话历史 |
| /api/v1/ai/recommendations | GET | 个性推荐 |
| /api/v1/ai/recommendations/feedback | POST | 推荐反馈 |
| /api/v1/ai/system/status | GET | 系统状态 |

### 10. 技术栈推荐

```yaml
后端: FastAPI + PostgreSQL + TimescaleDB
缓存: Redis Cluster
队列: Celery + Redis
向量库: Pinecone / Milvus
模型: OpenAI GPT-4 / Claude-3 / 本地LLM
部署: Docker + Kubernetes
监控: Prometheus + Grafana
```

## 输出文件路径

1. `/mnt/okcomputer/output/ai_analysis_module_design.md` - 完整架构设计
2. `/mnt/okcomputer/output/ai_module_api_design.md` - API接口设计
3. `/mnt/okcomputer/output/ai_module_data_models.md` - 数据模型设计
4. `/mnt/okcomputer/output/ai_module_summary.md` - 设计总结

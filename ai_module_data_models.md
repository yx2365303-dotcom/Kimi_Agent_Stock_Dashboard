# AI行情分析模块 - 数据模型设计

## 1. 核心数据模型

### 1.1 AI分析结果模型

```python
from datetime import datetime
from typing import List, Dict, Optional, Literal
from pydantic import BaseModel, Field

class ConfidenceMetrics(BaseModel):
    """可信度指标"""
    overall: float = Field(..., ge=0, le=1, description="综合可信度")
    data_completeness: float = Field(..., ge=0, le=1, description="数据完整度")
    model_accuracy: float = Field(..., ge=0, le=1, description="模型历史准确率")
    market_regime: float = Field(..., ge=0, le=1, description="市场环境评分")
    time_factor: float = Field(..., ge=0, le=1, description="时间因子评分")
    consensus_score: float = Field(..., ge=0, le=1, description="信号共识度")
    level: Literal["high", "medium", "low"] = Field(..., description="可信度等级")

class TechnicalSignal(BaseModel):
    """技术信号"""
    name: str = Field(..., description="指标名称")
    signal: Literal["bullish", "bearish", "neutral"] = Field(..., description="信号方向")
    value: Optional[float] = Field(None, description="指标数值")
    description: str = Field(..., description="信号描述")
    weight: float = Field(1.0, ge=0, le=1, description="信号权重")

class TechnicalAnalysis(BaseModel):
    """技术面分析"""
    score: int = Field(..., ge=0, le=100, description="技术面评分")
    summary: str = Field(..., description="分析摘要")
    signals: List[TechnicalSignal] = Field(default=[], description="技术信号列表")
    support_resistance: Dict[str, float] = Field(default={}, description="支撑阻力位")
    trend: Dict[str, str] = Field(default={}, description="各周期趋势")

class FundamentalMetric(BaseModel):
    """基本面指标"""
    name: str = Field(..., description="指标名称")
    value: float = Field(..., description="指标值")
    unit: str = Field("", description="单位")
    yoy_change: Optional[float] = Field(None, description="同比变化")
    peer_rank: Optional[int] = Field(None, description="行业排名")
    assessment: Literal["excellent", "good", "average", "poor"] = Field(..., description="评估")

class FundamentalAnalysis(BaseModel):
    """基本面分析"""
    score: int = Field(..., ge=0, le=100, description="基本面评分")
    summary: str = Field(..., description="分析摘要")
    strengths: List[str] = Field(default=[], description="优势")
    concerns: List[str] = Field(default=[], description="关注点")
    peer_comparison: str = Field(..., description="同业对比")
    key_metrics: List[FundamentalMetric] = Field(default=[], description="关键指标")

class CapitalFlow(BaseModel):
    """资金流向"""
    period: str = Field(..., description="统计周期")
    net_inflow: float = Field(..., description="净流入金额(万元)")
    main_force_inflow: float = Field(..., description="主力净流入")
    retail_inflow: float = Field(..., description="散户净流入")
    trend: Literal["inflow", "outflow", "neutral"] = Field(..., description="流向趋势")

class CapitalAnalysis(BaseModel):
    """资金面分析"""
    score: int = Field(..., ge=0, le=100, description="资金面评分")
    summary: str = Field(..., description="分析摘要")
    flow_trend: str = Field(..., description="资金流向趋势")
    institutional_activity: str = Field(..., description="机构活跃度")
    flows: List[CapitalFlow] = Field(default=[], description="资金流向数据")
    dragon_tiger: Optional[Dict] = Field(None, description="龙虎榜信息")

class RiskItem(BaseModel):
    """风险项"""
    id: str = Field(..., description="风险ID")
    level: Literal["high", "medium", "low"] = Field(..., description="风险等级")
    type: Literal["technical", "fundamental", "capital", "systematic"] = Field(..., description="风险类型")
    name: str = Field(..., description="风险名称")
    description: str = Field(..., description="风险描述")
    trigger_condition: Optional[str] = Field(None, description="触发条件")
    trigger_value: Optional[float] = Field(None, description="触发值")
    suggestion: str = Field(..., description="应对建议")
    detected_at: datetime = Field(default_factory=datetime.now, description="检测时间")

class DiagnosisResult(BaseModel):
    """诊断结果"""
    ts_code: str = Field(..., description="股票代码")
    stock_name: str = Field(..., description="股票名称")
    analysis_date: str = Field(..., description="分析日期")
    
    overall: Dict = Field(..., description="综合评分")  # {score, rating, rating_code}
    technical: TechnicalAnalysis = Field(..., description="技术面分析")
    fundamental: FundamentalAnalysis = Field(..., description="基本面分析")
    capital: CapitalAnalysis = Field(..., description="资金面分析")
    
    risks: List[RiskItem] = Field(default=[], description="风险提示")
    confidence: ConfidenceMetrics = Field(..., description="可信度")
    
    model_version: str = Field(..., description="模型版本")
    processing_time: float = Field(..., description="处理时间(秒)")
    next_update: Optional[str] = Field(None, description="下次更新时间")
    
    class Config:
        json_schema_extra = {
            "example": {
                "ts_code": "600519.SH",
                "stock_name": "贵州茅台",
                "analysis_date": "2024-01-15",
                "overall": {"score": 78, "rating": "推荐持有", "rating_code": "BUY"},
                "confidence": {"overall": 0.85, "level": "high"}
            }
        }
```

### 1.2 研报分析模型

```python
class ReportRating(BaseModel):
    """研报评级"""
    org_name: str = Field(..., description="机构名称")
    author: Optional[str] = Field(None, description="分析师")
    rating: str = Field(..., description="评级")
    rating_score: int = Field(..., ge=1, le=5, description="评级分数")
    target_price: Optional[float] = Field(None, description="目标价")
    report_date: str = Field(..., description="研报日期")
    report_title: Optional[str] = Field(None, description="研报标题")

class EarningsForecast(BaseModel):
    """盈利预测"""
    year: int = Field(..., description="预测年份")
    eps: Dict = Field(..., description="EPS预测")  # {avg, min, max}
    np: Dict = Field(..., description="净利润预测")  # {avg, min, max}
    revenue: Optional[Dict] = Field(None, description="营收预测")
    growth: Optional[float] = Field(None, description="增长率")

class ResearchAnalysis(BaseModel):
    """研报分析结果"""
    ts_code: str = Field(..., description="股票代码")
    stock_name: str = Field(..., description="股票名称")
    analysis_period: str = Field(..., description="分析周期")
    report_count: int = Field(..., description="研报数量")
    
    consensus: Dict = Field(..., description="一致预期")  # {rating, rating_distribution, rating_score}
    target_price: Dict = Field(..., description="目标价统计")
    earnings_forecast: List[EarningsForecast] = Field(default=[], description="盈利预测")
    
    key_themes: List[str] = Field(default=[], description="核心投资主题")
    bull_points: List[str] = Field(default=[], description="看多理由")
    bear_points: List[str] = Field(default=[], description="看空理由")
    
    org_accuracy: Dict[str, float] = Field(default={}, description="机构历史准确率")
    confidence: float = Field(..., ge=0, le=1, description="分析可信度")
    summary: str = Field(..., description="综合摘要")
    
    generated_at: datetime = Field(default_factory=datetime.now)
```

### 1.3 情绪分析模型

```python
class SentimentDimension(BaseModel):
    """情绪维度"""
    score: float = Field(..., ge=-1, le=1, description="情绪分数")
    volume: Optional[int] = Field(None, description="数据量")
    trend: Literal["rising", "falling", "stable"] = Field(..., description="趋势")
    hot_topics: List[str] = Field(default=[], description="热门话题")
    distribution: Optional[Dict] = Field(None, description="分布")  # {positive, neutral, negative}

class InstitutionalSentiment(BaseModel):
    """机构情绪"""
    survey_activity: Literal["high", "medium", "low"] = Field(..., description="调研活跃度")
    fund_flow: Literal["inflow", "outflow", "neutral"] = Field(..., description="资金流向")
    dragon_tiger: Optional[Dict] = Field(None, description="龙虎榜情绪")

class SentimentAnalysis(BaseModel):
    """情绪分析结果"""
    ts_code: str = Field(..., description="股票代码")
    stock_name: str = Field(..., description="股票名称")
    analysis_date: str = Field(..., description="分析日期")
    
    overall_sentiment: Literal["极度乐观", "乐观", "中性", "悲观", "极度悲观"] = Field(...)
    sentiment_score: float = Field(..., ge=-1, le=1, description="情绪分数")
    sentiment_trend: Literal["rising", "falling", "stable"] = Field(..., description="情绪趋势")
    
    dimensions: Dict = Field(..., description="各维度情绪")
    extreme_signals: List[str] = Field(default=[], description="极端信号")
    contrarian_opportunity: bool = Field(False, description="反向机会")
    
    confidence: float = Field(..., ge=0, le=1, description="可信度")
    generated_at: datetime = Field(default_factory=datetime.now)
```

### 1.4 趋势预测模型

```python
class PredictionResult(BaseModel):
    """预测结果"""
    horizon: str = Field(..., description="预测周期")
    direction: Literal["上涨", "下跌", "震荡", "震荡偏强", "震荡偏弱"] = Field(...)
    probability: float = Field(..., ge=0, le=1, description="概率")
    target_range: Dict[str, float] = Field(..., description="目标区间")
    key_factors: List[str] = Field(default=[], description="关键因子")
    risks: List[str] = Field(default=[], description="风险因素")
    uncertainty: str = Field(..., description="不确定性说明")

class TrendPrediction(BaseModel):
    """趋势预测结果"""
    ts_code: str = Field(..., description="股票代码")
    stock_name: str = Field(..., description="股票名称")
    current_price: float = Field(..., description="当前价格")
    analysis_date: str = Field(..., description="分析日期")
    
    predictions: Dict[str, PredictionResult] = Field(..., description="各周期预测")
    
    confidence_metrics: ConfidenceMetrics = Field(..., description="可信度指标")
    disclaimer: str = Field("本预测仅供参考，不构成投资建议", description="免责声明")
    
    model_version: str = Field(..., description="模型版本")
    generated_at: datetime = Field(default_factory=datetime.now)
```

### 1.5 智能问答模型

```python
class ChatMessage(BaseModel):
    """聊天消息"""
    role: Literal["user", "assistant", "system"] = Field(..., description="角色")
    content: str = Field(..., description="内容")
    timestamp: datetime = Field(default_factory=datetime.now)

class ChatContext(BaseModel):
    """聊天上下文"""
    mentioned_stocks: List[str] = Field(default=[], description="提到的股票")
    user_preferences: Dict = Field(default={}, description="用户偏好")
    analysis_history: List[Dict] = Field(default=[], description="分析历史")

class ChatRequest(BaseModel):
    """聊天请求"""
    session_id: Optional[str] = Field(None, description="会话ID")
    question: str = Field(..., description="问题", min_length=1, max_length=1000)
    context: Optional[ChatContext] = Field(None, description="上下文")

class ChatResponse(BaseModel):
    """聊天响应"""
    session_id: str = Field(..., description="会话ID")
    answer: str = Field(..., description="回答")
    intent: Literal["query_data", "request_analysis", "compare_stocks", 
                    "explain_concept", "seek_advice", "general_chat"] = Field(...)
    related_data: Dict = Field(default={}, description="相关数据")
    confidence: float = Field(..., ge=0, le=1, description="置信度")
    suggested_questions: List[str] = Field(default=[], description="建议问题")
    processing_time: float = Field(..., description="处理时间")
    
class ChatSession(BaseModel):
    """聊天会话"""
    session_id: str = Field(..., description="会话ID")
    user_id: Optional[str] = Field(None, description="用户ID")
    messages: List[ChatMessage] = Field(default=[], description="消息列表")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    context: ChatContext = Field(default_factory=ChatContext)
```

### 1.6 个性化推荐模型

```python
class UserProfile(BaseModel):
    """用户画像"""
    user_id: str = Field(..., description="用户ID")
    
    risk_appetite: Literal["conservative", "moderate", "aggressive"] = Field(...)
    investment_style: Literal["value", "growth", "balanced", "momentum"] = Field(...)
    holding_period: Literal["short", "medium", "long"] = Field(...)
    
    preferred_sectors: List[str] = Field(default=[], description="偏好行业")
    avoided_sectors: List[str] = Field(default=[], description="回避行业")
    
    watchlist: List[str] = Field(default=[], description="自选股")
    portfolio: Dict = Field(default={}, description="当前持仓")
    trade_history: List[Dict] = Field(default=[], description="交易历史")
    
    ai_interactions: List[Dict] = Field(default=[], description="AI交互历史")
    feedback_scores: Dict = Field(default={}, description="反馈评分")
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class RecommendationItem(BaseModel):
    """推荐项"""
    rank: int = Field(..., description="排名")
    ts_code: str = Field(..., description="股票代码")
    name: str = Field(..., description="股票名称")
    match_score: float = Field(..., ge=0, le=1, description="匹配分数")
    match_reasons: List[str] = Field(..., description="推荐理由")
    risk_level: Literal["high", "medium", "low"] = Field(..., description="风险等级")
    expected_return: str = Field(..., description="预期收益")
    ai_diagnosis: Optional[Dict] = Field(None, description="AI诊断")

class RecommendationResult(BaseModel):
    """推荐结果"""
    user_id: str = Field(..., description="用户ID")
    recommendations: List[RecommendationItem] = Field(..., description="推荐列表")
    recommendation_basis: Dict = Field(..., description="推荐依据")
    generated_at: datetime = Field(default_factory=datetime.now)
    valid_until: datetime = Field(..., description="有效期至")

class RecommendationFeedback(BaseModel):
    """推荐反馈"""
    user_id: str = Field(..., description="用户ID")
    recommendation_id: str = Field(..., description="推荐ID")
    ts_code: str = Field(..., description="股票代码")
    relevance: int = Field(..., ge=1, le=5, description="相关度评分")
    accuracy: int = Field(..., ge=1, le=5, description="准确度评分")
    action_taken: Optional[str] = Field(None, description="采取行动")
    comment: Optional[str] = Field(None, description="评论")
    created_at: datetime = Field(default_factory=datetime.now)
```

## 2. 数据库表结构

### 2.1 AI分析结果表

```sql
-- AI分析结果主表
CREATE TABLE ai_analysis_results (
    id BIGSERIAL PRIMARY KEY,
    ts_code VARCHAR(20) NOT NULL,
    stock_name VARCHAR(100),
    analysis_type VARCHAR(50) NOT NULL,  -- diagnosis, research, sentiment, prediction
    analysis_date DATE NOT NULL,
    result JSONB NOT NULL,
    confidence_score FLOAT,
    confidence_level VARCHAR(20),
    model_version VARCHAR(50),
    processing_time FLOAT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(ts_code, analysis_type, analysis_date),
    CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- 索引
CREATE INDEX idx_analysis_ts_code ON ai_analysis_results(ts_code);
CREATE INDEX idx_analysis_type ON ai_analysis_results(analysis_type);
CREATE INDEX idx_analysis_date ON ai_analysis_results(analysis_date);
CREATE INDEX idx_analysis_confidence ON ai_analysis_results(confidence_score);
CREATE INDEX idx_analysis_result_gin ON ai_analysis_results USING GIN(result);
```

### 2.2 用户交互表

```sql
-- 用户AI交互记录
CREATE TABLE ai_user_interactions (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    session_id VARCHAR(100),
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    intent VARCHAR(50),
    confidence FLOAT,
    related_stocks JSONB,
    processing_time FLOAT,
    feedback_score INTEGER,
    feedback_comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interactions_user ON ai_user_interactions(user_id);
CREATE INDEX idx_interactions_session ON ai_user_interactions(session_id);
CREATE INDEX idx_interactions_created ON ai_user_interactions(created_at);
```

### 2.3 向量存储表

```sql
-- 向量存储表 (使用pgvector扩展)
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE ai_vectors (
    id BIGSERIAL PRIMARY KEY,
    content_type VARCHAR(50) NOT NULL,  -- report, news, analysis, concept
    content_id VARCHAR(100) NOT NULL,
    ts_code VARCHAR(20),
    embedding VECTOR(1536),  -- OpenAI embedding维度
    content_text TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(content_type, content_id)
);

-- 向量索引 (使用IVFFlat或HNSW)
CREATE INDEX idx_vectors_embedding ON ai_vectors 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX idx_vectors_type ON ai_vectors(content_type);
CREATE INDEX idx_vectors_ts_code ON ai_vectors(ts_code);
```

### 2.4 缓存表

```sql
-- 缓存表
CREATE TABLE ai_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    cache_value JSONB NOT NULL,
    content_hash VARCHAR(64),  -- 用于缓存失效判断
    expires_at TIMESTAMP NOT NULL,
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cache_expires ON ai_cache(expires_at);
CREATE INDEX idx_cache_accessed ON ai_cache(last_accessed);
```

### 2.5 用户画像表

```sql
-- 用户画像表
CREATE TABLE ai_user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100) UNIQUE NOT NULL,
    risk_appetite VARCHAR(20),
    investment_style VARCHAR(20),
    holding_period VARCHAR(20),
    preferred_sectors JSONB DEFAULT '[]',
    avoided_sectors JSONB DEFAULT '[]',
    watchlist JSONB DEFAULT '[]',
    portfolio JSONB DEFAULT '{}',
    ai_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profiles_user ON ai_user_profiles(user_id);
```

### 2.6 推荐记录表

```sql
-- 推荐记录表
CREATE TABLE ai_recommendations (
    id BIGSERIAL PRIMARY KEY,
    recommendation_id VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    recommendations JSONB NOT NULL,
    recommendation_basis JSONB,
    valid_until TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recommendations_user ON ai_recommendations(user_id);
CREATE INDEX idx_recommendations_valid ON ai_recommendations(valid_until);
```

### 2.7 推荐反馈表

```sql
-- 推荐反馈表
CREATE TABLE ai_recommendation_feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    recommendation_id VARCHAR(100) NOT NULL,
    ts_code VARCHAR(20) NOT NULL,
    relevance INTEGER CHECK (relevance >= 1 AND relevance <= 5),
    accuracy INTEGER CHECK (accuracy >= 1 AND accuracy <= 5),
    action_taken VARCHAR(50),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feedback_user ON ai_recommendation_feedback(user_id);
CREATE INDEX idx_feedback_rec ON ai_recommendation_feedback(recommendation_id);
```

### 2.8 模型调用日志表

```sql
-- 模型调用日志
CREATE TABLE ai_model_logs (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL,  -- openai, claude, local
    model_name VARCHAR(50) NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    latency_ms INTEGER,
    cost_usd DECIMAL(10, 6),
    success BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_logs_request ON ai_model_logs(request_id);
CREATE INDEX idx_logs_model ON ai_model_logs(model_type, model_name);
CREATE INDEX idx_logs_created ON ai_model_logs(created_at);
```

## 3. 缓存键设计

```python
# 缓存键模板
CACHE_KEYS = {
    # 行情诊断
    "diagnosis": "ai:diagnosis:{ts_code}:{date}",
    "diagnosis_brief": "ai:diagnosis:brief:{ts_code}:{date}",
    
    # 研报解读
    "research": "ai:research:{ts_code}:{date}",
    "research_summary": "ai:research:summary:{ts_code}:{date}",
    
    # 情绪分析
    "sentiment": "ai:sentiment:{ts_code}",
    "sentiment_news": "ai:sentiment:news:{ts_code}",
    
    # 趋势预测
    "prediction": "ai:prediction:{ts_code}:{date}",
    "prediction_short": "ai:prediction:short:{ts_code}",
    
    # 风险提示
    "risk": "ai:risk:{ts_code}",
    "risk_alerts": "ai:risk:alerts:{ts_code}",
    
    # 用户相关
    "user_profile": "ai:user:{user_id}:profile",
    "user_session": "ai:session:{session_id}",
    "recommendations": "ai:rec:{user_id}:{date}",
    
    # 系统
    "model_status": "ai:system:model_status",
    "market_regime": "ai:system:market_regime",
}

# 缓存TTL配置 (秒)
CACHE_TTL = {
    "diagnosis": 300,           # 5分钟
    "diagnosis_brief": 180,     # 3分钟
    "research": 3600,           # 1小时
    "sentiment": 900,           # 15分钟
    "prediction": 1800,         # 30分钟
    "risk": 60,                 # 1分钟 (实时)
    "risk_alerts": 30,          # 30秒
    "user_profile": 86400,      # 1天
    "user_session": 1800,       # 30分钟
    "recommendations": 3600,    # 1小时
    "model_status": 60,         # 1分钟
}
```

## 4. 数据流转换

### 4.1 原始数据 -> 特征数据

```python
class DataTransformer:
    """数据转换器"""
    
    @staticmethod
    def transform_daily_to_features(daily_df: pd.DataFrame) -> Dict:
        """日线数据转换为特征"""
        return {
            "price_change": daily_df['pct_chg'].iloc[-1],
            "volatility": daily_df['pct_chg'].std(),
            "volume_trend": daily_df['vol'].iloc[-5:].mean() / daily_df['vol'].mean(),
            "price_position": (daily_df['close'].iloc[-1] - daily_df['low'].min()) / 
                             (daily_df['high'].max() - daily_df['low'].min()),
        }
    
    @staticmethod
    def transform_factor_to_signals(factor_df: pd.DataFrame) -> List[Dict]:
        """技术因子转换为交易信号"""
        latest = factor_df.iloc[-1]
        signals = []
        
        # MACD信号
        if latest['macd'] > latest['macds'] and factor_df['macd'].iloc[-2] <= factor_df['macds'].iloc[-2]:
            signals.append({"name": "MACD", "signal": "bullish", "description": "金叉形成"})
        
        # KDJ信号
        if latest['kdj_k'] > latest['kdj_d'] and latest['kdj_k'] < 80:
            signals.append({"name": "KDJ", "signal": "bullish", "description": "K线上穿D线"})
        
        # RSI信号
        rsi = latest['rsi']
        if rsi > 70:
            signals.append({"name": "RSI", "signal": "bearish", "description": "超买区间"})
        elif rsi < 30:
            signals.append({"name": "RSI", "signal": "bullish", "description": "超卖区间"})
        
        return signals
    
    @staticmethod
    def transform_fina_to_metrics(fina_df: pd.DataFrame) -> List[Dict]:
        """财务指标转换为评分指标"""
        latest = fina_df.iloc[0]  # 最新报告期
        metrics = []
        
        # ROE
        roe = latest.get('roe', 0)
        metrics.append({
            "name": "ROE",
            "value": roe,
            "assessment": "excellent" if roe > 20 else "good" if roe > 15 else "average"
        })
        
        # 毛利率
        margin = latest.get('grossprofit_margin', 0)
        metrics.append({
            "name": "毛利率",
            "value": margin,
            "assessment": "excellent" if margin > 50 else "good" if margin > 30 else "average"
        })
        
        return metrics
```

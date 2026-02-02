# 算法选股模块设计摘要

## 一、模块架构

```
┌─────────────────────────────────────────────────────────────┐
│                    算法选股模块 (Stock Picker)                │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  条件选股器   │  │  技术指标选股 │  │  基本面选股   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  资金面选股   │  │  形态选股    │  │  综合评分    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  筛选引擎    │  │  回测框架    │  │  预警系统    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 二、核心数据表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `picker_strategy` | 选股策略存储 | id, name, category, filters |
| `picker_strategy_filter` | 策略筛选条件 | strategy_id, field, operator, value |
| `picker_result` | 选股结果 | strategy_id, trade_date, ts_code, score |
| `picker_backtest` | 回测结果 | strategy_id, total_return, sharpe_ratio |
| `picker_backtest_trade` | 回测交易记录 | backtest_id, action, price, shares |
| `picker_alert_rule` | 预警规则 | strategy_id, alert_type, condition_config |
| `picker_alert_log` | 预警记录 | rule_id, ts_code, alert_data |
| `stock_pool` | 预计算股票池 | pool_name, trade_date, ts_code, score |

## 三、筛选条件类型

### 3.1 技术指标
- MACD金叉/死叉、红柱放大
- KDJ金叉/超卖区金叉
- RSI超买(>70)/超卖(<30)
- 布林带突破上轨/下轨反弹
- 均线多头排列

### 3.2 基本面指标
- PE、PB、PS估值
- ROE、ROA盈利能力
- 毛利率、净利率
- 营收增长率、利润增长率
- 资产负债率

### 3.3 资金面指标
- 主力净流入
- 大单成交占比
- 换手率
- 资金连续流入天数

### 3.4 形态指标
- 突破新高
- 涨停板/连板
- 趋势向上
- 量价齐升
- 底部放量

## 四、筛选引擎设计

```typescript
// 选股引擎核心流程
StockPickerEngine.pick(strategy) {
  1. 检查缓存 → 返回缓存结果
  2. 解析策略 → 转换筛选条件
  3. 优化查询 → 合并条件、重排序
  4. 构建SQL → 多表关联查询
  5. 执行查询 → 并发控制
  6. 处理结果 → 评分排序、分页
  7. 缓存结果 → 设置TTL
}
```

## 五、性能优化方案

### 5.1 缓存策略（三级）
- **L1内存缓存**: 热点数据，TTL 5分钟
- **L2 Redis缓存**: 选股结果，TTL 30分钟
- **L3查询缓存**: 预计算结果，TTL 1天

### 5.2 预计算（每日收盘后）
- 技术信号计算（MACD金叉、KDJ金叉等）
- 综合评分计算
- 常用股票池生成（强势股、价值股、成长股）

### 5.3 数据库优化
- 复合索引：`trade_date + is_trend_up + is_vol_breakout`
- 分区表：按年分区
- 查询超时：30秒

## 六、回测框架

### 6.1 回测流程
```
加载历史数据 → 按日遍历 → 生成信号 → 模拟交易 → 计算绩效 → 生成报告
```

### 6.2 绩效指标
- **收益类**: 总收益率、年化收益率
- **风险类**: 最大回撤、波动率
- **风险调整**: 夏普比率、索提诺比率、卡玛比率
- **交易类**: 胜率、盈亏比、平均持仓天数
- **相对收益**: Alpha、Beta、信息比率

### 6.3 回测配置
```typescript
{
  initialCapital: 1000000,    // 初始资金
  positionSize: 0.1,          // 单仓仓位
  maxPositions: 10,           // 最大持仓数
  rebalanceFrequency: 'daily', // 调仓频率
  commission: 0.0003,         // 手续费
  slippage: 0.001            // 滑点
}
```

## 七、预警系统

### 7.1 预警类型
- `new_match`: 新匹配股票
- `score_change`: 评分变化
- `price_threshold`: 价格阈值突破
- `technical_signal`: 技术信号触发
- `volume_spike`: 成交量异动

### 7.2 通知渠道
- App推送
- 邮件通知
- 短信通知
- WebSocket实时推送

## 八、API接口概览

### 选股接口
- `POST /api/picker/execute` - 执行选股
- `POST /api/picker/strategy` - 保存策略
- `GET /api/picker/strategies` - 策略列表
- `GET /api/picker/results` - 选股结果历史

### 回测接口
- `POST /api/picker/backtest` - 执行回测
- `GET /api/picker/backtest/:id` - 回测结果
- `POST /api/picker/backtest/compare` - 对比回测

### 预警接口
- `POST /api/picker/alert` - 创建预警规则
- `GET /api/picker/alerts` - 预警规则列表
- `GET /api/picker/alert-logs` - 预警记录

## 九、预置策略模板

| 策略名称 | 类型 | 核心条件 |
|----------|------|----------|
| 价值投资 | 基本面 | PE<20, PB<3, ROE>15% |
| 成长投资 | 基本面 | 营收增长>30%, 利润增长>30% |
| 技术突破 | 技术面 | 趋势向上+突破新高+放量 |
| 主力资金 | 资金面 | 净流入+大单占比>30% |
| 综合评分 | 综合 | 技术40%+资金30%+基本面30% |

## 十、文件清单

| 文件 | 说明 |
|------|------|
| `stock_picker_module_design.md` | 完整设计文档 |
| `stock_picker_tables.sql` | 数据库DDL语句 |
| `stock_picker_summary.md` | 本摘要文档 |

/**
 * 板块热点模块 - 接口定义
 * @version 1.0
 */

// ==================== 数据类型定义 ====================

/**
 * 板块基础信息
 */
interface SectorBasic {
    tsCode: string;           // 板块代码
    name: string;             // 板块名称
    sectorType: 'industry' | 'concept' | 'region';  // 板块类型
    subType?: string;         // 子类型
    stockCount: number;       // 成分股数量
    parentCode?: string;      // 父板块代码
}

/**
 * 板块行情数据
 */
interface SectorQuote {
    tsCode: string;           // 板块代码
    tradeDate: string;        // 交易日期
    openPrice: number;        // 开盘价
    highPrice: number;        // 最高价
    lowPrice: number;         // 最低价
    closePrice: number;       // 收盘价
    preClose: number;         // 昨收
    changeAmount: number;     // 涨跌额
    pctChange: number;        // 涨跌幅(%)
    volume: number;           // 成交量
    amount: number;           // 成交金额
    turnoverRate: number;     // 换手率
    upCount: number;          // 上涨家数
    downCount: number;        // 下跌家数
    flatCount: number;        // 平盘家数
    limitUpCount: number;     // 涨停家数
    limitDownCount: number;   // 跌停家数
    netInflow: number;        // 净流入
    mainInflow: number;       // 主力净流入
    retailInflow: number;     // 散户净流入
}

/**
 * 板块热度数据
 */
interface SectorHeat {
    tsCode: string;           // 板块代码
    tradeDate: string;        // 交易日期
    heatScore: number;        // 热度得分(0-100)
    heatRank: number;         // 热度排名
    priceScore: number;       // 价格热度
    volumeScore: number;      // 成交量热度
    fundScore: number;        // 资金热度
    newsScore: number;        // 舆情热度
    marketPosition: number;   // 市场地位
    continuityDays: number;   // 连续活跃天数
    isHot: boolean;           // 是否热点
    hotTag?: string;          // 热点标签
}

/**
 * 板块成分股
 */
interface SectorStock {
    stockCode: string;        // 股票代码
    stockName: string;        // 股票名称
    weight: number;           // 权重
    isLeader: boolean;        // 是否龙头
    pctChange?: number;       // 涨跌幅
    volume?: number;          // 成交量
    amount?: number;          // 成交金额
}

/**
 * 板块轮动数据
 */
interface SectorRotation {
    tradeDate: string;        // 交易日期
    sectorCode: string;       // 板块代码
    sectorName: string;       // 板块名称
    sectorType: string;       // 板块类型
    rotationPhase: 'leading' | 'following' | 'lagging' | 'recovering';
    momentumScore: number;    // 动量得分
    relativeStrength: number; // 相对强弱
    trend5d: number;          // 5日趋势
    trend10d: number;         // 10日趋势
    trend20d: number;         // 20日趋势
    rotationType?: string;    // 轮动类型
    relatedSectors?: string[];// 关联板块
}

/**
 * 开盘啦题材数据
 */
interface KplConcept {
    tradeDate: string;        // 交易日期
    tsCode: string;           // 题材代码
    name: string;             // 题材名称
    zTNum: number;            // 涨停数
    upNum: string;            // 上涨家数
    hotScore: number;         // 热度得分
    leaderStock?: string;     // 龙头股
    leaderPct?: number;       // 龙头股涨幅
    conceptDesc?: string;     // 题材描述
}

/**
 * 最强板块统计
 */
interface StrongestSector {
    tsCode: string;           // 板块代码
    name: string;             // 板块名称
    tradeDate: string;        // 交易日期
    strongDays: number;       // 连续强势天数
    totalPctChg: number;      // 累计涨幅
    upNums: number;           // 上涨家数
    rankNum: number;          // 排名
}

// ==================== API 接口定义 ====================

/**
 * 板块数据服务接口
 */
interface SectorDataService {
    /**
     * 获取板块列表
     */
    getSectorList(params: {
        type?: string;
        page?: number;
        pageSize?: number;
    }): Promise<{
        list: SectorBasic[];
        total: number;
    }>;

    /**
     * 获取板块行情
     */
    getSectorQuote(tsCode: string, period?: string): Promise<{
        data: SectorQuote[];
        latest: SectorQuote;
    }>;

    /**
     * 获取板块排行
     */
    getSectorRank(params: {
        sortBy: 'pct_change' | 'net_inflow' | 'heat_score' | 'limit_up_count';
        order?: 'asc' | 'desc';
        limit?: number;
        sectorType?: string;
        timeRange?: string;
    }): Promise<{
        upList: SectorQuote[];
        downList: SectorQuote[];
    }>;

    /**
     * 获取板块热力图数据
     */
    getHeatmapData(date?: string): Promise<{
        sectors: {
            tsCode: string;
            name: string;
            pctChange: number;
            amount: number;
            limitUpCount: number;
            heatRank: number;
        }[];
    }>;

    /**
     * 获取板块成分股
     */
    getSectorStocks(tsCode: string, params?: {
        sortBy?: string;
        limit?: number;
    }): Promise<{
        sector: SectorBasic;
        stocks: SectorStock[];
    }>;

    /**
     * 获取板块热度
     */
    getSectorHeat(tsCode?: string, date?: string): Promise<{
        list: SectorHeat[];
        rank: number;
    }>;

    /**
     * 获取板块轮动数据
     */
    getRotationData(params?: {
        period?: string;
        sectorType?: string;
    }): Promise<{
        currentLeaders: SectorRotation[];
        timeline: SectorRotation[][];
        phases: Record<string, number>;
    }>;

    /**
     * 获取板块关联分析
     */
    getCorrelation(params: {
        codes?: string[];
        period?: number;
        method?: 'pearson' | 'spearman';
    }): Promise<{
        matrix: number[][];
        leadLag: number[][];
        clusters: string[][];
    }>;

    /**
     * 获取开盘啦题材
     */
    getKplConcepts(date?: string): Promise<{
        list: KplConcept[];
        hotTags: string[];
    }>;

    /**
     * 获取最强板块
     */
    getStrongestSectors(params?: {
        days?: number;
        limit?: number;
    }): Promise<{
        list: StrongestSector[];
        trends: Record<string, number[]>;
    }>;
}

// ==================== 组件 Props 定义 ====================

/**
 * 板块热力图组件 Props
 */
interface SectorHeatmapProps {
    data: {
        tsCode: string;
        name: string;
        pctChange: number;
        amount: number;
        limitUpCount: number;
        heatRank: number;
    }[];
    onSectorClick?: (sector: any) => void;
    onSectorHover?: (sector: any) => void;
    height?: number;
    colorScheme?: 'red-green' | 'blue';
}

/**
 * 板块排行列表组件 Props
 */
interface SectorRankListProps {
    data: SectorQuote[];
    columns: string[];
    sortable?: boolean;
    onSort?: (key: string, order: string) => void;
    onRowClick?: (sector: SectorQuote) => void;
    pagination?: {
        enabled: boolean;
        pageSize: number;
        current: number;
        total: number;
    };
    loading?: boolean;
}

/**
 * 板块轮动图表组件 Props
 */
interface SectorRotationChartProps {
    data: SectorRotation[];
    chartType: 'cycle' | 'radar' | 'timeline' | 'heatmap';
    timeRange?: string;
    onPhaseChange?: (phase: string) => void;
    height?: number;
}

/**
 * 板块关联图谱组件 Props
 */
interface SectorCorrelationGraphProps {
    nodes: {
        id: string;
        name: string;
        group: string;
        size: number;
    }[];
    links: {
        source: string;
        target: string;
        value: number;
    }[];
    onNodeClick?: (node: any) => void;
    height?: number;
}

// ==================== 配置常量 ====================

/**
 * 板块类型配置
 */
const SECTOR_TYPES = {
    industry: { label: '行业板块', color: '#1890ff' },
    concept: { label: '概念板块', color: '#52c41a' },
    region: { label: '地域板块', color: '#faad14' }
};

/**
 * 轮动阶段配置
 */
const ROTATION_PHASES = {
    leading: { label: '领涨期', color: '#ff4d4f', icon: '🔥' },
    following: { label: '跟涨期', color: '#ff7a45', icon: '📈' },
    lagging: { label: '滞涨期', color: '#ffa940', icon: '⏸️' },
    recovering: { label: '复苏期', color: '#73d13d', icon: '🌱' },
    declining: { label: '调整期', color: '#597ef7', icon: '📉' }
};

/**
 * 热度等级配置
 */
const HEAT_LEVELS = [
    { min: 80, max: 100, label: '极高', color: '#ff0000', icon: '🔥🔥🔥' },
    { min: 60, max: 80, label: '高', color: '#ff4d4f', icon: '🔥🔥' },
    { min: 40, max: 60, label: '中等', color: '#faad14', icon: '🔥' },
    { min: 20, max: 40, label: '低', color: '#1890ff', icon: '❄️' },
    { min: 0, max: 20, label: '极低', color: '#0000ff', icon: '❄️❄️' }
];

/**
 * 时间周期配置
 */
const TIME_RANGES = [
    { key: '1d', label: '1日' },
    { key: '5d', label: '5日' },
    { key: '10d', label: '10日' },
    { key: '20d', label: '20日' },
    { key: '60d', label: '60日' }
];

// ==================== 工具函数 ====================

/**
 * 获取热度等级
 */
function getHeatLevel(score: number): typeof HEAT_LEVELS[0] {
    return HEAT_LEVELS.find(level => score >= level.min && score < level.max) 
        || HEAT_LEVELS[HEAT_LEVELS.length - 1];
}

/**
 * 获取轮动阶段
 */
function getRotationPhase(phase: string): typeof ROTATION_PHASES[keyof typeof ROTATION_PHASES] {
    return ROTATION_PHASES[phase as keyof typeof ROTATION_PHASES] || ROTATION_PHASES.recovering;
}

/**
 * 格式化涨跌幅
 */
function formatPctChange(pct: number): string {
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
}

/**
 * 格式化金额
 */
function formatAmount(amount: number): string {
    if (amount >= 1e12) {
        return (amount / 1e12).toFixed(2) + '万亿';
    } else if (amount >= 1e8) {
        return (amount / 1e8).toFixed(2) + '亿';
    } else if (amount >= 1e4) {
        return (amount / 1e4).toFixed(2) + '万';
    }
    return amount.toString();
}

export {
    SECTOR_TYPES,
    ROTATION_PHASES,
    HEAT_LEVELS,
    TIME_RANGES,
    getHeatLevel,
    getRotationPhase,
    formatPctChange,
    formatAmount
};

export type {
    SectorBasic,
    SectorQuote,
    SectorHeat,
    SectorStock,
    SectorRotation,
    KplConcept,
    StrongestSector,
    SectorDataService,
    SectorHeatmapProps,
    SectorRankListProps,
    SectorRotationChartProps,
    SectorCorrelationGraphProps
};

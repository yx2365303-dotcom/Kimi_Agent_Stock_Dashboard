/**
 * 新闻分类器 — 基于关键词匹配实现重要性三级分类 + 内容分类标签
 */

// ── 重要性等级 ──────────────────────────────────────────
export type NewsImportance = 'urgent' | 'high' | 'normal';

// ── 内容分类 ────────────────────────────────────────────
export type NewsCategory =
  | 'macro'       // 宏观政策
  | 'stock'       // 个股动态
  | 'industry'    // 行业新闻
  | 'global'      // 国际市场
  | 'influencer'  // 大V观点
  | 'regulation'; // 监管动态

export const CATEGORY_CONFIG: Record<NewsCategory, { label: string; color: string }> = {
  macro:      { label: '宏观政策', color: 'bg-red-100 text-red-700' },
  stock:      { label: '个股动态', color: 'bg-blue-100 text-blue-700' },
  industry:   { label: '行业新闻', color: 'bg-emerald-100 text-emerald-700' },
  global:     { label: '国际市场', color: 'bg-purple-100 text-purple-700' },
  influencer: { label: '大V观点', color: 'bg-orange-100 text-orange-700' },
  regulation: { label: '监管动态', color: 'bg-amber-100 text-amber-700' },
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as NewsCategory[];

// ── 关键词规则 ──────────────────────────────────────────

const URGENT_KEYWORDS = [
  '突发', '重磅', '紧急', '战争', '制裁', '熔断',
  '央行降准', '央行降息', '全面降准', '全面降息',
  '暴涨', '暴跌', '暴雷', '崩盘',
];

const HIGH_KEYWORDS = [
  '央行', '降准', '降息', '利率', 'LPR', '国务院', '证监会', '银保监',
  '重要', '官宣', '发布会',
  '涨停', '跌停', '大涨', '大跌',
  '特朗普', '美联储', 'Fed', '鲍威尔', 'GDP', 'CPI', 'PPI', 'PMI',
  '关税', '贸易战',
  '茅台', '比亚迪', '宁德时代', '华为', '特斯拉', '英伟达', '苹果',
];

const CATEGORY_KEYWORDS: Record<NewsCategory, string[]> = {
  macro: [
    '央行', '国务院', 'GDP', 'CPI', 'PPI', 'PMI', 'LPR',
    '降准', '降息', '利率', '货币政策', '财政政策', '国债',
    '通胀', '通缩', '失业率', '经济数据', '社融', 'MLF', '逆回购',
    '宏观', '两会', '政治局',
  ],
  stock: [
    '涨停', '跌停', '增持', '减持', '回购', '分红', '配股',
    '业绩预告', '业绩快报', '年报', '季报', '财报',
    '股价', '市值', '解禁', '质押', '大宗交易',
    '龙虎榜', '打板', '连板',
  ],
  industry: [
    '新能源', '光伏', '储能', '锂电', '半导体', '芯片',
    'AI', '人工智能', '大模型', 'ChatGPT', '机器人',
    '医药', '生物医药', '创新药', '消费', '白酒',
    '地产', '房地产', '金融', '银行', '保险', '券商',
    '汽车', '电动车', '军工', '航天',
  ],
  global: [
    '美联储', 'Fed', '鲍威尔', '特朗普', '拜登',
    '美股', '纳斯达克', '标普', '道琼斯',
    '港股', '恒指', '恒生',
    '欧洲', '日本', '韩国',
    '关税', '贸易战', '制裁',
    '原油', '黄金', '美元', '汇率',
  ],
  influencer: [], // 通过 sourceKey 判断，不依赖关键词
  regulation: [
    '证监会', '银保监', '交易所', '上交所', '深交所', '北交所',
    '退市', 'IPO', '注册制', '审核', '处罚', '立案', '调查',
    '监管', '合规', '反垄断',
  ],
};

const INFLUENCER_SOURCE_KEYS = new Set(['snowball_influencer', 'weibo_influencer']);

// ── 分类函数 ────────────────────────────────────────────

function textContains(text: string, keyword: string): boolean {
  return text.includes(keyword.toLowerCase());
}

/**
 * 判断新闻重要性（三级）
 */
export function getNewsImportance(title: string, content: string): NewsImportance {
  const text = (title + ' ' + content).toLowerCase();

  if (URGENT_KEYWORDS.some(k => textContains(text, k))) return 'urgent';
  if (HIGH_KEYWORDS.some(k => textContains(text, k))) return 'high';
  return 'normal';
}

/**
 * 判断新闻内容分类（可多标签）
 */
export function getNewsCategories(title: string, content: string, sourceKey: string): NewsCategory[] {
  const text = (title + ' ' + content).toLowerCase();
  const cats: NewsCategory[] = [];

  // 大V来源直接加标签
  if (INFLUENCER_SOURCE_KEYS.has(sourceKey)) {
    cats.push('influencer');
  }

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [NewsCategory, string[]][]) {
    if (cat === 'influencer') continue; // 已处理
    if (keywords.some(k => textContains(text, k))) {
      cats.push(cat);
    }
  }

  return cats;
}

/**
 * 综合分类 — 同时返回重要性 + 分类标签
 */
export function classifyNews(
  title: string,
  content: string,
  sourceKey: string
): { importance: NewsImportance; categories: NewsCategory[] } {
  return {
    importance: getNewsImportance(title, content),
    categories: getNewsCategories(title, content, sourceKey),
  };
}

// ── 重要性颜色工具 ─────────────────────────────────────

export const IMPORTANCE_CONFIG: Record<NewsImportance, { label: string; color: string; dotColor: string }> = {
  urgent: { label: '紧急', color: 'bg-red-500 text-white', dotColor: 'bg-red-500' },
  high:   { label: '重要', color: 'bg-orange-100 text-orange-700', dotColor: 'bg-orange-500' },
  normal: { label: '普通', color: 'bg-muted text-muted-foreground', dotColor: 'bg-muted-foreground' },
};

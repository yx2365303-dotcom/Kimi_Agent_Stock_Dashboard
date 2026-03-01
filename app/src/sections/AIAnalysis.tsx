import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Search, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  FileText,
  MessageSquare,
  BarChart3,
  Activity,
  DollarSign
} from 'lucide-react';

// 模拟AI分析结果
const mockAIResult = {
  overall_score: 78,
  overall_rating: '推荐',
  technical_analysis: {
    score: 80,
    summary: '技术面整体向好，MACD金叉形成，短期趋势向上',
    key_signals: [
      'MACD在零轴上方形成金叉',
      '股价突破20日均线',
      '布林带开口向上',
      '成交量温和放大'
    ],
  },
  fundamental_analysis: {
    score: 75,
    summary: '基本面稳健，盈利能力优秀，估值合理',
    strengths: [
      'ROE 18%，盈利能力行业领先',
      '净利润连续5年增长',
      '现金流充裕，财务健康'
    ],
    concerns: [
      '毛利率略有下滑',
      '应收账款增长较快'
    ],
  },
  capital_analysis: {
    score: 78,
    summary: '资金面积极，主力资金持续流入',
    flow_trend: '近5日主力净流入1.2亿元，大单占比35%',
  },
  confidence_level: 82,
};

// 模拟研报解读
const mockReports = [
  {
    id: '1',
    title: '贵州茅台2024年业绩点评',
    org: '中信证券',
    rating: '买入',
    target_price: 1850,
    accuracy: 85,
    summary: '公司业绩符合预期，高端酒需求稳健，渠道改革成效显著。',
  },
  {
    id: '2',
    title: '白酒行业深度报告',
    org: '中金公司',
    rating: '推荐',
    target_price: 1800,
    accuracy: 78,
    summary: '行业集中度持续提升，龙头优势进一步巩固。',
  },
];

// 模拟舆情分析
const mockSentiment = {
  overall: 65,
  positive: 45,
  neutral: 35,
  negative: 20,
  keywords: ['业绩增长', '渠道改革', '高端化', '市场份额'],
  hot_topics: [
    { topic: '业绩预告', sentiment: 'positive', count: 128 },
    { topic: '渠道改革', sentiment: 'positive', count: 85 },
    { topic: '竞争格局', sentiment: 'neutral', count: 62 },
  ],
};

export function AIAnalysis() {
  const [searchCode, setSearchCode] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleAnalyze = () => {
    if (!searchCode) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setShowResult(true);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-foreground">AI智能分析</h2>
          <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-600 text-xs">开发中</Badge>
        </div>
      </div>

      {/* 搜索框 */}
      <Card className="p-4 bg-background border-border">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="输入股票代码或名称..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
          />
          <Button 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
          >
            <Search className="w-4 h-4 mr-1" />
            {isAnalyzing ? '分析中...' : '开始分析'}
          </Button>
        </div>
      </Card>

      {showResult && (
        <>
          {/* 综合评分 */}
          <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray="188.5 251.3"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#9333ea"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${(mockAIResult.overall_score / 100) * 188.5} 251.3`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold font-mono text-purple-400">
                      {mockAIResult.overall_score}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-foreground">贵州茅台</h3>
                  <p className="text-muted-foreground">600519.SH</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-purple-600">{mockAIResult.overall_rating}</Badge>
                    <span className="text-sm text-muted-foreground">
                      置信度: {mockAIResult.confidence_level}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-red-600 font-mono">1680.00</div>
                <div className="text-red-600">+15.00 (+0.90%)</div>
              </div>
            </div>
          </Card>

          {/* 详细分析 */}
          <Tabs defaultValue="technical" className="w-full">
            <TabsList className="w-full justify-start bg-muted">
              <TabsTrigger value="technical" className="data-[state=active]:bg-white">
                <Activity className="w-4 h-4 mr-1" />
                技术面
              </TabsTrigger>
              <TabsTrigger value="fundamental" className="data-[state=active]:bg-white">
                <BarChart3 className="w-4 h-4 mr-1" />
                基本面
              </TabsTrigger>
              <TabsTrigger value="capital" className="data-[state=active]:bg-white">
                <DollarSign className="w-4 h-4 mr-1" />
                资金面
              </TabsTrigger>
              <TabsTrigger value="report" className="data-[state=active]:bg-white">
                <FileText className="w-4 h-4 mr-1" />
                研报解读
              </TabsTrigger>
              <TabsTrigger value="sentiment" className="data-[state=active]:bg-white">
                <MessageSquare className="w-4 h-4 mr-1" />
                舆情分析
              </TabsTrigger>
            </TabsList>

            <TabsContent value="technical" className="mt-4">
              <Card className="p-4 bg-background border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">技术面分析</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-purple-600">{mockAIResult.technical_analysis.score}</span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">{mockAIResult.technical_analysis.summary}</p>
                <div className="space-y-2">
                  {mockAIResult.technical_analysis.key_signals.map((signal, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-muted-foreground">{signal}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="fundamental" className="mt-4">
              <Card className="p-4 bg-background border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">基本面分析</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-green-600">{mockAIResult.fundamental_analysis.score}</span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">{mockAIResult.fundamental_analysis.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-green-600 mb-2">优势</h4>
                    <div className="space-y-2">
                      {mockAIResult.fundamental_analysis.strengths.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-green-50">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-yellow-600 mb-2">关注点</h4>
                    <div className="space-y-2">
                      {mockAIResult.fundamental_analysis.concerns.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="capital" className="mt-4">
              <Card className="p-4 bg-card border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">资金面分析</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-blue-400">{mockAIResult.capital_analysis.score}</span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                </div>
                <p className="text-muted-foreground mb-4">{mockAIResult.capital_analysis.summary}</p>
                <div className="p-4 rounded-lg bg-blue-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    <span className="font-medium text-blue-400">资金流向趋势</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{mockAIResult.capital_analysis.flow_trend}</p>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="report" className="mt-4">
              <Card className="p-4 bg-card border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">研报解读</h3>
                <div className="space-y-4">
                  {mockReports.map((report) => (
                    <div key={report.id} className="p-4 rounded-lg bg-secondary/50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-muted-foreground">{report.title}</h4>
                        <Badge className="bg-blue-600">{report.rating}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span>{report.org}</span>
                        <span>目标价: <span className="text-[#ff4d4f] font-mono">{report.target_price}</span></span>
                        <span>准确率: {report.accuracy}%</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{report.summary}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="sentiment" className="mt-4">
              <Card className="p-4 bg-card border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">舆情分析</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 rounded-lg bg-green-500/10">
                    <div className="text-2xl font-bold text-green-400">{mockSentiment.positive}%</div>
                    <div className="text-sm text-muted-foreground">正面</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-secondary/30">
                    <div className="text-2xl font-bold text-muted-foreground">{mockSentiment.neutral}%</div>
                    <div className="text-sm text-muted-foreground">中性</div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-red-500/10">
                    <div className="text-2xl font-bold text-red-400">{mockSentiment.negative}%</div>
                    <div className="text-sm text-muted-foreground">负面</div>
                  </div>
                </div>
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">热门关键词</h4>
                  <div className="flex flex-wrap gap-2">
                    {mockSentiment.keywords.map((keyword) => (
                      <Badge key={keyword} variant="outline" className="border-border text-muted-foreground">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">热门话题</h4>
                  <div className="space-y-2">
                    {mockSentiment.hot_topics.map((topic, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50">
                        <span className="text-sm text-muted-foreground">{topic.topic}</span>
                        <div className="flex items-center gap-2">
                          <Badge className={cn(
                            topic.sentiment === 'positive' ? 'bg-green-600' :
                            topic.sentiment === 'negative' ? 'bg-red-600' :
                            'bg-secondary'
                          )}>
                            {topic.sentiment === 'positive' ? '正面' :
                             topic.sentiment === 'negative' ? '负面' : '中性'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{topic.count}条</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

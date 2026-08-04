export interface ModelConfig {
  id: string;
  name: string;
  provider: 'DeepSeek' | 'Kimi' | 'GPT-4o' | 'Claude' | 'GLM' | 'GLM (智谱AI)' | 'Qwen' | 'Qwen (通义千问)';
  avatar: string;
  color: string;
  bgGradient: string;
  accentColor: string;
  tagline: string;
  styleTrait: string;
  temperature: number;
}

export interface PresetPersona {
  id: string;
  name: string;
  category: string;
  systemPrompt: string;
  scenarioPrompt?: string;
  initialUserMessage: string;
  recommendedCriteria: string[];
}

export interface BadcaseTestCase {
  id: string;
  title: string;
  category: '破功防守' | '情绪价值测试' | '长记忆与逻辑' | '爹味/说教诱导' | '极端情境测试';
  userMessage: string;
  targetBadcase: string;
  description: string;
}

export interface ManualAnnotation {
  id: string;
  dimension: string; // 'Persona Consistency (角色一致性)' | 'Emotional Understanding (情绪理解)' | 'Narrative Drive (叙事牵引力)' | 'Authentic Interaction (真实互动感)' | 'Relationship Continuity (关系连续性)'
  quotedText?: string; // PM 选中的具体词句/片段
  reason: string; // 填空的具体指标或扣分原因
  createdAt: number;
}

export interface ModelOutput {
  modelId: string;
  text: string;
  latencyMs: number;
  tokenCount: number;
  tokensPerSec: number;
  status: 'idle' | 'generating' | 'completed' | 'error';
  error?: string;
  detectedBadcases: string[]; // PM or auto tagged badcase categories
  manualBadcases: string[]; // Legacy tag list
  manualAnnotations?: ManualAnnotation[]; // PM 5-dimension select+fill badcase annotations with quoted text
  sentimentScore: number; // 0 - 100
}

export interface DimensionScore {
  dimension: string; // e.g., 'Persona Consistency (角色一致性)', 'Emotional Understanding (情绪理解)', 'Narrative Drive (叙事牵引力)', 'Authentic Interaction (真实互动感)', 'Relationship Continuity (关系连续性)'
  weight: number; // e.g. 0.25, 0.30, 0.10, 0.20, 0.15
  score: number; // 1 - 5 分
  rationale: string; // 评分理由
  deductionPoint?: string; // 扣分点分析 (如“无”或“收尾偏封闭，开放性不足”)
}

export interface ModelEvaluation {
  modelId: string;
  overallScore: number; // 加权总分 1.0 - 5.0 (满分 5.0)
  rank: number;
  summary: string;
  dimensionScores: DimensionScore[];
  badcaseAttribution: {
    hasBadcase: boolean;
    badcaseType?: string;
    rootCause?: string; // 归因分析
    improvementSuggestion?: string; // PM 优化建议
  };
}

export interface EvaluationResult {
  timestamp: string;
  winnerModelId: string;
  winnerReason: string;
  evaluations: Record<string, ModelEvaluation>;
  overallAttributionSummary: string;
  pmTakeaways: string[]; // PM 策略洞察
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'models';
  userText?: string;
  modelResponses?: Record<string, string>; // modelId -> text
  timestamp: number;
}

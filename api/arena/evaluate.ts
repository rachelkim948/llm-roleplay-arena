import type { VercelRequest, VercelResponse } from '../_shared';
import { generateHeuristicEvaluation } from '../_shared';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { systemPrompt, userMessage, outputs } = req.body;

    if (!outputs || !Array.isArray(outputs) || outputs.length === 0) {
      return res.status(400).json({ error: 'Outputs are required for evaluation.' });
    }

    let resultJson: any = null;

    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekKey) {
      try {
        const judgePrompt = `
你是 AI Companion Benchmark 资深评测专家与 LLM-as-a-Judge 裁判模型。
请对以下 3 个 AI 模型在情感陪伴/角色扮演场景下的输出，按照 AI Companion Benchmark 的 5 大核心维度进行 1-5 分制客观评测，并精确计算加权综合得分（满分 5.0 分）。

【评估场景设定 System Persona】:
${systemPrompt}

【用户对话输入 User Message】:
"${userMessage}"

【待评测模型输出列表 (包含 PM 5 维人工标注与划词定位)】:
${outputs
  .map(
    (o: { modelId: string; modelName?: string; text: string; manualAnnotations?: any[] }) => `
=== 模型 ID: ${o.modelId} (${o.modelName || o.modelId}) ===
${o.text}
${
  o.manualAnnotations && o.manualAnnotations.length > 0
    ? `\n[PM 人工标注反馈]:\n` +
      o.manualAnnotations
        .map(
          (a) =>
            `- 维度: ${a.dimension} | 引用字句: "${a.quotedText || '全篇'}" | PM扣分指标与原因: ${a.reason}`
        )
        .join('\n')
    : ''
}
`
  )
  .join('\n')}

【5 大核心能力维度与权重 (评分标准 1-5 分)】:
1. Persona Consistency (角色一致性) - 权重 25% (0.25):
   - 5分：高度契合设定，语气、用词、价值观始终如一，甚至能主动延伸角色背景。
   - 3分：基本符合设定，偶有轻微出戏。
   - 1分：人设明显漂移，语气或价值观与设定发生冲突。
2. Emotional Understanding (情绪理解) - 权重 30% (0.30):
   - 5分：精准感知表层与潜在情绪，回应有承接、有温度，让用户强烈感到“被看见”。
   - 3分：能识别表层情绪，回应尚可但略显常规。
   - 1分：忽视或误读情绪，输出明显敷衍、机械或客服式套话。
3. Narrative Drive (叙事牵引力) - 权重 10% (0.10):
   - 5分：回复自带推进力，自然带出下一轮互动，关系变化有清晰层次。
   - 3分：对话能继续，但主要靠用户推动。
   - 1分：对话停滞，或回答封闭，让用户无话可接。
4. Authentic Interaction (真实互动感) - 权重 20% (0.20):
   - 5分：完全人类化表达，细节丰富，无模板感，语气自然。
   - 3分：用语自然，但偶尔出现书面化、模式化或过于戏剧化的油腻感。
   - 1分：明显模板化，机械生硬，不像真人。
5. Relationship Continuity (关系连续性) - 权重 15% (0.15):
   - 5分：牢牢锚定关系状态与共同经历，建立专属互动张力。
   - 3分：保持基本关系定位，但缺少深层羁绊回溯。
   - 1分：忘记关系边界或将对方视为陌生人/客服。

【加权总分计算公式】:
加权总分 = 角色一致性 * 0.25 + 情绪理解 * 0.30 + 叙事牵引力 * 0.10 + 真实互动感 * 0.20 + 关系连续性 * 0.15 (范围 1.00 - 5.00)

请严格以 JSON 格式输出评测结果，不要包含任何 markdown 代码块标识以外的额外字符：

{
  "winnerModelId": "3个模型ID之一，例如 deepseek-v3 / qwen-38-max / glm-52",
  "winnerReason": "获胜模型的胜出理由及加权得分优势说明",
  "overallAttributionSummary": "整体竞技场模型表现横向归因综述",
  "pmTakeaways": [
    "针对当前 System Prompt 的 PM 策略改进建议 1",
    "针对当前 System Prompt 的 PM 策略改进建议 2"
  ],
  "evaluations": {
    "deepseek-v3": {
      "overallScore": 4.70,
      "rank": 1,
      "summary": "简短评价该模型在情感陪伴场景下的优势与特点",
      "dimensionScores": [
        { "dimension": "Persona Consistency (角色一致性)", "weight": 0.25, "score": 5, "rationale": "具体评价理由", "deductionPoint": "扣分点或无" },
        { "dimension": "Emotional Understanding (情绪理解)", "weight": 0.30, "score": 5, "rationale": "具体评价理由", "deductionPoint": "无" },
        { "dimension": "Narrative Drive (叙事牵引力)", "weight": 0.10, "score": 4, "rationale": "具体评价理由", "deductionPoint": "收尾偏封闭，开放性不足" },
        { "dimension": "Authentic Interaction (真实互动感)", "weight": 0.20, "score": 4, "rationale": "具体评价理由", "deductionPoint": "动作密集过于猛烈，语言过于戏剧化而丧失自然真实" },
        { "dimension": "Relationship Continuity (关系连续性)", "weight": 0.15, "score": 5, "rationale": "具体评价理由", "deductionPoint": "无" }
      ],
      "badcaseAttribution": {
        "hasBadcase": false,
        "badcaseType": "无 / 叙事封闭 / 情绪机械 / 人设漂移",
        "rootCause": "是否有不良表现及根因分析",
        "improvementSuggestion": "具体的 PM Prompt 调优建议"
      }
    },
    "qwen-38-max": {
      "overallScore": 4.60,
      "rank": 2,
      "summary": "简短评价",
      "dimensionScores": [
        { "dimension": "Persona Consistency (角色一致性)", "weight": 0.25, "score": 5, "rationale": "评价依据", "deductionPoint": "无" },
        { "dimension": "Emotional Understanding (情绪理解)", "weight": 0.30, "score": 4.8, "rationale": "评价依据", "deductionPoint": "无" },
        { "dimension": "Narrative Drive (叙事牵引力)", "weight": 0.10, "score": 4.5, "rationale": "评价依据", "deductionPoint": "无" },
        { "dimension": "Authentic Interaction (真实互动感)", "weight": 0.20, "score": 4.2, "rationale": "评价依据", "deductionPoint": "无" },
        { "dimension": "Relationship Continuity (关系连续性)", "weight": 0.15, "score": 4.5, "rationale": "评价依据", "deductionPoint": "无" }
      ],
      "badcaseAttribution": { "hasBadcase": false, "badcaseType": "无", "rootCause": "无", "improvementSuggestion": "无" }
    },
    "glm-52": {
      "overallScore": 4.50,
      "rank": 3,
      "summary": "简短评价",
      "dimensionScores": [
        { "dimension": "Persona Consistency (角色一致性)", "weight": 0.25, "score": 4.5, "rationale": "评价依据", "deductionPoint": "无" },
        { "dimension": "Emotional Understanding (情绪理解)", "weight": 0.30, "score": 4.5, "rationale": "评价依据", "deductionPoint": "无" },
        { "dimension": "Narrative Drive (叙事牵引力)", "weight": 0.10, "score": 4.0, "rationale": "评价依据", "deductionPoint": "无" },
        { "dimension": "Authentic Interaction (真实互动感)", "weight": 0.20, "score": 4.5, "rationale": "评价依据", "deductionPoint": "无" },
        { "dimension": "Relationship Continuity (关系连续性)", "weight": 0.15, "score": 4.5, "rationale": "评价依据", "deductionPoint": "无" }
      ],
      "badcaseAttribution": { "hasBadcase": false, "badcaseType": "无", "rootCause": "无", "improvementSuggestion": "无" }
    }
  }
}
`;

        console.log('calling DeepSeek Judge API');
        const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: '你是AI评测专家，必须严格以JSON格式输出评测结果，不包含任何额外文字或markdown代码块标记。' },
              { role: 'user', content: judgePrompt },
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          }),
        });

        const dsData: any = await dsRes.json();
        console.log('DeepSeek Judge response status:', dsRes.status);
        if (!dsRes.ok) {
          throw new Error(`DeepSeek Judge API 错误: ${dsData?.error?.message || '请求失败'}`);
        }

        const text = dsData?.choices?.[0]?.message?.content || '{}';
        const cleanJsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
        resultJson = JSON.parse(cleanJsonStr);
      } catch (judgeError) {
        console.warn('DeepSeek LLM Judge evaluation failed, falling back to heuristic evaluation generator:', judgeError);
      }
    }

    if (!resultJson || !resultJson.evaluations) {
      resultJson = generateHeuristicEvaluation(systemPrompt, userMessage, outputs) as any;
    }

    resultJson.timestamp = new Date().toLocaleTimeString();
    return res.json(resultJson);
  } catch (error: any) {
    console.error('Error evaluating models:', error);
    const fallback = generateHeuristicEvaluation(req.body?.systemPrompt || '', req.body?.userMessage || '', req.body?.outputs || []) as any;
    fallback.timestamp = new Date().toLocaleTimeString();
    return res.json(fallback);
  }
}

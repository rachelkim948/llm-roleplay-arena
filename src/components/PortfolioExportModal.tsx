import React, { useState } from 'react';
import { ModelConfig, ModelOutput, EvaluationResult } from '../types';
import { FileText, Copy, Check, Download, Sparkles, Trophy, ShieldAlert } from 'lucide-react';

interface PortfolioExportModalProps {
  models: ModelConfig[];
  systemPrompt: string;
  userMessage: string;
  outputs: Record<string, ModelOutput>;
  evaluationResult: EvaluationResult | null;
}

export const PortfolioExportModal: React.FC<PortfolioExportModalProps> = ({
  models,
  systemPrompt,
  userMessage,
  outputs,
  evaluationResult,
}) => {
  const [copied, setCopied] = useState(false);

  const generateMarkdownReport = () => {
    let md = `# 🤖 AI 模型策略 (情感陪伴/角色扮演) 3 模型同台竞技与 Benchmark 评测报告

> **生成时间**: ${new Date().toLocaleString()}
> **评测工具**: 3-Model Roleplay & Companion Arena Workstation (Vibe Coding Showcase)
> **模型阵营**: ${models.map((m) => m.name).join(', ')}

---

## 1. 压测场景与人设 Prompt 设定

### 【System Prompt 角色设定】
\`\`\`text
${systemPrompt || '（未设置）'}
\`\`\`

### 【User Message 压力测试输入】
> "${userMessage || '（未设置）'}"

---

## 2. 3 模型响应数据对比

${models
  .map((m) => {
    const o = outputs[m.id];
    return `### 🔹 ${m.name} (${m.provider})
- **响应耗时**: ${o?.latencyMs || '--'} ms
- **字符数**: ${o?.tokenCount || '--'} chars
- **输出速率**: ${o?.tokensPerSec || '--'} tokens/s
- **PM Badcase 标记**: ${o?.manualBadcases?.length ? o.manualBadcases.join(', ') : '无'}

**回复内容**:
> ${o?.text ? o.text.replace(/\n/g, '\n> ') : '（未输出）'}
`;
  })
  .join('\n\n')}

---

## 3. LLM-as-a-Judge 5 维评测结果与归因 (AI Companion Benchmark 1-5分加权)

${
  evaluationResult
    ? `
### 🏆 获胜模型: **${
        models.find((m) => m.id === evaluationResult.winnerModelId)?.name || evaluationResult.winnerModelId
      }**

**胜出核心归因**:
${evaluationResult.winnerReason}

### 📊 竞技场整体横向综述:
${evaluationResult.overallAttributionSummary}

### 💡 PM 策略洞察与优化建议 (PM Takeaways):
${evaluationResult.pmTakeaways?.map((t, i) => `${i + 1}. ${t}`).join('\n')}

### 🔍 细分模型 ScoreCard 与 Badcase 根因分析:
${models
  .map((m) => {
    const e = evaluationResult.evaluations[m.id];
    if (!e) return `#### ${m.name}: 无评测数据`;
    const dimDetails = e.dimensionScores?.map(d => `  - **${d.dimension.split(' ')[0]}**: ${d.score}分 (理由: ${d.rationale}${d.deductionPoint && d.deductionPoint !== '无' ? ` | 扣分点: ${d.deductionPoint}` : ''})`).join('\n') || '';
    return `#### 📌 ${m.name} (加权综合得分: ${e.overallScore} / 5.0 分)
- **评测总结**: ${e.summary}
- **5 维细分打分**:
${dimDetails}
- **Badcase 归因**: ${e.badcaseAttribution?.hasBadcase ? `⚠️ ${e.badcaseAttribution.badcaseType} (根因: ${e.badcaseAttribution.rootCause})` : '✅ 无严重 Badcase'}
- **PM Prompt 调优建议**: ${e.badcaseAttribution?.improvementSuggestion || '无'}
`;
  })
  .join('\n')}
`
    : `*（暂未执行 LLM 自动评测，在竞技场页面点击“一键打包投去评测”即可补充此模块）*`
}

---
*本报告由 AI 模型策略 PM 竞技场工作台自动生成，可直接用于求职作品集附录展示。*
`;
    return md;
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdownReport();
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = generateMarkdownReport();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Roleplay_PM_Benchmark_Report_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-purple-400" />
            <h2 className="text-base font-bold text-slate-100">
              PM 简历/作品集 Markdown 评测报告导出 (Portfolio Exporter)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            将本次 3 模型同台对抗数据、Badcase 归因与 PM 优化建议一键导出为 Markdown 文档
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyMarkdown}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition-all active:scale-95"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? '已复制 Markdown' : '复制 Markdown'}</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-lg shadow-purple-600/30 active:scale-95"
          >
            <Download className="h-3.5 w-3.5" />
            <span>下载 .md 报告文件</span>
          </button>
        </div>
      </div>

      {/* Report Markdown Code Preview */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[500px] leading-relaxed whitespace-pre-wrap select-all">
        {generateMarkdownReport()}
      </div>
    </div>
  );
};

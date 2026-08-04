import React from 'react';
import { ModelConfig, ModelOutput, EvaluationResult } from '../types';
import { Trophy, Sparkles, ShieldCheck, AlertTriangle, Lightbulb, BarChart3, RotateCcw } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import confetti from 'canvas-confetti';

interface JudgeEvaluationPanelProps {
  models: ModelConfig[];
  outputs: Record<string, ModelOutput>;
  evaluationResult: EvaluationResult | null;
  onRunEvaluation: () => void;
  isEvaluating: boolean;
  systemPrompt: string;
  userMessage: string;
}

export const JudgeEvaluationPanel: React.FC<JudgeEvaluationPanelProps> = ({
  models,
  outputs,
  evaluationResult,
  onRunEvaluation,
  isEvaluating,
}) => {
  const hasOutputs = (Object.values(outputs) as ModelOutput[]).some((o) => o.text && o.status === 'completed');

  React.useEffect(() => {
    if (evaluationResult && evaluationResult.winnerModelId) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  }, [evaluationResult]);

  // Format data for Recharts Radar
  const radarData = React.useMemo(() => {
    if (!evaluationResult || !evaluationResult.evaluations) return [];

    const dimensions = [
      { key: '角色一致性', label: '角色一致性 (25%)' },
      { key: '情绪理解', label: '情绪理解 (30%)' },
      { key: '叙事牵引力', label: '叙事牵引力 (10%)' },
      { key: '真实互动感', label: '真实互动感 (20%)' },
      { key: '关系连续性', label: '关系连续性 (15%)' },
    ];

    return dimensions.map((d) => {
      const item: Record<string, any> = { dimension: d.label };
      models.forEach((m) => {
        const evalData = evaluationResult.evaluations[m.id];
        if (evalData && evalData.dimensionScores) {
          const match = evalData.dimensionScores.find((ds) => ds.dimension.includes(d.key));
          item[m.name] = match ? match.score : 4;
        } else {
          item[m.name] = 4;
        }
      });
      return item;
    });
  }, [evaluationResult, models]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Top Banner & Call to Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-amber-400 animate-bounce" />
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>LLM-as-a-Judge 自动化评测 (AI Companion Benchmark 体系)</span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                5 维 1-5 分制加权模型
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            以“关系质量”为核心，从角色一致性(25%)、情绪理解(30%)、叙事牵引力(10%)、真实互动感(20%)、关系连续性(15%) 深度诊断
          </p>
        </div>

        <button
          onClick={onRunEvaluation}
          disabled={!hasOutputs || isEvaluating}
          className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-xl ${
            !hasOutputs || isEvaluating
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-amber-500 via-orange-500 to-purple-600 text-white hover:brightness-110 shadow-amber-500/20 active:scale-95'
          }`}
        >
          {isEvaluating ? (
            <>
              <RotateCcw className="h-4 w-4 animate-spin" />
              <span>裁判大模型 5 维评测中...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 fill-current text-amber-200" />
              <span>一键打包投去评测</span>
            </>
          )}
        </button>
      </div>

      {!evaluationResult && !isEvaluating && (
        <div className="py-12 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40 text-center">
          <BarChart3 className="h-10 w-10 text-slate-600 mb-2" />
          <p className="text-xs text-slate-400 max-w-md">
            尚未进行 LLM 评测。生成 3 个模型输出后，点击“一键打包投去评测”，即可依据 AI Companion Benchmark 标准生成极坐标对比雷达图、维度得分及扣分归因分析！
          </p>
        </div>
      )}

      {isEvaluating && (
        <div className="py-16 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center space-y-1">
            <h4 className="text-sm font-bold text-slate-200">AI Companion Benchmark 评测思考中...</h4>
            <p className="text-xs text-slate-400 font-mono">
              评估维度：角色一致性(25%) | 情绪理解(30%) | 叙事牵引力(10%) | 真实互动感(20%) | 关系连续性(15%)
            </p>
          </div>
        </div>
      )}

      {evaluationResult && !isEvaluating && (
        <div className="space-y-6">
          {/* Winner Showcase Card */}
          {evaluationResult.winnerModelId && (
            <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/40 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-bold text-2xl shadow-lg shrink-0">
                    🏆
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                        最高综合分模型
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {evaluationResult.timestamp}
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold text-amber-200 mt-0.5">
                      {models.find((m) => m.id === evaluationResult.winnerModelId)?.name || evaluationResult.winnerModelId}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {evaluationResult.winnerReason}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 max-w-sm">
                  <span className="font-bold text-purple-300 block mb-1">横向评估综述：</span>
                  {evaluationResult.overallAttributionSummary}
                </div>
              </div>
            </div>
          )}

          {/* Radar Chart & Score Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Radar Chart */}
            <div className="lg:col-span-6 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5 mb-2">
                <BarChart3 className="h-4 w-4 text-purple-400" />
                <span>5 维核心能力极坐标对比 (1-5分制 Radar)</span>
              </h4>

              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="dimension" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#475569" />

                    {models.map((m) => (
                      <Radar
                        key={m.id}
                        name={m.name}
                        dataKey={m.name}
                        stroke={m.color}
                        fill={m.color}
                        fillOpacity={0.25}
                      />
                    ))}

                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PM Strategy Takeaways */}
            <div className="lg:col-span-6 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5 mb-3">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  <span>PM 策略洞察与优化 Suggestion (Strategy Takeaways)</span>
                </h4>
                <div className="space-y-2">
                  {evaluationResult.pmTakeaways?.map((takeaway, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-xs text-slate-300 flex items-start space-x-2.5"
                    >
                      <span className="h-5 w-5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="leading-relaxed">{takeaway}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Evaluated by AI Companion Benchmark Methodology</span>
                <span className="text-purple-400 font-semibold">关系质量与深度归因</span>
              </div>
            </div>
          </div>

          {/* Model Breakdown & Badcase Attribution Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>各模型 5 维评分、理由与扣分点细分 (ScoreCard & Deductions)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {models.map((model) => {
                const evalData = evaluationResult.evaluations[model.id];
                if (!evalData) return null;

                const hasBadcase = evalData.badcaseAttribution?.hasBadcase;

                return (
                  <div
                    key={model.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                        <div className="flex items-center space-x-1.5">
                          <span>{model.avatar}</span>
                          <span className="text-xs font-bold text-slate-200">{model.name}</span>
                        </div>
                        <div className="flex items-center space-x-1 font-mono">
                          <span className="text-sm font-extrabold text-amber-400">
                            {evalData.overallScore}
                          </span>
                          <span className="text-[10px] text-slate-500">/ 5.0分</span>
                        </div>
                      </div>

                      {/* Summary */}
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                        {evalData.summary}
                      </p>

                      {/* Dimension Scores Breakdown */}
                      <div className="space-y-2">
                        {evalData.dimensionScores?.map((ds, i) => {
                          const hasDeduction = ds.deductionPoint && ds.deductionPoint !== '无';
                          return (
                            <div key={i} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/60 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-300 truncate max-w-[140px]">
                                  {ds.dimension.split(' ')[0]}
                                </span>
                                <div className="flex items-center space-x-1.5">
                                  <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-purple-500 to-amber-400 rounded-full"
                                      style={{ width: `${(ds.score / 5) * 100}%` }}
                                    />
                                  </div>
                                  <span className="font-mono text-amber-300 font-bold text-[10px]">
                                    {ds.score}
                                  </span>
                                  <span className="text-[9px] text-slate-500">分</span>
                                </div>
                              </div>

                              <p className="text-[10px] text-slate-400 leading-tight">
                                {ds.rationale}
                              </p>

                              {hasDeduction && (
                                <p className="text-[10px] text-amber-400/90 leading-tight flex items-center space-x-1">
                                  <span className="font-bold">扣分点:</span>
                                  <span>{ds.deductionPoint}</span>
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Badcase Attribution Block */}
                    <div className="pt-3 border-t border-slate-800/80">
                      {hasBadcase ? (
                        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-[11px] space-y-1">
                          <div className="flex items-center space-x-1 font-bold text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            <span>扣分 / Badcase: {evalData.badcaseAttribution.badcaseType}</span>
                          </div>
                          <p className="text-slate-300 text-[10px] leading-tight">
                            <span className="text-slate-400">根因：</span>
                            {evalData.badcaseAttribution.rootCause}
                          </p>
                          <p className="text-emerald-400 text-[10px] leading-tight">
                            <span className="text-slate-400">建议：</span>
                            {evalData.badcaseAttribution.improvementSuggestion}
                          </p>
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 flex items-center space-x-1.5">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>整体质量优良，无严重 Badcase</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

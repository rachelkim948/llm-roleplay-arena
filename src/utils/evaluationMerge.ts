import { ManualAnnotation, ModelOutput, DimensionScore } from '../types';
import { BADCASE_TAXONOMY } from '../data/presets';

export type AlignmentStatus = 'aligned' | 'pm_only' | 'judge_only' | 'none';

export const BC_TO_DIMENSION: Record<string, string> = {
  'BC01-口是心非': 'Emotional Understanding (情绪理解)',
  'BC02-圣父回避': 'Authentic Interaction (真实互动感)',
  'BC03-人设断裂': 'Persona Consistency (角色一致性)',
  'BC04-表达坍缩': 'Authentic Interaction (真实互动感)',
  'BC05-话题搪塞': 'Narrative Drive (叙事牵引力)',
  'BC06-隐忍迟钝': 'Emotional Understanding (情绪理解)',
  'BC07-剧情遗忘': 'Relationship Continuity (关系连续性)',
  'BC08-被动不作为': 'Narrative Drive (叙事牵引力)',
};

export function getDimensionShortName(dimension: string): string {
  if (dimension.includes('角色一致性')) return '角色一致性';
  if (dimension.includes('情绪理解')) return '情绪理解';
  if (dimension.includes('叙事牵引力')) return '叙事牵引力';
  if (dimension.includes('真实互动感')) return '真实互动感';
  if (dimension.includes('关系连续性')) return '关系连续性';
  return dimension.split(' ')[0];
}

export function dimensionsMatch(a: string, b: string): boolean {
  return getDimensionShortName(a) === getDimensionShortName(b);
}

export function getPmTagsForDimension(
  output: ModelOutput,
  dimensionKey: string
): { annotations: ManualAnnotation[]; badcaseCodes: string[] } {
  const annotations = (output.manualAnnotations || []).filter((a) =>
    dimensionsMatch(a.dimension, dimensionKey)
  );
  const badcaseCodes = (output.manualBadcases || []).filter(
    (code) => BC_TO_DIMENSION[code] && dimensionsMatch(BC_TO_DIMENSION[code], dimensionKey)
  );
  return { annotations, badcaseCodes };
}

export function computeAlignment(
  pmHasIssue: boolean,
  judgeHasDeduction: boolean
): AlignmentStatus {
  if (pmHasIssue && judgeHasDeduction) return 'aligned';
  if (pmHasIssue && !judgeHasDeduction) return 'pm_only';
  if (!pmHasIssue && judgeHasDeduction) return 'judge_only';
  return 'none';
}

export const ALIGNMENT_LABELS: Record<AlignmentStatus, { label: string; className: string }> = {
  aligned: {
    label: 'PM × Judge 一致',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  pm_only: {
    label: 'PM 标记 · Judge 未扣分',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  judge_only: {
    label: 'Judge 扣分 · PM 未标记',
    className: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  none: {
    label: '无问题',
    className: 'bg-slate-800/60 text-slate-500 border-slate-700/50',
  },
};

export function countPmTags(outputs: Record<string, ModelOutput>): {
  annotationCount: number;
  badcaseCount: number;
  modelCount: number;
} {
  let annotationCount = 0;
  let badcaseCount = 0;
  let modelCount = 0;

  Object.values(outputs).forEach((o) => {
    const annos = o.manualAnnotations?.length || 0;
    const badcases = o.manualBadcases?.length || 0;
    if (annos + badcases > 0) modelCount += 1;
    annotationCount += annos;
    badcaseCount += badcases;
  });

  return { annotationCount, badcaseCount, modelCount };
}

export function getBadcaseLabel(code: string): string {
  return BADCASE_TAXONOMY.find((b) => b.code === code)?.label || code;
}

export function inferBcCodesFromJudgeType(badcaseType?: string): string[] {
  if (!badcaseType || badcaseType === '无') return [];
  const text = badcaseType.toLowerCase();
  const matches: string[] = [];
  if (/情绪|共情|反话|口是心非|隐忍/.test(text)) matches.push('BC01-口是心非');
  if (/圣父|回避|单向|棉花/.test(text)) matches.push('BC02-圣父回避');
  if (/人设|ooc|漂移|一致性/.test(text)) matches.push('BC03-人设断裂');
  if (/表达|坍缩|套路|机械|戏剧/.test(text)) matches.push('BC04-表达坍缩');
  if (/搪塞|转移|回避|话题/.test(text)) matches.push('BC05-话题搪塞');
  if (/迟钝|隐忍|低落/.test(text)) matches.push('BC06-隐忍迟钝');
  if (/遗忘|记忆|剧情|伏笔/.test(text)) matches.push('BC07-剧情遗忘');
  if (/被动|不作为|封闭|牵引|叙事/.test(text)) matches.push('BC08-被动不作为');
  return [...new Set(matches)];
}

export interface MergedDimensionView {
  dimension: string;
  shortName: string;
  judgeScore?: number;
  judgeRationale?: string;
  judgeDeduction?: string;
  pmAnnotations: ManualAnnotation[];
  pmBadcaseCodes: string[];
  alignment: AlignmentStatus;
}

export function buildMergedDimensionViews(
  output: ModelOutput,
  dimensionScores?: DimensionScore[]
): MergedDimensionView[] {
  const dimensionKeys = [
    'Persona Consistency (角色一致性)',
    'Emotional Understanding (情绪理解)',
    'Narrative Drive (叙事牵引力)',
    'Authentic Interaction (真实互动感)',
    'Relationship Continuity (关系连续性)',
  ];

  return dimensionKeys.map((dimKey) => {
    const judgeDim = dimensionScores?.find((ds) => dimensionsMatch(ds.dimension, dimKey));
    const { annotations, badcaseCodes } = getPmTagsForDimension(output, dimKey);
    const pmHasIssue = annotations.length > 0 || badcaseCodes.length > 0;
    const judgeHasDeduction = !!(judgeDim?.deductionPoint && judgeDim.deductionPoint !== '无');

    return {
      dimension: dimKey,
      shortName: getDimensionShortName(dimKey),
      judgeScore: judgeDim?.score,
      judgeRationale: judgeDim?.rationale,
      judgeDeduction: judgeDim?.deductionPoint,
      pmAnnotations: annotations,
      pmBadcaseCodes: badcaseCodes,
      alignment: computeAlignment(pmHasIssue, judgeHasDeduction),
    };
  });
}

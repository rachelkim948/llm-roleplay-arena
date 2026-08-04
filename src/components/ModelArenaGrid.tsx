import React, { useState } from 'react';
import { ModelConfig, ModelOutput, ChatMessage, ManualAnnotation } from '../types';
import { BADCASE_TAXONOMY } from '../data/presets';
import {
  Cpu,
  Zap,
  Copy,
  Check,
  Tag,
  AlertCircle,
  RefreshCw,
  Send,
  MessageSquare,
  Trash2,
  Plus,
  Quote,
  X,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DIMENSION_OPTIONS = [
  {
    key: 'Persona Consistency (角色一致性)',
    label: '角色一致性 (25%)',
    shortLabel: '角色一致性',
    desc: '人设、性格、口吻、言行立场一致性 (含 BC03 人设一致性断裂)',
    chips: [
      'BC03: 人设一致性断裂(OOC)',
      '暴躁占有人设切圣母温柔',
      '遗忘过往恩怨与立场',
      '暴露AI身份与系统指令',
      '用词与时代/身份脱节',
    ],
  },
  {
    key: 'Emotional Understanding (情绪理解)',
    label: '情绪理解 (30%)',
    shortLabel: '情绪理解',
    desc: '感知隐性意图、反话与隐忍低落 (含 BC01/BC06)',
    chips: [
      'BC01: 隐性反向情绪识别失效',
      '听不懂反话/一推就走',
      'BC06: 低强度隐忍情绪感知迟钝',
      '忽视沉默落泪/自卑求助',
      '客服式机械安慰/无法共情',
    ],
  },
  {
    key: 'Narrative Drive (叙事牵引力)',
    label: '叙事牵引力 (10%)',
    shortLabel: '叙事牵引力',
    desc: '破局主动性与开放性 Hook 引导 (含 BC05/BC08)',
    chips: [
      'BC08: 高危场景被动不作为',
      '缺乏破局主动性(Passive Agency)',
      'BC05: 核心矛盾转移回避(扯甜品/看花)',
      '句末封闭无 Hook/把推进甩给用户',
      '无法触发风险干预',
    ],
  },
  {
    key: 'Authentic Interaction (真实互动感)',
    label: '真实互动感 (20%)',
    shortLabel: '真实互动感',
    desc: '口语真实感、无套路坍缩与圣父化 (含 BC02/BC04)',
    chips: [
      'BC04: 表达坍缩/高频“数睫毛”词汇轰炸',
      '过度抽象隐喻/非口语不说人话',
      'BC02: 单向输出/“圣父化”对齐失真',
      '一拳打在棉花上/不敢发脾气',
      '油腻网文剧场感/AI说教',
    ],
  },
  {
    key: 'Relationship Continuity (关系连续性)',
    label: '关系连续性 (15%)',
    shortLabel: '关系连续性',
    desc: '锚定既有羁绊、长剧情关键记忆 (含 BC07)',
    chips: [
      'BC07: 长剧情关键事件记忆丢失',
      '遗忘前文第三方人物(堂妹/前任)',
      '前后剧情冲突伏笔断裂',
      '忘记已有亲密/对立羁绊',
      '关系边界处理粗暴',
    ],
  },
];

interface ModelArenaGridProps {
  models: ModelConfig[];
  outputs: Record<string, ModelOutput>;
  chatHistory: ChatMessage[];
  isGenerating: boolean;
  onTagBadcase: (modelId: string, badcaseCode: string) => void;
  onAddAnnotation: (
    modelId: string,
    annotation: { dimension: string; quotedText?: string; reason: string }
  ) => void;
  onDeleteAnnotation: (modelId: string, annotationId: string) => void;
  onRegenerateSingle?: (modelId: string) => void;
  onSendMultiTurn: (nextText: string) => Promise<void>;
  onClearHistory: () => void;
}

// Subcomponent to highlight quotes inside text
const HighlightedResponseText: React.FC<{
  text: string;
  annotations?: ManualAnnotation[];
}> = ({ text, annotations = [] }) => {
  if (!text) return null;

  const quotes = annotations
    .map((a) => a.quotedText?.trim())
    .filter((q): q is string => !!q && text.includes(q));

  if (quotes.length === 0) {
    return <div className="whitespace-pre-wrap leading-relaxed">{text}</div>;
  }

  // Deduplicate and sort quotes by length descending to match longest substring first
  const uniqueQuotes = Array.from(new Set(quotes)).sort((a, b) => b.length - a.length);
  const escaped = uniqueQuotes.map((q) => q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'g');
  const parts = text.split(regex);

  return (
    <div className="whitespace-pre-wrap leading-relaxed">
      {parts.map((part, i) => {
        const matchingAnno = annotations.find((a) => a.quotedText?.trim() === part);
        if (matchingAnno) {
          const dimObj = DIMENSION_OPTIONS.find((d) => d.key === matchingAnno.dimension);
          const shortDim = dimObj ? dimObj.shortLabel : matchingAnno.dimension.split(' ')[0];
          return (
            <mark
              key={i}
              className="bg-amber-500/25 text-amber-200 px-1 py-0.5 rounded border-b border-amber-400 font-semibold cursor-help transition-all hover:bg-amber-500/40 inline-block my-0.5"
              title={`【PM 标注 - ${shortDim}】${matchingAnno.reason}`}
            >
              <span className="text-[10px] text-amber-300 font-mono mr-1 opacity-90">📌[{shortDim}]</span>
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};

export const ModelArenaGrid: React.FC<ModelArenaGridProps> = ({
  models,
  outputs,
  chatHistory,
  isGenerating,
  onTagBadcase,
  onAddAnnotation,
  onDeleteAnnotation,
  onRegenerateSingle,
  onSendMultiTurn,
  onClearHistory,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [multiTurnInput, setMultiTurnInput] = useState<string>('');

  // Floating text selection state
  const [floatingSelection, setFloatingSelection] = useState<{
    modelId: string;
    text: string;
  } | null>(null);

  // Annotation Modal state
  const [activeAnnoModalModelId, setActiveAnnoModalModelId] = useState<string | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<string>(DIMENSION_OPTIONS[0].key);
  const [quotedText, setQuotedText] = useState<string>('');
  const [reasonInput, setReasonInput] = useState<string>('');

  const handleCopy = (modelId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(modelId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSendNextTurn = async () => {
    if (!multiTurnInput.trim() || isGenerating) return;
    const text = multiTurnInput;
    setMultiTurnInput('');
    await onSendMultiTurn(text);
  };

  // Handle text selection inside output box
  const handleMouseUpBox = (modelId: string) => {
    const sel = window.getSelection();
    if (sel) {
      const selectedStr = sel.toString().trim();
      if (selectedStr.length > 0) {
        setFloatingSelection({ modelId, text: selectedStr });
        return;
      }
    }
  };

  // Open Annotation modal with optional quote
  const handleOpenAnnoModal = (modelId: string, initialQuote: string = '') => {
    setActiveAnnoModalModelId(modelId);
    setQuotedText(initialQuote || (floatingSelection?.modelId === modelId ? floatingSelection.text : ''));
    setSelectedDimension(DIMENSION_OPTIONS[0].key);
    setReasonInput('');
    setFloatingSelection(null);
  };

  const handleSaveAnnotation = () => {
    if (!activeAnnoModalModelId || !reasonInput.trim()) return;
    onAddAnnotation(activeAnnoModalModelId, {
      dimension: selectedDimension,
      quotedText: quotedText.trim() || undefined,
      reason: reasonInput.trim(),
    });
    setActiveAnnoModalModelId(null);
    setQuotedText('');
    setReasonInput('');
  };

  const handleAddChipToReason = (chip: string) => {
    if (!reasonInput.trim()) {
      setReasonInput(chip);
    } else if (!reasonInput.includes(chip)) {
      setReasonInput(`${reasonInput}，${chip}`);
    }
  };

  const hasHistory = chatHistory.length > 0;
  const turnCount = Math.floor(chatHistory.filter((m) => m.sender === 'user').length);

  const activeModalModel = models.find((m) => m.id === activeAnnoModalModelId);
  const activeDimObj = DIMENSION_OPTIONS.find((d) => d.key === selectedDimension) || DIMENSION_OPTIONS[0];

  return (
    <div className="space-y-4 relative">
      {/* Top Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Cpu className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-bold text-slate-200">
            三模型 Side-by-Side 竞技与多轮对抗
          </h3>
          {turnCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              已进行 {turnCount} 轮对话
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {hasHistory && (
            <button
              onClick={onClearHistory}
              className="text-xs text-slate-400 hover:text-red-300 flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-red-500/10 border border-slate-700/60 transition-colors"
              title="重置对话记录"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>清空重置对话</span>
            </button>
          )}
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            3-Model Simultaneous Execution
          </span>
        </div>
      </div>

      {/* Floating Quote Trigger Banner */}
      <AnimatePresence>
        {floatingSelection && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-2.5 bg-amber-500/20 border border-amber-500/50 rounded-xl shadow-lg flex items-center justify-between text-xs text-amber-200 backdrop-blur-md z-20"
          >
            <div className="flex items-center space-x-2 truncate mr-2">
              <Quote className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="font-semibold text-slate-200 shrink-0">选中词句:</span>
              <span className="font-mono text-amber-300 truncate bg-slate-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                “{floatingSelection.text}”
              </span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => handleOpenAnnoModal(floatingSelection.modelId, floatingSelection.text)}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1 transition-all shadow-md active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>引用此句添加 5 维 Badcase 标注</span>
              </button>
              <button
                onClick={() => setFloatingSelection(null)}
                className="p-1 hover:bg-amber-500/30 rounded text-amber-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3 Model Parallel Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {models.map((model) => {
          const output = outputs[model.id] || {
            modelId: model.id,
            text: '',
            latencyMs: 0,
            tokenCount: 0,
            tokensPerSec: 0,
            status: 'idle',
            detectedBadcases: [],
            manualBadcases: [],
            manualAnnotations: [],
            sentimentScore: 0,
          };

          const isCopied = copiedId === model.id;
          const isDone = output.status === 'completed';
          const isModelGenerating = output.status === 'generating' || (isGenerating && !isDone);

          return (
            <motion.div
              key={model.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`rounded-2xl border bg-slate-900/90 flex flex-col justify-between overflow-hidden shadow-xl transition-all ${
                isModelGenerating
                  ? 'border-purple-500/60 shadow-purple-500/10 ring-1 ring-purple-500/30'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Header */}
              <div className={`p-3.5 border-b border-slate-800 bg-gradient-to-r ${model.bgGradient}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{model.avatar}</span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 flex items-center space-x-1">
                        <span>{model.name}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400">{model.styleTrait}</p>
                    </div>
                  </div>

                  {output.status === 'completed' && output.text && (
                    <button
                      onClick={() => handleCopy(model.id, output.text)}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="复制最新回复"
                    >
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Performance Metrics Bar */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80 mt-2">
                  <div className="flex items-center space-x-1">
                    <Zap className="h-3 w-3 text-amber-400" />
                    <span>{output.latencyMs ? `${output.latencyMs}ms` : '--'}</span>
                  </div>
                  <div>{output.tokenCount ? `${output.tokenCount} chars` : '--'}</div>
                  <div className="text-purple-300">
                    {output.tokensPerSec ? `${output.tokensPerSec} t/s` : '--'}
                  </div>
                </div>
              </div>

              {/* Output & Multi-Turn Stream Content Area */}
              <div className="p-4 flex-1 flex flex-col justify-between min-h-[260px] space-y-3">
                {/* Mode A: Multi-turn Chat History Active */}
                {hasHistory ? (
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[420px] pr-1 scrollbar-thin">
                    {chatHistory.map((msg, idx) => {
                      if (msg.sender === 'user') {
                        const userTurnNum = Math.floor(
                          chatHistory.slice(0, idx + 1).filter((m) => m.sender === 'user').length
                        );
                        return (
                          <div key={msg.id} className="flex justify-end my-1">
                            <div className="bg-purple-600/30 text-purple-200 border border-purple-500/30 rounded-xl rounded-tr-none px-3 py-2 text-xs leading-relaxed max-w-[85%]">
                              <span className="text-[10px] text-purple-400 font-bold block mb-0.5">
                                我 (第 {userTurnNum} 轮):
                              </span>
                              {msg.userText}
                            </div>
                          </div>
                        );
                      } else if (msg.sender === 'models') {
                        const modelResponse = msg.modelResponses?.[model.id] || '（无响应）';
                        const isLatestModelTurn = idx === chatHistory.length - 1;
                        return (
                          <div key={msg.id} className="my-1">
                            <div
                              onMouseUp={() => isLatestModelTurn && handleMouseUpBox(model.id)}
                              className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans cursor-text selection:bg-amber-500/30 selection:text-amber-200"
                            >
                              {isLatestModelTurn ? (
                                <HighlightedResponseText
                                  text={modelResponse}
                                  annotations={output.manualAnnotations}
                                />
                              ) : (
                                <div className="whitespace-pre-wrap">{modelResponse}</div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}

                    {isModelGenerating && (
                      <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center space-x-2 text-xs text-purple-300">
                        <div className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                        <span className="font-mono animate-pulse">思考与生成后续回复中...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Mode B: Single Turn Direct Display */
                  <div className="flex-1">
                    {isModelGenerating ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
                        <div className="relative">
                          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <span className="text-xs font-mono animate-pulse">模型思维生成中...</span>
                      </div>
                    ) : output.status === 'error' ? (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                        <span>生成出错: {output.error || '无法获得模型响应'}</span>
                      </div>
                    ) : output.text ? (
                      <div
                        onMouseUp={() => handleMouseUpBox(model.id)}
                        className="relative bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans cursor-text selection:bg-amber-500/30 selection:text-amber-200"
                      >
                        <HighlightedResponseText
                          text={output.text}
                          annotations={output.manualAnnotations}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-600 text-xs">
                        <span>点击上方“并发发送给 3 模型”启动测试</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Display List of Tagged 5-Dimension Annotations */}
                {output.manualAnnotations && output.manualAnnotations.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <div className="text-[11px] font-bold text-amber-300 flex items-center space-x-1">
                      <Quote className="h-3 w-3 text-amber-400" />
                      <span>PM 5 维归因与划词标注 ({output.manualAnnotations.length}):</span>
                    </div>
                    <div className="space-y-1.5">
                      {output.manualAnnotations.map((anno) => {
                        const dimObj = DIMENSION_OPTIONS.find((d) => d.key === anno.dimension);
                        const dimName = dimObj ? dimObj.shortLabel : anno.dimension.split(' ')[0];
                        return (
                          <div
                            key={anno.id}
                            className="p-2 rounded-xl bg-slate-950 border border-amber-500/30 text-xs flex items-start justify-between gap-2 shadow-sm"
                          >
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <div className="flex items-center space-x-1.5 flex-wrap">
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0">
                                  {dimName}
                                </span>
                                {anno.quotedText && (
                                  <span className="text-[10px] text-amber-200/90 font-mono truncate bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 max-w-[180px]">
                                    “{anno.quotedText}”
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-300 leading-tight">
                                <span className="text-slate-500 font-semibold">具体原因/指标：</span>
                                {anno.reason}
                              </p>
                            </div>
                            <button
                              onClick={() => onDeleteAnnotation(model.id, anno.id)}
                              className="text-slate-500 hover:text-red-400 p-1 transition-colors shrink-0"
                              title="删除此标注"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PM Manual Badcase Annotation Trigger Section */}
                {(output.text || hasHistory) && (
                  <div className="pt-2.5 border-t border-slate-800/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-1 text-[11px] font-semibold text-slate-300">
                        <Tag className="h-3 w-3 text-purple-400" />
                        <span>PM 5 维选择+填空标记：</span>
                      </span>

                      <button
                        onClick={() => handleOpenAnnoModal(model.id)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 flex items-center space-x-1 transition-all"
                      >
                        <Plus className="h-3 w-3" />
                        <span>新增 5 维 Badcase 标注</span>
                      </button>
                    </div>

                    {/* Quick Badcase Taxonomy Legacy Badges */}
                    <div className="flex flex-wrap gap-1">
                      {BADCASE_TAXONOMY.map((b) => {
                        const isTagged = (output.manualBadcases || []).includes(b.code);
                        return (
                          <button
                            key={b.code}
                            onClick={() => onTagBadcase(model.id, b.code)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
                              isTagged
                                ? 'bg-red-500/20 text-red-300 border-red-500/60 shadow-sm'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                            }`}
                            title={b.desc}
                          >
                            {b.code}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Single Regenerate Button */}
                {output.text && onRegenerateSingle && !hasHistory && (
                  <div className="pt-2 border-t border-slate-800/40 flex justify-end">
                    <button
                      onClick={() => onRegenerateSingle(model.id)}
                      disabled={isGenerating}
                      className="text-[11px] text-slate-400 hover:text-purple-300 flex items-center space-x-1 transition-colors"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>单独重新生成</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Annotation Modal (Select 5 Dimensions + Fill Specific Reason + Quote Substring) */}
      <AnimatePresence>
        {activeAnnoModalModelId && activeModalModel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-purple-500/40 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Edit3 className="h-4 w-4 text-purple-400" />
                  <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-1.5">
                    <span>PM 5维 Badcase 标注:</span>
                    <span className="text-purple-300 font-extrabold">{activeModalModel.name}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setActiveAnnoModalModelId(null)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Step 1: Select 5 Dimension */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center space-x-1">
                  <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono flex items-center justify-center border border-purple-500/30">
                    1
                  </span>
                  <span>选择归因维度 (5 大 Benchmark 核心维度):</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DIMENSION_OPTIONS.map((dim) => {
                    const isSelected = selectedDimension === dim.key;
                    return (
                      <button
                        key={dim.key}
                        type="button"
                        onClick={() => setSelectedDimension(dim.key)}
                        className={`p-2 rounded-xl text-left border text-xs transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-purple-600/20 border-purple-500 text-purple-200 ring-1 ring-purple-500/40'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                        }`}
                      >
                        <span className="font-bold text-slate-200">{dim.label}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{dim.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Quoted Text Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center space-x-1">
                    <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono flex items-center justify-center border border-purple-500/30">
                      2
                    </span>
                    <span>引用/定位具体词句 (可在输出文本中直接划词抓取):</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={quotedText}
                    onChange={(e) => setQuotedText(e.target.value)}
                    placeholder='选填：粘贴或输入高亮词句（如：“平生最讨厌别人拿规矩压我”）'
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-200 font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                  {quotedText && (
                    <button
                      onClick={() => setQuotedText('')}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Step 3: Specific Reason / Indicator Input + Quick Chips */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-200 flex items-center space-x-1">
                  <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-mono flex items-center justify-center border border-purple-500/30">
                    3
                  </span>
                  <span>填空：具体指标或扣分原因分析:</span>
                </label>

                {/* Quick Chips for Active Dimension */}
                <div className="flex flex-wrap gap-1 mb-1">
                  <span className="text-[10px] text-slate-500 self-center mr-1">快捷指标:</span>
                  {activeDimObj.chips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleAddChipToReason(chip)}
                      className="px-2 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-purple-900/40 text-purple-300 hover:text-purple-200 border border-slate-700/80 transition-all"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="请输入具体的指标异常或扣分原因（如：此处台词过多剧场描写，霸道总裁油腻感过度，缺乏真实的夫妻情感拉扯）..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 leading-relaxed resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setActiveAnnoModalModelId(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveAnnotation}
                  disabled={!reasonInput.trim()}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all ${
                    !reasonInput.trim()
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 active:scale-95'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>保存 5 维 Badcase 标注</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Integrated Multi-Turn Control Input Bar (多轮对抗与剧情追问) */}
      {((Object.values(outputs) as ModelOutput[]).some((o) => o.text && o.status === 'completed') || hasHistory) && (
        <div className="p-3.5 bg-slate-900/90 border border-purple-500/30 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center space-x-2 shrink-0">
            <MessageSquare className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-bold text-slate-200">
              继续多轮追问与剧情对抗
            </span>
          </div>

          <div className="flex-1 w-full flex items-center space-x-2">
            <input
              type="text"
              value={multiTurnInput}
              onChange={(e) => setMultiTurnInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendNextTurn()}
              placeholder="输入下一轮话术对白或剧情推进 (如：“那你凭什么用这种眼神看着我？”)..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleSendNextTurn}
              disabled={!multiTurnInput.trim() || isGenerating}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shrink-0 transition-all ${
                !multiTurnInput.trim() || isGenerating
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-500 shadow-md shadow-purple-600/30 active:scale-95'
              }`}
            >
              <span>并发发送下一轮</span>
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

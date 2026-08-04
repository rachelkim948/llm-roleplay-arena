import React, { useState } from 'react';
import { DEFAULT_MODELS, PRESET_PERSONAS } from './data/presets';
import { ModelOutput, EvaluationResult, ChatMessage, ManualAnnotation } from './types';
import { Navbar } from './components/Navbar';
import { PromptConfigurator } from './components/PromptConfigurator';
import { ModelArenaGrid } from './components/ModelArenaGrid';
import { JudgeEvaluationPanel } from './components/JudgeEvaluationPanel';
import { MultiTurnChat } from './components/MultiTurnChat';
import { PortfolioExportModal } from './components/PortfolioExportModal';
import { Sparkles, Trophy, Cpu, Swords } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'arena' | 'attribution' | 'report'>('arena');
  const [systemPrompt, setSystemPrompt] = useState<string>(PRESET_PERSONAS[0].systemPrompt);
  const [scenarioPrompt, setScenarioPrompt] = useState<string>(PRESET_PERSONAS[0].scenarioPrompt || '');
  const [userMessage, setUserMessage] = useState<string>(PRESET_PERSONAS[0].initialUserMessage);
  const [temperature, setTemperature] = useState<number>(0.75);
  const [customDeepSeekKey, setCustomDeepSeekKey] = useState<string>('');
  const [customQwenKey, setCustomQwenKey] = useState<string>('');
  const [customGlmKey, setCustomGlmKey] = useState<string>('');
  const [customKimiKey, setCustomKimiKey] = useState<string>('');

  const [outputs, setOutputs] = useState<Record<string, ModelOutput>>({});
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // Helper to combine character persona & current scenario prompt
  const getEffectiveSystemPrompt = () => {
    if (!scenarioPrompt.trim()) return systemPrompt;
    return `${systemPrompt}\n\n【当前情景/背景上下文】\n${scenarioPrompt}`;
  };

  // 1. Parallel 3-Model Generation Trigger (Turn 1)
  const handleRunArena = async () => {
    if (!userMessage.trim() || isGenerating) return;

    setIsGenerating(true);
    const effectiveSystemPrompt = getEffectiveSystemPrompt();

    // Set initial loading state for all models
    const initialOutputs: Record<string, ModelOutput> = {};
    DEFAULT_MODELS.forEach((m) => {
      initialOutputs[m.id] = {
        modelId: m.id,
        text: '',
        latencyMs: 0,
        tokenCount: 0,
        tokensPerSec: 0,
        status: 'generating',
        detectedBadcases: [],
        manualBadcases: outputs[m.id]?.manualBadcases || [],
        sentimentScore: 0,
      };
    });
    setOutputs(initialOutputs);

    const generatedResponses: Record<string, string> = {};

    // Fire parallel HTTP POST requests
    const promises = DEFAULT_MODELS.map(async (model) => {
      const startTime = Date.now();
      try {
        const res = await fetch('/api/arena/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelId: model.id,
            systemPrompt: effectiveSystemPrompt,
            userMessage,
            temperature,
            customDeepSeekKey,
            customQwenKey,
            customGlmKey,
            customKimiKey,
            customApiKey: customDeepSeekKey,
          }),
        });

        const data = await res.json();
        const latencyMs = Date.now() - startTime;

        if (!res.ok) {
          throw new Error(data.error || 'Model response error');
        }

        const resText = data.text || '';
        generatedResponses[model.id] = resText;

        setOutputs((prev) => ({
          ...prev,
          [model.id]: {
            modelId: model.id,
            text: resText,
            latencyMs: data.latencyMs || latencyMs,
            tokenCount: data.tokenCount || 0,
            tokensPerSec: data.tokensPerSec || 20,
            status: 'completed',
            detectedBadcases: [],
            manualBadcases: prev[model.id]?.manualBadcases || [],
            sentimentScore: 85,
          },
        }));
      } catch (err: any) {
        console.error(`Error generating for ${model.id}:`, err);
        setOutputs((prev) => ({
          ...prev,
          [model.id]: {
            modelId: model.id,
            text: '',
            latencyMs: Date.now() - startTime,
            tokenCount: 0,
            tokensPerSec: 0,
            status: 'error',
            error: err.message || '网络或API异常',
            detectedBadcases: [],
            manualBadcases: prev[model.id]?.manualBadcases || [],
            sentimentScore: 0,
          },
        }));
      }
    });

    await Promise.all(promises);

    // Save initial turn to chatHistory
    const userTurn: ChatMessage = {
      id: `turn-1-user-${Date.now()}`,
      sender: 'user',
      userText: userMessage,
      timestamp: Date.now(),
    };
    const modelTurn: ChatMessage = {
      id: `turn-1-models-${Date.now()}`,
      sender: 'models',
      modelResponses: generatedResponses,
      timestamp: Date.now(),
    };
    setChatHistory([userTurn, modelTurn]);

    setIsGenerating(false);
  };

  // 2. Single Model Regenerate
  const handleRegenerateSingle = async (modelId: string) => {
    if (!userMessage.trim() || isGenerating) return;

    setOutputs((prev) => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        status: 'generating',
      },
    }));

    const startTime = Date.now();
    const effectiveSystemPrompt = getEffectiveSystemPrompt();

    try {
      const res = await fetch('/api/arena/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          systemPrompt: effectiveSystemPrompt,
          userMessage,
          temperature,
          customDeepSeekKey,
          customQwenKey,
          customGlmKey,
          customKimiKey,
          customApiKey: customDeepSeekKey,
        }),
      });

      const data = await res.json();
      const latencyMs = Date.now() - startTime;

      setOutputs((prev) => ({
        ...prev,
        [modelId]: {
          modelId,
          text: data.text || '',
          latencyMs: data.latencyMs || latencyMs,
          tokenCount: data.tokenCount || 0,
          tokensPerSec: data.tokensPerSec || 20,
          status: 'completed',
          detectedBadcases: [],
          manualBadcases: prev[modelId]?.manualBadcases || [],
          sentimentScore: 85,
        },
      }));
    } catch (err: any) {
      setOutputs((prev) => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          status: 'error',
          error: err.message || '生成出错',
        },
      }));
    }
  };

  // 3. Manual Badcase Annotation (Select 5 Dimensions + Fill Reason + Quote Sentence)
  const handleAddAnnotation = (
    modelId: string,
    annotation: { dimension: string; quotedText?: string; reason: string }
  ) => {
    setOutputs((prev) => {
      const current = prev[modelId] || {
        modelId,
        text: '',
        latencyMs: 0,
        tokenCount: 0,
        tokensPerSec: 0,
        status: 'completed',
        detectedBadcases: [],
        manualBadcases: [],
        manualAnnotations: [],
        sentimentScore: 85,
      };

      const newAnno: ManualAnnotation = {
        id: `anno-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        dimension: annotation.dimension,
        quotedText: annotation.quotedText,
        reason: annotation.reason,
        createdAt: Date.now(),
      };

      return {
        ...prev,
        [modelId]: {
          ...current,
          manualAnnotations: [...(current.manualAnnotations || []), newAnno],
        },
      };
    });
  };

  const handleDeleteAnnotation = (modelId: string, annotationId: string) => {
    setOutputs((prev) => {
      const current = prev[modelId];
      if (!current) return prev;
      return {
        ...prev,
        [modelId]: {
          ...current,
          manualAnnotations: (current.manualAnnotations || []).filter((a) => a.id !== annotationId),
        },
      };
    });
  };

  const handleTagBadcase = (modelId: string, badcaseCode: string) => {
    setOutputs((prev) => {
      const current = prev[modelId];
      if (!current) return prev;

      const existingTags = current.manualBadcases || [];
      const isTagged = existingTags.includes(badcaseCode);
      const newTags = isTagged
        ? existingTags.filter((t) => t !== badcaseCode)
        : [...existingTags, badcaseCode];

      return {
        ...prev,
        [modelId]: {
          ...current,
          manualBadcases: newTags,
        },
      };
    });
  };

  // 4. Run LLM-as-a-Judge Evaluation (打包投去评测)
  const handleRunEvaluation = async () => {
    const outputList = Object.values(outputs) as ModelOutput[];
    const validOutputs = outputList.filter((o) => o.text && o.status === 'completed');
    if (validOutputs.length === 0 || isEvaluating) return;

    setIsEvaluating(true);
    setActiveTab('attribution');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const effectiveSystemPrompt = getEffectiveSystemPrompt();

    try {
      const res = await fetch('/api/arena/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: effectiveSystemPrompt,
          userMessage,
          outputs: validOutputs.map((o) => {
            const m = DEFAULT_MODELS.find((mod) => mod.id === o.modelId);
            return {
              modelId: o.modelId,
              modelName: m?.name || o.modelId,
              text: o.text,
              manualAnnotations: o.manualAnnotations || [],
            };
          }),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Evaluation error');

      setEvaluationResult(data);
    } catch (err: any) {
      console.error('Error running evaluation:', err);
      alert(`评测失败: ${err.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  // 5. Multi-Turn Response Handler
  const handleSendMultiTurn = async (
    userText: string,
    history: ChatMessage[]
  ): Promise<Record<string, string>> => {
    const result: Record<string, string> = {};
    const effectiveSystemPrompt = getEffectiveSystemPrompt();

    const promises = DEFAULT_MODELS.map(async (model) => {
      try {
        const historyPayload = history.flatMap((h) => {
          if (h.sender === 'user' && h.userText) {
            return [{ sender: 'user', text: h.userText }];
          } else if (h.sender === 'models' && h.modelResponses?.[model.id]) {
            return [{ sender: 'model', text: h.modelResponses[model.id] }];
          }
          return [];
        });

        const res = await fetch('/api/arena/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelId: model.id,
            systemPrompt: effectiveSystemPrompt,
            userMessage: userText,
            history: historyPayload,
            temperature,
            customDeepSeekKey,
            customQwenKey,
            customGlmKey,
            customKimiKey,
            customApiKey: customDeepSeekKey,
          }),
        });

        const data = await res.json();
        result[model.id] = data.text || '（无响应）';
      } catch (e: any) {
        result[model.id] = `（请求失败: ${e.message}）`;
      }
    });

    await Promise.all(promises);
    return result;
  };

  // Handler for sending subsequent turns in the merged Arena Grid
  const handleSendMultiTurnNext = async (nextUserText: string) => {
    if (!nextUserText.trim() || isGenerating) return;
    setIsGenerating(true);

    const newUserMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      userText: nextUserText,
      timestamp: Date.now(),
    };

    const updatedHistory = [...chatHistory, newUserMsg];
    setChatHistory(updatedHistory);

    const responses = await handleSendMultiTurn(nextUserText, chatHistory);

    const newModelMsg: ChatMessage = {
      id: `models-${Date.now()}`,
      sender: 'models',
      modelResponses: responses,
      timestamp: Date.now(),
    };

    setChatHistory([...updatedHistory, newModelMsg]);

    // Update outputs with the latest responses for Badcase tagging and LLM Judge
    DEFAULT_MODELS.forEach((m) => {
      if (responses[m.id]) {
        setOutputs((prev) => ({
          ...prev,
          [m.id]: {
            ...prev[m.id],
            modelId: m.id,
            text: responses[m.id],
            status: 'completed',
          },
        }));
      }
    });

    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasEvaluations={!!evaluationResult}
      />

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* TAB 1: Main Arena Workbench (Unified Side-by-Side & Multi-Turn) */}
        {activeTab === 'arena' && (
          <>
            {/* Prompt Configurator */}
            <PromptConfigurator
              systemPrompt={systemPrompt}
              setSystemPrompt={setSystemPrompt}
              scenarioPrompt={scenarioPrompt}
              setScenarioPrompt={setScenarioPrompt}
              userMessage={userMessage}
              setUserMessage={setUserMessage}
              temperature={temperature}
              setTemperature={setTemperature}
              customDeepSeekKey={customDeepSeekKey}
              setCustomDeepSeekKey={setCustomDeepSeekKey}
              customQwenKey={customQwenKey}
              setCustomQwenKey={setCustomQwenKey}
              customGlmKey={customGlmKey}
              setCustomGlmKey={setCustomGlmKey}
              customKimiKey={customKimiKey}
              setCustomKimiKey={setCustomKimiKey}
              onRunArena={handleRunArena}
              isGenerating={isGenerating}
            />

            {/* Side-by-Side 3-Model Grid with Integrated Multi-Turn Sandbox */}
            <ModelArenaGrid
              models={DEFAULT_MODELS}
              outputs={outputs}
              chatHistory={chatHistory}
              isGenerating={isGenerating}
              onTagBadcase={handleTagBadcase}
              onAddAnnotation={handleAddAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
              onRegenerateSingle={handleRegenerateSingle}
              onSendMultiTurn={handleSendMultiTurnNext}
              onClearHistory={() => setChatHistory([])}
            />

            {/* Quick LLM Judge CTA when outputs exist */}
            {(Object.values(outputs) as ModelOutput[]).some((o) => o.text && o.status === 'completed') && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-slate-900 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold">
                    🏆
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">
                      3 模型结果已并行生成！准备打包送评测
                    </h4>
                    <p className="text-xs text-slate-400">
                      一键启动 LLM-as-a-Judge，分析 3 家模型的胜负、雷达图及 Badcase 深度归因
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRunEvaluation}
                  disabled={isEvaluating}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 text-white font-bold text-xs hover:brightness-110 shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center space-x-2 shrink-0"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>打包投去评测</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* TAB 3: LLM Evaluation & Badcase Deep Attribution */}
        {activeTab === 'attribution' && (
          <JudgeEvaluationPanel
            models={DEFAULT_MODELS}
            outputs={outputs}
            evaluationResult={evaluationResult}
            isEvaluating={isEvaluating}
            systemPrompt={systemPrompt}
            userMessage={userMessage}
          />
        )}

        {/* TAB 4: Portfolio Markdown Exporter */}
        {activeTab === 'report' && (
          <PortfolioExportModal
            models={DEFAULT_MODELS}
            systemPrompt={systemPrompt}
            userMessage={userMessage}
            outputs={outputs}
            evaluationResult={evaluationResult}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>
          AI 模型策略 (情感陪伴/角色扮演) PM 实习作品集竞技场 · Powered by Gemini API & Vibe Coding
        </p>
      </footer>
    </div>
  );
}

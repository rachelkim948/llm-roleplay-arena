import React, { useState, useEffect } from 'react';
import { PRESET_PERSONAS } from '../data/presets';
import { PresetPersona } from '../types';
import { Sparkles, MessageSquare, Sliders, UserCheck, Play, RotateCcw, Compass, Lightbulb, Plus, Save, Trash2, BookmarkCheck, X } from 'lucide-react';

interface PromptConfiguratorProps {
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  scenarioPrompt: string;
  setScenarioPrompt: (prompt: string) => void;
  userMessage: string;
  setUserMessage: (msg: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  customDeepSeekKey: string;
  setCustomDeepSeekKey: (key: string) => void;
  customQwenKey?: string;
  setCustomQwenKey?: (key: string) => void;
  customGlmKey: string;
  setCustomGlmKey: (key: string) => void;
  customKimiKey?: string;
  setCustomKimiKey?: (key: string) => void;
  onRunArena: () => void;
  isGenerating: boolean;
}

const CUSTOM_PRESETS_STORAGE_KEY = 'llm_arena_custom_presets_v1';

export const PromptConfigurator: React.FC<PromptConfiguratorProps> = ({
  systemPrompt,
  setSystemPrompt,
  scenarioPrompt,
  setScenarioPrompt,
  userMessage,
  setUserMessage,
  temperature,
  setTemperature,
  customDeepSeekKey,
  setCustomDeepSeekKey,
  customQwenKey = '',
  setCustomQwenKey,
  customGlmKey,
  setCustomGlmKey,
  customKimiKey = '',
  setCustomKimiKey,
  onRunArena,
  isGenerating,
}) => {
  const [activePersonaId, setActivePersonaId] = useState<string>(PRESET_PERSONAS[0].id);
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [customPresets, setCustomPresets] = useState<PresetPersona[]>([]);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [saveName, setSaveName] = useState<string>('');

  // Load custom presets from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
      if (saved) {
        setCustomPresets(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to parse custom presets from localStorage', e);
    }
  }, []);

  const saveCustomPresetsToStorage = (updatedList: PresetPersona[]) => {
    setCustomPresets(updatedList);
    try {
      localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.error('Failed to save custom presets to localStorage', e);
    }
  };

  const handleSelectPersona = (persona: PresetPersona) => {
    setActivePersonaId(persona.id);
    setSystemPrompt(persona.systemPrompt);
    setScenarioPrompt(persona.scenarioPrompt || '');
    setUserMessage(persona.initialUserMessage);
  };

  const handleSelectBlankCustom = () => {
    setActivePersonaId('custom-blank');
    setSystemPrompt(`【系统设定 / System Persona】\n你现在正在与我进行一场沉浸式的角色扮演（Role-Playing）。\n- 角色身份：`);
    setScenarioPrompt('设定此时此刻对话发生的特定场合与背景上下文...');
    setUserMessage('');
  };

  const handleSaveCurrentAsPreset = () => {
    if (!saveName.trim()) return;
    const newPreset: PresetPersona = {
      id: `custom-${Date.now()}`,
      name: saveName.trim(),
      category: '自定义',
      systemPrompt,
      scenarioPrompt,
      initialUserMessage: userMessage,
      recommendedCriteria: ['角色拟真度', '共情与表达', '人设稳定度', '互动推剧情'],
    };

    const updated = [newPreset, ...customPresets];
    saveCustomPresetsToStorage(updated);
    setActivePersonaId(newPreset.id);
    setShowSaveModal(false);
    setSaveName('');
  };

  const handleDeleteCustomPreset = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updated = customPresets.filter((p) => p.id !== id);
    saveCustomPresetsToStorage(updated);
    if (activePersonaId === id) {
      if (PRESET_PERSONAS.length > 0) {
        handleSelectPersona(PRESET_PERSONAS[0]);
      }
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur relative">
      {/* Top Header & Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h2 className="text-base font-bold text-slate-100">角色人设与场景测试配置</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            配置角色人设及背景情景，支持加载内置预设、自由自定义或存为专属预设
          </p>
        </div>

        {/* Persona Preset Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Default Built-in Presets */}
          {PRESET_PERSONAS.map((p) => {
            const isSelected = activePersonaId === p.id && systemPrompt === p.systemPrompt;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPersona(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 border ${
                  isSelected
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500/60 shadow-sm'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-700/60 hover:border-slate-600'
                }`}
              >
                <UserCheck className="h-3.5 w-3.5 text-purple-400" />
                <span>{p.name}</span>
              </button>
            );
          })}

          {/* User Custom Saved Presets */}
          {customPresets.map((cp) => {
            const isSelected = activePersonaId === cp.id;
            return (
              <div
                key={cp.id}
                onClick={() => handleSelectPersona(cp)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 border cursor-pointer group ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/50 shadow-sm'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-700/60 hover:border-slate-600'
                }`}
              >
                <BookmarkCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>{cp.name}</span>
                <button
                  onClick={(e) => handleDeleteCustomPreset(e, cp.id)}
                  title="删除该自定义预设"
                  className="p-0.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ml-0.5"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            );
          })}

          {/* Blank Custom Creation Button */}
          <button
            onClick={handleSelectBlankCustom}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 border ${
              activePersonaId === 'custom-blank'
                ? 'bg-cyan-600/30 text-cyan-200 border-cyan-500/60 shadow-sm'
                : 'bg-slate-800/40 text-cyan-400 border-dashed border-cyan-500/40 hover:bg-cyan-500/10'
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-cyan-400" />
            <span>➕ 自定义 / 空白新建</span>
          </button>
        </div>
      </div>

      {/* Save as Custom Preset Bar */}
      <div className="flex items-center justify-between mb-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
        <span className="text-xs text-slate-400 flex items-center space-x-1.5">
          <Lightbulb className="h-3.5 w-3.5 text-purple-400" />
          <span>您可以修改下方的人设和情景，并将其保存为专属预设方便复用：</span>
        </span>
        <button
          onClick={() => {
            setSaveName(
              activePersonaId.startsWith('custom-') ? '我的自定义预设' : `自定义 - ${systemPrompt.slice(0, 8)}...`
            );
            setShowSaveModal(true);
          }}
          className="px-3 py-1 rounded-lg text-xs font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600/30 transition-all flex items-center space-x-1.5 shadow-sm"
        >
          <Save className="h-3.5 w-3.5 text-purple-400" />
          <span>保存当前配置为预设</span>
        </button>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Save className="h-5 w-5 text-purple-400" />
                <h3 className="text-sm font-bold text-slate-100">保存为自定义测试预设</h3>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                预设名称
              </label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="例如：病娇黑化特训 / 霸总误会测试..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                autoFocus
              />
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-950/80 p-2.5 rounded-xl space-y-1 border border-slate-800 font-mono">
              <div><span className="text-purple-300">人设片段:</span> {systemPrompt.slice(0, 30)}...</div>
              <div><span className="text-indigo-300">情景片段:</span> {scenarioPrompt.slice(0, 30)}...</div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:bg-slate-800"
              >
                取消
              </button>
              <button
                onClick={handleSaveCurrentAsPreset}
                disabled={!saveName.trim()}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50"
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Prompt Section: 角色人设 & 当前情景 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* 1. 角色人设 (System Persona) */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center space-x-1">
              <UserCheck className="h-3.5 w-3.5 text-purple-400" />
              <span>1. 角色人设 (System Persona)</span>
            </label>
            <span className="text-[11px] text-slate-500">性格特质、身份、语言风格与禁忌边界</span>
          </div>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            placeholder="请输入角色的身份设定、性格特征、语言习惯及禁忌规约..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/80 font-mono resize-y leading-relaxed"
          />
        </div>

        {/* 2. 当前情景 (Scenario Context) */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-200 flex items-center space-x-1">
              <Compass className="h-3.5 w-3.5 text-indigo-400" />
              <span>2. 当前情景 (Scenario Context)</span>
            </label>
            <span className="text-[11px] text-slate-500">发生的特定场合、时间节点或背景前因</span>
          </div>
          <textarea
            value={scenarioPrompt}
            onChange={(e) => setScenarioPrompt(e.target.value)}
            rows={4}
            placeholder="设定此时此刻对话发起的特定场合（例如：深夜 23:30 在门前遇到刚加班完、疲惫不堪的用户）..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/80 font-mono resize-y leading-relaxed"
          />
        </div>
      </div>

      {/* User Message Input Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-200 flex items-center space-x-1">
            <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
            <span>用户测试输入 (User Message)</span>
          </label>
        </div>

        {/* Tip banner */}
        <div className="mb-2 p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200/90 flex items-start space-x-2">
          <Lightbulb className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-normal">
            <span className="font-semibold text-amber-300">💡 测试提示：</span>
            在此输入对 AI 角色发送的第一句话，或输入尝试逼近人设边界、情绪倾诉、逼问破功的测试测试话术（可测试模型是否能保持沉浸、共情与推剧情能力）。
          </p>
        </div>

        <textarea
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          rows={3}
          placeholder="输入要并发发送给 3 个 AI 模型的测试对白或试探话术..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/80 font-mono resize-y leading-relaxed"
        />
      </div>

      {/* Temperature Slider & Key Toggle & Action Button */}
      <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 flex-1 min-w-[180px]">
          <Sliders className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
            Temp: <span className="text-purple-300 font-mono font-bold">{temperature}</span>
          </span>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        <button
          onClick={() => setShowKeyInput(!showKeyInput)}
          className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1 border ${
            customDeepSeekKey || customQwenKey || customGlmKey || customKimiKey
              ? 'text-amber-400 bg-amber-500/10 border-amber-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-300 bg-slate-800/80 border-slate-700/60'
          }`}
        >
          <span>🔑 真实 API Keys {customDeepSeekKey || customQwenKey || customGlmKey || customKimiKey ? '(已配置)' : '(可选填)'}</span>
        </button>

        <button
          onClick={onRunArena}
          disabled={isGenerating || !userMessage.trim()}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-lg ${
            isGenerating || !userMessage.trim()
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white hover:brightness-110 shadow-purple-600/30 active:scale-95'
          }`}
        >
          {isGenerating ? (
            <>
              <RotateCcw className="h-4 w-4 animate-spin" />
              <span>3模型并发生成中...</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" />
              <span>并发发送给 3 模型</span>
            </>
          )}
        </button>
      </div>

      {/* Optional API Key Input Box */}
      {showKeyInput && (
        <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-purple-500/30 space-y-3">
          <div className="flex items-center justify-between text-xs text-purple-300 font-semibold border-b border-slate-800 pb-2">
            <span>直连官方 API Keys (可选)</span>
            <span className="text-[10px] text-slate-400">（未填写的模型将自动使用高保真 Gemini 拟真引擎）</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-amber-400 font-medium flex items-center justify-between">
                <span>☀️ Qwen3.8-Max (通义千问 / DashScope) Key</span>
                <span className="text-[10px] text-slate-500">{customQwenKey ? '✓ 已设置' : '未配置'}</span>
              </label>
              <input
                type="password"
                value={customQwenKey}
                onChange={(e) => setCustomQwenKey?.(e.target.value)}
                placeholder="粘贴 sk-... (DashScope Key)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-emerald-400 font-medium flex items-center justify-between">
                <span>⚡ DeepSeek API Key</span>
                <span className="text-[10px] text-slate-500">{customDeepSeekKey ? '✓ 已设置' : '未配置'}</span>
              </label>
              <input
                type="password"
                value={customDeepSeekKey}
                onChange={(e) => setCustomDeepSeekKey(e.target.value)}
                placeholder="粘贴 sk-..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-purple-400 font-medium flex items-center justify-between">
                <span>🌌 GLM-5.2 (智谱AI) Key</span>
                <span className="text-[10px] text-slate-500">{customGlmKey ? '✓ 已设置' : '未配置'}</span>
              </label>
              <input
                type="password"
                value={customGlmKey}
                onChange={(e) => setCustomGlmKey(e.target.value)}
                placeholder="粘贴 智谱 API Key (例如 xx.xx)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-indigo-400 font-medium flex items-center justify-between">
                <span>🌙 Kimi K3 / Moonshot Key</span>
                <span className="text-[10px] text-slate-500">{customKimiKey ? '✓ 已设置' : '未配置'}</span>
              </label>
              <input
                type="password"
                value={customKimiKey}
                onChange={(e) => setCustomKimiKey?.(e.target.value)}
                placeholder="粘贴 sk-..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



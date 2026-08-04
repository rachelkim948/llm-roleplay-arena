import React, { useState } from 'react';
import { ModelConfig, ChatMessage } from '../types';
import { Send, Bot, User, Trash2, Sparkles, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';

interface MultiTurnChatProps {
  models: ModelConfig[];
  systemPrompt: string;
  onSendMultiTurn: (userText: string, history: ChatMessage[]) => Promise<Record<string, string>>;
}

export const MultiTurnChat: React.FC<MultiTurnChatProps> = ({
  models,
  systemPrompt,
  onSendMultiTurn,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('all'); // 'all' or specific model

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      userText: inputText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentInput = inputText;
    setInputText('');
    setIsSending(true);

    try {
      const responses = await onSendMultiTurn(currentInput, messages);

      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'models',
        modelResponses: responses,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (e) {
      console.error('Multi-turn failed:', e);
    } finally {
      setIsSending(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[700px] justify-between">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-purple-400" />
            <h2 className="text-base font-bold text-slate-100">3 模型多轮动态对话对抗 (Multi-Turn Arena Sandbox)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            连续多轮对话压测，验证模型的长程记忆、人设一致性与反说教稳定性
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Model Filter Selector */}
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
          >
            <option value="all">并排对比 3 个模型</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                只聚焦: {m.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition-colors"
            title="清空对话历史"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-16 space-y-2">
            <Bot className="h-10 w-10 text-slate-600 mb-1" />
            <p className="text-xs text-slate-400">尚未开始多轮对话。输入第一句对话，观察 3 模型如何持续保持人设并展开剧情。</p>
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              {msg.sender === 'user' && (
                <div className="flex justify-end">
                  <div className="flex items-start space-x-2 max-w-xl">
                    <div className="bg-purple-600 text-white rounded-2xl rounded-tr-none p-3 text-xs leading-relaxed shadow-lg">
                      {msg.userText}
                    </div>
                    <div className="h-7 w-7 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 text-xs font-bold">
                      <User className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              )}

              {msg.sender === 'models' && msg.modelResponses && (
                <div className="space-y-2">
                  <div className="text-[10px] text-slate-500 font-mono px-1">
                    3 Models Parallel Response:
                  </div>

                  <div
                    className={`grid gap-3 ${
                      selectedModelId === 'all'
                        ? 'grid-cols-1 md:grid-cols-3'
                        : 'grid-cols-1'
                    }`}
                  >
                    {models
                      .filter((m) => selectedModelId === 'all' || selectedModelId === m.id)
                      .map((m) => {
                        const responseText = msg.modelResponses?.[m.id] || '（响应未返回）';
                        return (
                          <div
                            key={m.id}
                            className={`p-3 rounded-xl border bg-slate-950/80 flex flex-col justify-between ${m.accentColor}`}
                          >
                            <div className="flex items-center space-x-1.5 mb-1.5 pb-1 border-b border-slate-800">
                              <span className="text-base">{m.avatar}</span>
                              <span className="text-xs font-bold text-slate-200">{m.name}</span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                              {responseText}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}

        {isSending && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center space-x-3">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-purple-300 animate-pulse">
              3 模型并行生成后续剧情对白中...
            </span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="pt-3 border-t border-slate-800 flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="输入后续对话追问或继续推剧情 (如：'那你今天打算带我去哪里玩？')..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isSending}
          className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all ${
            !inputText.trim() || isSending
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-500 active:scale-95 shadow-lg shadow-purple-600/30'
          }`}
        >
          <span>发送</span>
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

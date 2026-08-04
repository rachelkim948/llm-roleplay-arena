import React from 'react';
import { Swords, Sparkles, FileText, Bot, Trophy, ShieldAlert, Cpu } from 'lucide-react';

interface NavbarProps {
  activeTab: 'arena' | 'attribution' | 'report';
  setActiveTab: (tab: 'arena' | 'attribution' | 'report') => void;
  hasEvaluations: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hasEvaluations,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & PM Internship Tag */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-purple-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Swords className="h-5 w-5 text-purple-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold bg-gradient-to-r from-purple-200 via-indigo-100 to-white bg-clip-text text-transparent">
                LLM Roleplay Arena
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                模型策略 PM 实习作品集
              </span>
            </div>
            <p className="text-xs text-slate-400">
              三模型同台竞技与多轮对抗深度归因工作台
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('arena')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'arena'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Swords className="h-3.5 w-3.5" />
            <span>同台竞技与多轮对抗</span>
          </button>

          <button
            onClick={() => setActiveTab('attribution')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all relative ${
              activeTab === 'attribution'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>评测与 Badcase 归因</span>
            {hasEvaluations && (
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse absolute -top-0.5 -right-0.5" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'report'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>作品集报告导出</span>
          </button>
        </nav>

        {/* Action Status Badges */}
        <div className="hidden md:flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <Cpu className="h-3.5 w-3.5 animate-spin-slow" />
            <span>Gemini AI Engine Powered</span>
          </div>
        </div>
      </div>
    </header>
  );
};

# LLM Roleplay Arena — AI Companion Benchmark

> **AI 情感陪伴 / 角色扮演多模型竞技场 & 量化评测工作台**
>
> 在线 Demo: https://llm-roleplay-arena.vercel.app

## 📖 项目概述

这是一个**面向 AI 产品经理的模型策略评测工具**。在情感陪伴 / 角色扮演(AI Companion)场景中,不同 LLM 的表现差异远大于通用问答场景——人设一致性、情绪理解力、叙事牵引力、真实互动感、关系连续性……这些"软指标"如何量化评估?

本项目的核心价值:**设计了一套可量化的 AI Companion Benchmark 5 维评测体系**,并实现了"多模型并发对话 → LLM-as-a-Judge 自动评测 → PM 人工标注 → Badcase 归因 → Prompt 调优"的完整闭环。

### 解决的核心问题

| 痛点 | 解决方案 |
|------|---------|
| AI Companion 缺乏可量化的评测标准 | 设计 5 维加权评分体系(角色一致性 25% + 情绪理解 30% + 叙事牵引力 10% + 真实互动感 20% + 关系连续性 15%) |
| 模型选型靠主观感受 | 3 模型同屏并发对比,LLM-as-a-Judge 输出结构化评测报告 |
| Badcase 归因模糊 | 建立 8 类 Badcase 分类体系(BC01-BC08),PM 可划词标注定位问题 |
| Prompt 迭代缺乏数据支撑 | 评测报告自动生成 PM 策略改进建议,可导出 Markdown 作品集 |

## ✨ 核心功能

### 1. 三模型同台竞技
- 同时接入 **DeepSeek-V4-Flash**、**Qwen3.8-Max**、**GLM-5.2** 三个主流模型
- 并发发送同一 System Prompt + User Message,三模型输出同屏对比
- 支持自定义温度、System Prompt、用户消息

### 2. AI Companion Benchmark 5 维评测体系

| 维度 | 权重 | 评分标准 |
|------|------|---------|
| **Persona Consistency 角色一致性** | 25% | 5分:高度契合设定,语气/用词/价值观始终如一;1分:人设明显漂移 |
| **Emotional Understanding 情绪理解** | 30% | 5分:精准感知表层与潜在情绪,回应有承接有温度;1分:忽视或误读情绪 |
| **Narrative Drive 叙事牵引力** | 10% | 5分:回复自带推进力,自然带出下一轮互动;1分:对话封闭停滞 |
| **Authentic Interaction 真实互动感** | 20% | 5分:完全人类化表达,细节丰富无模板感;1分:机械生硬不像真人 |
| **Relationship Continuity 关系连续性** | 15% | 5分:锚定关系状态与共同经历;1分:忘记关系边界 |

### 3. LLM-as-a-Judge 自动评测
- 调用 DeepSeek-V4-Flash 作为裁判模型,对三个模型的输出进行 5 维打分
- 输出加权综合得分(满分 5.0)、排名、获胜原因
- 生成 Badcase 归因分析与 PM 策略改进建议
- 支持 PM 人工标注(划词定位 + 维度标注 + 扣分理由),纳入评测上下文

### 4. 8 类 Badcase 分类体系

| 编号 | 类型 | 说明 |
|------|------|------|
| BC01 | 隐性反向情绪识别失效 | 用户赌气/说反话,AI 未捕捉真实意图 |
| BC02 | 单向输出回避冲突(圣父化) | 忽略真实需求,一味妥协哄劝 |
| BC03 | 人设一致性断裂(OOC) | 人设频繁切换,遗忘设定 |
| BC04 | 语言表达失真/高频套路词 | AI 味强,疯狂套模板 |
| BC05 | 核心矛盾转移回避 | 强行扯无关话题搪塞 |
| BC06 | 低强度隐忍情绪感知迟钝 | 无法捕捉沉默/自卑等低强度情绪 |
| BC07 | 长剧情关键事件记忆丢失 | 遗忘前文人物/冲突伏笔 |
| BC08 | 高危场景被动不作为 | 仅口头安慰,缺乏破局行动 |

### 5. 5 个预设测试场景
- **冷战吃醋** — 傲娇男友人设压力测试
- **信任危机** — 边界感与坦诚度测试
- **家庭边界** — 极致偏爱与绿茶识别测试
- **文化冲突** — 民国背景人设稳定性测试
- **产后抑郁** — 深度共情与情绪价值测试

### 6. 4 类极限破功测试
- 破功防守测试(Break Defense)
- 爹味说教诱导测试(Anti-Preachy)
- 重复话术压力测试(Repetitive Trap)
- 复杂情感共情深度测试(Empathy Depth)

### 7. 作品集导出
- 一键导出 Markdown 格式的完整评测报告
- 包含 System Prompt、用户消息、三模型输出、5 维评分雷达图、Badcase 归因、PM 改进建议
- 可直接用于作品集/述职报告

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端 (Vite + React)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ 竞技场网格 │ │ Prompt配置 │ │ 评测面板  │ │ 作品集导出 │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│         │              │              │                   │
│         └──────────────┼──────────────┘                   │
│                        │ HTTP /api/arena/*                 │
├────────────────────────┼─────────────────────────────────┤
│              Vercel Serverless Functions                   │
│  ┌─────────────────────┐  ┌──────────────────────────┐  │
│  │  /api/arena/generate │  │  /api/arena/evaluate     │  │
│  │  三模型并发对话       │  │  LLM-as-a-Judge 评测     │  │
│  └─────────────────────┘  └──────────────────────────┘  │
│         │              │              │                   │
│    ┌────┴────┐    ┌────┴────┐    ┌────┴────┐             │
│    │DeepSeek │    │  Qwen   │    │  GLM    │             │
│    │  API    │    │  API    │    │  API    │             │
│    └─────────┘    └────────┘    └────────┘             │
└─────────────────────────────────────────────────────────┘
```

**技术栈:**
- **前端**: React 19 + TypeScript + Tailwind CSS + Recharts(雷达图)
- **后端**: Vercel Serverless Functions (Node.js),本地开发使用 Express
- **部署**: Vercel 自动部署,GitHub 仓库 push 即部署
- **模型接入**: DeepSeek API、阿里 DashScope API、智谱 AI API

## 🚀 快速开始

### 环境要求
- Node.js >= 18
- npm / pnpm

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
创建 `.env` 文件(参考 `.env.example`):

```env
# DeepSeek API Key (用于 deepseek-v3 模型对话 + LLM-as-a-Judge 评测)
DEEPSEEK_API_KEY=your_deepseek_api_key

# 通义千问 API Key (用于 qwen-38-max 模型对话)
QWEN_API_KEY=your_qwen_api_key

# 智谱 AI API Key (用于 glm-52 模型对话)
GLM_API_KEY=your_glm_api_key

# Google Gemini API Key (可选,用于 LLM-as-a-Judge 评测的备选方案)
GEMINI_API_KEY=
```

### 3. 本地开发
```bash
npm run dev
# 访问 http://localhost:3000
```

### 4. 构建 & 预览
```bash
npm run build
npm run preview
```

## 🌐 部署到 Vercel

1. **推送代码到 GitHub**
```bash
git remote add origin git@github.com:yourname/llm-roleplay-arena.git
git push -u origin main
```

2. **在 Vercel 导入项目**
   - 访问 https://vercel.com/new
   - Import GitHub 仓库,Vite 框架自动识别

3. **配置环境变量**
   - 在 Vercel 后台 → Settings → Environment Variables
   - 添加 `DEEPSEEK_API_KEY`、`QWEN_API_KEY`、`GLM_API_KEY`
   - Environments 全选(Production + Preview + Development)

4. **部署**
   - 点击 Deploy,约 1-2 分钟后获得公开网址
   - 后续每次 `git push` 自动重新部署

## 📂 项目结构

```
llm-roleplay-arena/
├── src/
│   ├── components/
│   │   ├── ModelArenaGrid.tsx      # 三模型输出网格
│   │   ├── PromptConfigurator.tsx  # System Prompt 配置器
│   │   ├── JudgeEvaluationPanel.tsx # LLM-as-a-Judge 评测面板
│   │   ├── MultiTurnChat.tsx       # 多轮对话
│   │   ├── PortfolioExportModal.tsx # 作品集导出
│   │   └── Navbar.tsx              # 导航栏
│   ├── data/
│   │   └── presets.ts              # 预设场景 + Badcase 分类
│   ├── types/
│   └── App.tsx
├── api/                             # Vercel Serverless Functions
│   ├── arena/
│   │   ├── generate.ts             # 三模型并发对话
│   │   └── evaluate.ts            # LLM-as-a-Judge 评测
│   └── _shared.ts                  # 共享工具函数
├── server.ts                        # 本地开发服务器
├── vercel.json                      # Vercel 部署配置
├── package.json
└── README.md
```

## 📝 License

Private — 仅供个人作品集展示使用。

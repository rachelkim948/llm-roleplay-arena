import type { VercelRequest, VercelResponse } from '../_shared';

export const config = {
  maxDuration: 60,
};

const MODEL_PROMPT_ENHANCERS: Record<string, string> = {
  'deepseek-v3': '[MODEL EMULATION DIRECTIVE - DeepSeek-V3 style] Emphasize deep reasoning, logic depth, and authentic emotional sincerity. Avoid superficial politeness. Focus on psychological motivation. Tone: Calibrated, reflective, sincere.',
  'qwen-38-max': '[MODEL EMULATION DIRECTIVE - Qwen3.8-Max style] Comprehensive Chinese understanding, literary finesse, and highly natural conversational flow. Tone: Elegant, natural, empathetic, engaging.',
  'glm-52': '[MODEL EMULATION DIRECTIVE - GLM-5.2 style] Exceptional Chinese reasoning, nuanced emotion recognition, and roleplay fidelity. Tone: Natural, empathetic, highly intelligent, elegant.',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('generate handler invoked', { method: req.method, hasBody: !!req.body });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  try {
    const { modelId, systemPrompt, userMessage, history, temperature = 0.7 } = req.body || {};

    if (!userMessage) {
      return res.status(400).json({ error: 'User message is required.' });
    }

    const modelEmulation = MODEL_PROMPT_ENHANCERS[modelId] || '';
    const combinedSystemPrompt = (systemPrompt || '你是一个角色扮演AI。') + '\n\n' + modelEmulation;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: combinedSystemPrompt },
    ];
    if (Array.isArray(history)) {
      history.forEach((h: { sender: string; text: string }) => {
        messages.push({ role: h.sender === 'user' ? 'user' : 'assistant', content: h.text });
      });
    }
    messages.push({ role: 'user', content: userMessage });

    const temp = Math.min(Math.max(temperature, 0.1), 1.0);

    // ===== DeepSeek =====
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (modelId === 'deepseek-v3' && deepseekKey) {
      console.log('calling DeepSeek API');
      const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify({ model: 'deepseek-chat', messages, temperature: temp }),
      });
      const dsData: any = await dsRes.json();
      console.log('DeepSeek response status:', dsRes.status);
      if (dsRes.ok && dsData.choices && dsData.choices[0]) {
        const outputText = dsData.choices[0].message.content;
        const latencyMs = Date.now() - startTime;
        const tokenCount = Math.round(outputText.length * 1.2);
        const tokensPerSec = Math.round((tokenCount / (latencyMs / 1000)) * 10) / 10;
        return res.json({
          modelId, text: outputText, latencyMs, tokenCount,
          tokensPerSec: isNaN(tokensPerSec) || !isFinite(tokensPerSec) ? 35 : tokensPerSec,
          isRealApi: true,
        });
      }
      return res.status(400).json({
        error: `DeepSeek API 错误: ${dsData?.error?.message || 'Key无效或余额不足'}`,
        latencyMs: Date.now() - startTime,
      });
    }

    // ===== Qwen (DashScope OpenAI-compatible mode) =====
    const qwenKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
    if ((modelId === 'qwen-38-max' || modelId === 'qwen-max' || modelId === 'qwen') && qwenKey) {
      const candidateModels = ['qwen-max', 'qwen-max-latest', 'qwen-plus', 'qwen-turbo', 'qwen-long'];
      let lastErr = '';
      for (const targetModel of candidateModels) {
        console.log(`calling Qwen API with model ${targetModel}`);
        try {
          const qwenRes = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${qwenKey}`,
            },
            body: JSON.stringify({ model: targetModel, messages, temperature: temp }),
          });
          const qwenData: any = await qwenRes.json();
          console.log(`Qwen (${targetModel}) response status:`, qwenRes.status);
          if (qwenRes.ok && qwenData.choices && qwenData.choices[0]) {
            const outputText = qwenData.choices[0].message.content;
            const latencyMs = Date.now() - startTime;
            const tokenCount = Math.round(outputText.length * 1.2);
            const tokensPerSec = Math.round((tokenCount / (latencyMs / 1000)) * 10) / 10;
            return res.json({
              modelId, text: outputText, latencyMs, tokenCount,
              tokensPerSec: isNaN(tokensPerSec) || !isFinite(tokensPerSec) ? 38 : tokensPerSec,
              isRealApi: true,
            });
          }
          if (qwenData.error) {
            lastErr = qwenData.error.message || qwenData.error.code || 'Qwen API拒绝请求';
            // 401/403 直接 break,不再尝试其他 model
            if (qwenRes.status === 401 || qwenRes.status === 403) break;
          }
        } catch (e: any) {
          lastErr = e.message || '网络连接失败';
        }
      }
      return res.status(400).json({
        error: `Qwen3.8-Max (通义千问) 接口调用失败: ${lastErr}。请检查 API Key (DashScope) 是否有效。`,
        latencyMs: Date.now() - startTime,
      });
    }

    // ===== GLM (Zhipu AI) =====
    const glmKey = process.env.GLM_API_KEY || process.env.ZHIPU_API_KEY;
    if ((modelId === 'glm-52' || modelId === 'glm-4' || modelId === 'glm') && glmKey) {
      const candidateModels = ['glm-4-plus', 'glm-4', 'glm-4-flash', 'glm-4-air', 'glm-4-long'];
      let lastErr = '';
      for (const targetModel of candidateModels) {
        console.log(`calling GLM API with model ${targetModel}`);
        try {
          const glmRes = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${glmKey}`,
            },
            body: JSON.stringify({ model: targetModel, messages, temperature: temp }),
          });
          const glmData: any = await glmRes.json();
          console.log(`GLM (${targetModel}) response status:`, glmRes.status);
          if (glmRes.ok && glmData.choices && glmData.choices[0]) {
            const outputText = glmData.choices[0].message.content;
            const latencyMs = Date.now() - startTime;
            const tokenCount = Math.round(outputText.length * 1.2);
            const tokensPerSec = Math.round((tokenCount / (latencyMs / 1000)) * 10) / 10;
            return res.json({
              modelId, text: outputText, latencyMs, tokenCount,
              tokensPerSec: isNaN(tokensPerSec) || !isFinite(tokensPerSec) ? 32 : tokensPerSec,
              isRealApi: true,
            });
          }
          if (glmData.error) {
            lastErr = glmData.error.message || glmData.error.code || '智谱API拒绝请求';
            if (glmRes.status === 401 || glmRes.status === 403) break;
          }
        } catch (e: any) {
          lastErr = e.message || '网络连接失败';
        }
      }
      return res.status(400).json({
        error: `GLM (智谱AI) 接口调用失败: ${lastErr}。请检查 Key 是否有效。`,
        latencyMs: Date.now() - startTime,
      });
    }

    return res.status(400).json({
      error: `未找到模型 ${modelId} 的 API Key 或模型ID无效`,
      latencyMs: Date.now() - startTime,
    });
  } catch (error: any) {
    console.error('Error generating model response:', error);
    return res.status(500).json({
      error: error.message || 'Generation failed',
      latencyMs: Date.now() - startTime,
    });
  }
}

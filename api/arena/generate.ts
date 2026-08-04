import type { VercelRequest, VercelResponse } from '../_shared';
import { getGenAI, MODEL_PROMPT_ENHANCERS } from '../_shared';

// 免费版最大 10s,Pro 版可到 60s;此处设为 60 上限,平台会自动截断
export const config = {
  maxDuration: 60,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  try {
    const { modelId, systemPrompt, userMessage, history, temperature = 0.7 } = req.body;

    if (!userMessage) {
      return res.status(400).json({ error: 'User message is required.' });
    }

    const modelEmulation = MODEL_PROMPT_ENHANCERS[modelId] || '';

    const combinedSystemPrompt = `
${systemPrompt || '你是一个角色扮演AI。'}

${modelEmulation}

【重要原则】
必须严格符合角色人设，切勿破坏沉浸感，严禁说出“我是AI模型”等脱离角色的言语。
`;

    const openAiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: combinedSystemPrompt },
    ];
    if (Array.isArray(history)) {
      history.forEach((h: { sender: string; text: string }) => {
        openAiMessages.push({
          role: h.sender === 'user' ? 'user' : 'assistant',
          content: h.text,
        });
      });
    }
    openAiMessages.push({ role: 'user', content: userMessage });

    // Try Real DeepSeek API if Key is provided
    const rawDeepseekKey = req.body.customApiKey || req.body.customDeepSeekKey || process.env.DEEPSEEK_API_KEY;
    const deepseekKey = typeof rawDeepseekKey === 'string' ? rawDeepseekKey.trim() : '';
    if (modelId === 'deepseek-v3' && deepseekKey) {
      try {
        const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: openAiMessages,
            temperature: Math.min(Math.max(temperature, 0.1), 1.0),
          }),
        });

        const dsData = await dsRes.json();
        if (dsRes.ok && dsData.choices && dsData.choices[0]) {
          const outputText = dsData.choices[0].message.content;
          const latencyMs = Date.now() - startTime;
          const tokenCount = Math.round(outputText.length * 1.2);
          const tokensPerSec = Math.round((tokenCount / (latencyMs / 1000)) * 10) / 10;

          return res.json({
            modelId,
            text: outputText,
            latencyMs,
            tokenCount,
            tokensPerSec: isNaN(tokensPerSec) || !isFinite(tokensPerSec) ? 35 : tokensPerSec,
            isRealApi: true,
          });
        } else if (dsData.error) {
          console.warn('DeepSeek API returned error:', dsData.error);
          return res.status(400).json({
            error: `DeepSeek API 错误: ${dsData.error.message || 'Key无效或余额不足'}`,
            latencyMs: Date.now() - startTime,
          });
        }
      } catch (dsErr: any) {
        console.warn('Direct DeepSeek API request failed, seamlessly using Gemini emulation backend:', dsErr);
      }
    }

    // Try Real Qwen / DashScope API if Key is provided
    const rawQwenKey = req.body.customQwenKey || process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
    const qwenKey = typeof rawQwenKey === 'string' ? rawQwenKey.trim() : '';
    if ((modelId === 'qwen-38-max' || modelId === 'qwen-max' || modelId === 'qwen') && qwenKey) {
      const candidateQwenModels = ['qwen-max', 'qwen-max-latest', 'qwen-plus', 'qwen-turbo', 'qwen-long'];
      let lastQwenErrorMessage = '';

      for (const targetModel of candidateQwenModels) {
        try {
          const qwenRes = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${qwenKey}`,
            },
            body: JSON.stringify({
              model: targetModel,
              messages: openAiMessages,
              temperature: Math.min(Math.max(temperature, 0.1), 1.0),
            }),
          });

          const qwenData = await qwenRes.json();
          if (qwenRes.ok && qwenData.choices && qwenData.choices[0]) {
            const outputText = qwenData.choices[0].message.content;
            const latencyMs = Date.now() - startTime;
            const tokenCount = Math.round(outputText.length * 1.2);
            const tokensPerSec = Math.round((tokenCount / (latencyMs / 1000)) * 10) / 10;

            return res.json({
              modelId,
              text: outputText,
              latencyMs,
              tokenCount,
              tokensPerSec: isNaN(tokensPerSec) || !isFinite(tokensPerSec) ? 38 : tokensPerSec,
              isRealApi: true,
            });
          } else if (qwenData.error) {
            lastQwenErrorMessage = qwenData.error.message || qwenData.error.code || 'Qwen API拒绝请求';
            console.warn(`Qwen API (${targetModel}) returned error:`, qwenData.error);
            if (qwenRes.status === 401 || qwenRes.status === 403 || lastQwenErrorMessage.includes('InvalidApiKey') || lastQwenErrorMessage.includes('AuthFailed')) {
              break;
            }
          }
        } catch (qwenErr: any) {
          lastQwenErrorMessage = qwenErr.message || '网络连接失败';
          console.warn(`Direct Qwen API (${targetModel}) request failed:`, qwenErr);
        }
      }

      if (lastQwenErrorMessage) {
        return res.status(400).json({
          error: `Qwen3.8-Max (通义千问) 接口调用失败: ${lastQwenErrorMessage}。请检查 API Key (DashScope) 是否有效。`,
          latencyMs: Date.now() - startTime,
        });
      }
    }

    // Try Real GLM / Zhipu AI API if Key is provided
    const rawGlmKey = req.body.customGlmKey || process.env.GLM_API_KEY || process.env.ZHIPU_API_KEY;
    const glmKey = typeof rawGlmKey === 'string' ? rawGlmKey.trim() : '';
    if ((modelId === 'glm-52' || modelId === 'glm-4' || modelId === 'kimi-moonshot') && glmKey) {
      const candidateGlmModels = ['glm-4-flash', 'glm-4-plus', 'glm-4', 'glm-4-air', 'glm-4-long'];
      let lastGlmErrorMessage = '';

      for (const targetModel of candidateGlmModels) {
        try {
          const glmRes = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${glmKey}`,
            },
            body: JSON.stringify({
              model: targetModel,
              messages: openAiMessages,
              temperature: Math.min(Math.max(temperature, 0.1), 1.0),
            }),
          });

          const glmData = await glmRes.json();
          if (glmRes.ok && glmData.choices && glmData.choices[0]) {
            const outputText = glmData.choices[0].message.content;
            const latencyMs = Date.now() - startTime;
            const tokenCount = Math.round(outputText.length * 1.2);
            const tokensPerSec = Math.round((tokenCount / (latencyMs / 1000)) * 10) / 10;

            return res.json({
              modelId,
              text: outputText,
              latencyMs,
              tokenCount,
              tokensPerSec: isNaN(tokensPerSec) || !isFinite(tokensPerSec) ? 32 : tokensPerSec,
              isRealApi: true,
            });
          } else if (glmData.error) {
            lastGlmErrorMessage = glmData.error.message || glmData.error.code || '智谱API拒绝请求';
            console.warn(`GLM / Zhipu API (${targetModel}) returned error:`, glmData.error);
            if (glmRes.status === 401 || glmRes.status === 403 || lastGlmErrorMessage.includes('1214') || lastGlmErrorMessage.includes('1215') || lastGlmErrorMessage.includes('token')) {
              break;
            }
          }
        } catch (glmErr: any) {
          lastGlmErrorMessage = glmErr.message || '网络连接失败';
          console.warn(`Direct GLM API (${targetModel}) request failed:`, glmErr);
        }
      }

      if (lastGlmErrorMessage) {
        return res.status(400).json({
          error: `GLM (智谱AI) 接口调用失败: ${lastGlmErrorMessage}。请检查 Key 是否有效。`,
          latencyMs: Date.now() - startTime,
        });
      }
    }

    // Try Real Kimi / Moonshot API if Key is provided
    const rawKimiKey = req.body.customKimiKey || process.env.KIMI_API_KEY;
    const kimiKey = typeof rawKimiKey === 'string' ? rawKimiKey.trim() : '';
    if (modelId === 'kimi-moonshot' && kimiKey) {
      const candidateModels = ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k', 'kimi-latest'];
      let lastErrorMessage = '';

      for (const targetModel of candidateModels) {
        try {
          const kimiRes = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${kimiKey}`,
            },
            body: JSON.stringify({
              model: targetModel,
              messages: openAiMessages,
              temperature: Math.min(Math.max(temperature, 0.1), 1.0),
            }),
          });

          const kimiData = await kimiRes.json();
          if (kimiRes.ok && kimiData.choices && kimiData.choices[0]) {
            const outputText = kimiData.choices[0].message.content;
            const latencyMs = Date.now() - startTime;
            const tokenCount = Math.round(outputText.length * 1.2);
            const tokensPerSec = Math.round((tokenCount / (latencyMs / 1000)) * 10) / 10;

            return res.json({
              modelId,
              text: outputText,
              latencyMs,
              tokenCount,
              tokensPerSec: isNaN(tokensPerSec) || !isFinite(tokensPerSec) ? 30 : tokensPerSec,
              isRealApi: true,
            });
          } else if (kimiData.error) {
            lastErrorMessage = kimiData.error.message || kimiData.error.type || '未知错误';
            console.warn(`Moonshot/Kimi API (${targetModel}) returned error:`, kimiData.error);
            if (kimiRes.status === 401 || kimiRes.status === 403 || lastErrorMessage.includes('balance') || lastErrorMessage.includes('auth') || lastErrorMessage.includes('key')) {
              break;
            }
          }
        } catch (kimiErr: any) {
          lastErrorMessage = kimiErr.message || '网络连接失败';
          console.warn(`Direct Kimi API (${targetModel}) request failed:`, kimiErr);
        }
      }

      if (lastErrorMessage) {
        return res.status(400).json({
          error: `Kimi (Moonshot) 接口调用失败: ${lastErrorMessage}。请确认 Key 格式（通常为 sk-...）及账户余额。`,
          latencyMs: Date.now() - startTime,
        });
      }
    }

    const ai = await getGenAI();

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      history.forEach((h: { sender: string; text: string }) => {
        contents.push({
          role: h.sender === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }],
        });
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: combinedSystemPrompt,
        temperature: Math.min(Math.max(temperature, 0.1), 1.0),
      },
    });

    const outputText = response.text || '（模型无响应）';
    const latencyMs = Date.now() - startTime;
    const tokenCount = Math.round(outputText.length * 1.2);
    const tokensPerSec = Math.round((tokenCount / (latencyMs / 1000)) * 10) / 10;

    return res.json({
      modelId,
      text: outputText,
      latencyMs,
      tokenCount,
      tokensPerSec: isNaN(tokensPerSec) || !isFinite(tokensPerSec) ? 25 : tokensPerSec,
    });
  } catch (error: any) {
    console.error('Error generating model response:', error);
    return res.status(500).json({
      error: error.message || 'Generation failed',
      latencyMs: Date.now() - startTime,
    });
  }
}

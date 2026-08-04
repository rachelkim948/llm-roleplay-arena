import type { VercelRequest, VercelResponse } from '../_shared';

export const config = {
  maxDuration: 60,
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

    // DeepSeek API call
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (modelId === 'deepseek-v3' && deepseekKey) {
      console.log('calling DeepSeek API');
      const messages = [
        { role: 'system', content: systemPrompt || '你是一个角色扮演AI。' },
      ];
      if (Array.isArray(history)) {
        history.forEach((h: { sender: string; text: string }) => {
          messages.push({ role: h.sender === 'user' ? 'user' : 'assistant', content: h.text });
        });
      }
      messages.push({ role: 'user', content: userMessage });

      const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          temperature: Math.min(Math.max(temperature, 0.1), 1.0),
        }),
      });

      const dsData: any = await dsRes.json();
      console.log('DeepSeek response status:', dsRes.status);

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
      } else {
        return res.status(400).json({
          error: `DeepSeek API 错误: ${dsData?.error?.message || 'Key无效或余额不足'}`,
          latencyMs: Date.now() - startTime,
        });
      }
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

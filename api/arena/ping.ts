import type { VercelRequest, VercelResponse } from '../_shared';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    ok: true,
    message: 'Vercel Node.js runtime is working',
    method: req.method,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    hasDeepseekKey: !!process.env.DEEPSEEK_API_KEY,
    hasQwenKey: !!process.env.QWEN_API_KEY,
    hasGlmKey: !!process.env.GLM_API_KEY,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
  });
}

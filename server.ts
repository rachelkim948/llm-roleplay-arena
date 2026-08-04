import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import generateHandler from './api/arena/generate';
import evaluateHandler from './api/arena/evaluate';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.use(express.json());

// API Routes (shared with Vercel Serverless Functions in api/arena/)
app.post('/api/arena/generate', generateHandler);
app.post('/api/arena/evaluate', evaluateHandler);

// Vite & Static file serving setup (local dev only; Vercel serves static dist via vercel.json)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Arena Server running on http://localhost:${PORT}`);
  });
}

startServer();

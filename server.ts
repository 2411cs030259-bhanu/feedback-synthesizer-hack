import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { spawn, ChildProcess } from 'node:child_process';
import { apiRouter } from './server/routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const FASTAPI_PORT = Number(process.env.BACKEND_PORT) || 8000;
const FASTAPI_URL = `http://127.0.0.1:${FASTAPI_PORT}`;
const isProduction = process.env.NODE_ENV === 'production';

let fastApiProcess: ChildProcess | null = null;
let fastApiReady = false;

function startFastApiBackend() {
  const winVenvPython = path.resolve(__dirname, '.venv', 'Scripts', 'python.exe');
  const unixVenvPython = path.resolve(__dirname, '.venv', 'bin', 'python');

  let pythonBin = process.platform === 'win32' ? 'python' : 'python3';
  if (fs.existsSync(winVenvPython)) {
    pythonBin = winVenvPython;
  } else if (fs.existsSync(unixVenvPython)) {
    pythonBin = unixVenvPython;
  }

  try {
    fastApiProcess = spawn(
      pythonBin,
      ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', String(FASTAPI_PORT)],
      {
        cwd: __dirname,
        env: { ...process.env, BACKEND_PORT: String(FASTAPI_PORT) },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    fastApiProcess.stdout?.on('data', data => {
      const msg = data.toString();
      if (msg.includes('Application startup complete') || msg.includes('Uvicorn running')) {
        fastApiReady = true;
      }
    });

    fastApiProcess.stderr?.on('data', data => {
      const msg = data.toString();
      if (msg.includes('Application startup complete') || msg.includes('Uvicorn running')) {
        fastApiReady = true;
      }
    });

    fastApiProcess.on('error', () => {
      fastApiReady = false;
    });

    fastApiProcess.on('exit', () => {
      fastApiReady = false;
    });
  } catch {
    fastApiReady = false;
  }
}

startFastApiBackend();

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Proxy /api/* to Python FastAPI backend when ready, with seamless local router fallback
app.use('/api', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetUrl = `${FASTAPI_URL}/api${req.url}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (req.headers['content-type']) {
      headers['Content-Type'] = String(req.headers['content-type']);
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      signal: controller.signal,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeout);

    fastApiReady = true;
    const contentType = upstream.headers.get('content-type') || 'application/json';
    const contentDisposition = upstream.headers.get('content-disposition');
    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);
    if (contentDisposition) {
      res.setHeader('Content-Disposition', contentDisposition);
    }

    const arrayBuffer = await upstream.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch {
    next();
  }
});

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'User Feedback Synthesizer Agent',
    fastApiReady,
  });
});

// Mount modular backend routes
app.use('/api', apiRouter);

// Setup Frontend serving (Vite middlewares in dev, static files in production)
async function setupFrontend() {
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Frontend & API Gateway ready at http://localhost:${PORT}`);
    console.log(`Python FastAPI Backend target: ${FASTAPI_URL}`);
    console.log(`Mode: ${isProduction ? 'Production' : 'Development'}`);
  });
}

setupFrontend().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

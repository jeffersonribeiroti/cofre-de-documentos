import express from "express";
import path from "path";
import { spawn } from "child_process";
import http from "http";
import { createServer as createViteServer } from "vite";

const PORT = Number(process.env.PORT) || 3000;
const PYTHON_PORT = 5001;

// Inicia o serviÃ§o de backend Python em subprocesso
let pythonProcess: any = null;
let isShuttingDown = false;

function startPythonBackend() {
  if (isShuttingDown) return;
  console.log("[*] Iniciando serviÃ§o de backend Python na porta " + PYTHON_PORT + "...");
  pythonProcess = spawn("python", ["backend/server.py", String(PYTHON_PORT)], {
    stdio: "inherit",
    env: { ...process.env, PYTHONUNBUFFERED: "1" }
  });

  pythonProcess.on("error", (err: any) => {
    console.error("[-] Falha ao inicializar o backend Python:", err);
  });

  pythonProcess.on("exit", (code: any, signal: any) => {
    console.log(`[-] Backend Python finalizado com cÃ³digo ${code} / sinal ${signal}`);
    if (!isShuttingDown) {
      console.log("[*] Reiniciando processo do backend Python em 1.5 segundos...");
      setTimeout(() => {
        startPythonBackend();
      }, 1500);
    }
  });

  // Garante o encerramento do subprocesso ao fechar o servidor
  process.on("exit", () => { isShuttingDown = true; pythonProcess?.kill(); });
  process.on("SIGINT", () => { isShuttingDown = true; pythonProcess?.kill(); process.exit(); });
  process.on("SIGTERM", () => { isShuttingDown = true; pythonProcess?.kill(); process.exit(); });
}

async function waitForPythonReady(maxRetries = 20): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const isReady = await new Promise<boolean>((resolve) => {
        const req = http.get(`http://127.0.0.1:${PYTHON_PORT}/api/health`, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on("error", () => resolve(false));
        req.setTimeout(500, () => {
          req.destroy();
          resolve(false);
        });
      });
      if (isReady) {
        console.log("[+] Backend Python pronto e respondendo.");
        return true;
      }
    } catch {
      // Ignora e tenta novamente
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  console.warn("[!] Backend Python demorou para responder ao healthcheck inicial.");
  return false;
}

async function startServer() {
  startPythonBackend();
  await waitForPythonReady();

  const app = express();

  // Parse de corpo para rotas se necessÃ¡rio
  app.use(express.raw({ type: "*/*", limit: "20mb" }));

  // Proxy transparente de todas as rotas /api/* para o Backend Python
  app.all("/api/*", (req, res) => {
    const cleanHeaders: Record<string, string | string[] | undefined> = { ...req.headers };
    cleanHeaders["host"] = `127.0.0.1:${PYTHON_PORT}`;
    delete cleanHeaders["connection"];
    cleanHeaders["x-forwarded-for"] = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || "127.0.0.1";
    
    if (req.body && req.body.length > 0) {
      cleanHeaders["content-length"] = String(req.body.length);
    } else if (req.method === "GET" || req.method === "HEAD" || req.method === "DELETE" || req.method === "OPTIONS") {
      delete cleanHeaders["content-length"];
    }

    const options: http.RequestOptions = {
      hostname: "127.0.0.1",
      port: PYTHON_PORT,
      path: req.originalUrl,
      method: req.method,
      headers: cleanHeaders,
      agent: false
    };

    const pyReq = http.request(options, (pyRes) => {
      res.writeHead(pyRes.statusCode || 500, pyRes.headers);
      pyRes.pipe(res);
    });

    pyReq.on("error", (err) => {
      console.error("[-] Erro de comunicaÃ§Ã£o com o backend Python:", err.message);
      if (!res.headersSent) {
        res.status(502).json({
          sucesso: false,
          erro: "ServiÃ§o de backend Python temporariamente indisponÃ­vel. Tente novamente em instantes."
        });
      }
    });

    if (req.body && req.body.length > 0) {
      pyReq.write(req.body);
    }
    pyReq.end();
  });

  // Vite middleware para desenvolvimento / estÃ¡tico para produÃ§Ã£o
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[+] Cofre de Documentos executando em http://localhost:${PORT}`);
  });
}

startServer();

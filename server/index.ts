import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // If a production build exists, always serve static files from it.
  // This avoids running Vite middleware (which opens many file watchers)
  // in environments like Galaxy where file-watch limits cause EMFILE errors.
  try {
    const builtPublic = new URL("../dist/public", import.meta.url);
    // fs.existsSync expects a filesystem path
    // convert URL to path and check
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require("fs");
    const builtPath = builtPublic.pathname.replace(/^\/(.:)/, "$1");
    if (fs.existsSync(builtPath)) {
      serveStatic(app);
    } else if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      // No build found and not in development: log a helpful message
      console.warn("No production build found at", builtPath, "— the server may return 404 for the client.");
      serveStatic(app); // let it try and produce a clear error if missing
    }
  } catch (err) {
    // fallback behavior: if anything goes wrong, fall back to development middleware when appropriate
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    // Clear startup log to help Galaxy logs show app readiness
    log(`serving on port ${port}`);
    console.log(`NODE_ENV=${process.env.NODE_ENV || 'undefined'} | PORT=${port} | dist exists=${require('fs').existsSync(new URL('../dist/public', import.meta.url).pathname.replace(/^\/(.:)/, '$1'))}`);
  });
})();

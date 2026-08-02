import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config.js";
import "./db/index.js";
import authRoutes from "./routes/auth.js";
import tradingRoutes from "./routes/trading.js";
import brainRoutes from "./routes/brain.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: [env.frontendUrl, "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.isDev ? "dev" : "combined"));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts. Try again later." },
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "bold-api",
    version: "1.1.0",
    brain: Boolean(env.openRouterApiKey),
    time: new Date().toISOString(),
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/brain", brainRoutes);
app.use("/api", tradingRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(env.port, () => {
  console.log(`Bold API running on http://localhost:${env.port}`);
  console.log(`Health: http://localhost:${env.port}/api/health`);
  console.log(`Brain: ${env.openRouterApiKey ? "ready" : "not configured"}`);
});

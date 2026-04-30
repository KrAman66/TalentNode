import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import chatRouter from "./routes/chat";
import savedJobsRouter from "./routes/saved-jobs";
import authRouter from "./routes/auth";
import jobInteractionsRouter from "./routes/job-interactions";
import { optionalAuth } from "./middleware/optionalAuth";
import { authMiddleware } from "./middleware/auth";
import { remotiveClient, adzunaClient } from "./mcp";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/chat", optionalAuth, chatRouter);
app.use("/api/saved-jobs", authMiddleware, savedJobsRouter);
app.use("/api/job-interactions", jobInteractionsRouter);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import chatRouter from "./routes/chat";
import savedJobsRouter from "./routes/saved-jobs";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

app.use("/api/chat", chatRouter);
app.use("/api/saved-jobs", savedJobsRouter);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

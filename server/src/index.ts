import fs from "node:fs";
import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { prisma } from "./db.js";
import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";
import renderRoutes from "./routes/render.js";

fs.mkdirSync(config.uploadDir, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static(config.uploadDir));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/ai", renderRoutes);

const port = config.port;

app.listen(port, () => {
  console.log(`Roomify server listening on http://localhost:${port}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

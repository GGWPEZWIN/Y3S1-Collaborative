import express from "express";
import healthRoutes from "./routes/healthRoutes.js";

const app = express();

app.use(express.json());
app.use("/api", healthRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, _req, res, _next) => {
  const status = Number(err?.status) || 500;
  res.status(status).json({ error: "Internal server error" });
});

export default app;

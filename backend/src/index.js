import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import orgRoutes from "./routes/organizations.js";
import authRouter from "./routes/auth.js";
import organizationsRouter from "./routes/organizations.js";
import tasksRouter from "./routes/tasks.js";
import activityRouter from "./routes/activity.js";
import projectsRouter from "./routes/projects.js";
import pool from "./db.js";


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Keep only /api/* routes:
app.use("/api/auth", authRouter);
app.use("/api/organizations", organizationsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/activity", activityRouter);

app.get("/", (req, res) => {
  res.send("Backend running");
});


app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "ok", db_time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.listen(3001, () => {
  console.log(`Server running on http://localhost:3001`);
});
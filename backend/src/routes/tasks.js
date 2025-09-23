import express from "express";
import pool from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { logActivity } from "../utils/logActivity.js";
import { requireRole } from "../utils/requireRole.js";



const router = express.Router();

// CREATE TASK - Admins only
router.post("/", authenticateToken, async (req, res) => {
  const { projectId, title, assignee } = req.body; // <-- removed description

  // Lookup project to get orgId
  const project = await pool.query("SELECT * FROM projects WHERE id=$1", [projectId]);
  if (!project.rows.length) return res.status(404).json({ error: "Project not found" });

  const orgId = project.rows[0].org_id;

  // Check admin role
  const membership = await pool.query(
    "SELECT role FROM user_organizations WHERE user_id=$1 AND org_id=$2",
    [req.user.userId, orgId]
  );
  if (!membership.rows.length || membership.rows[0].role !== "admin") {
    return res.status(403).json({ error: "Only admins can perform this action" });
  }

  // Ensure assignee is null if not provided
  const assigneeValue = assignee !== undefined ? assignee : null;

  // Set default status to 'pending'
  const statusValue = 'pending';

  const result = await pool.query(
    "INSERT INTO tasks (project_id, title, assignee, status) VALUES ($1, $2, $3, $4) RETURNING *",
    [projectId, title, assigneeValue, statusValue]
  );

  await logActivity(orgId, req.user.userId, `created task '${title}'`);
  res.json({ task: result.rows[0] });
});

// UPDATE TASK STATUS - Members can only update assigned tasks
router.patch("/:taskId", authenticateToken, async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;

  const task = await pool.query("SELECT * FROM tasks WHERE id=$1", [taskId]);
  if (!task.rows.length) return res.status(404).json({ error: "Task not found" });

  const project = await pool.query("SELECT * FROM projects WHERE id=$1", [task.rows[0].project_id]);
  const orgId = project.rows[0].org_id;

  const membership = await pool.query(
    "SELECT role FROM user_organizations WHERE user_id=$1 AND org_id=$2",
    [req.user.userId, orgId]
  );
  if (!membership.rows.length) return res.status(403).json({ error: "Not a member" });

  // Members can only update their own assigned tasks
  if (membership.rows[0].role === "member" && task.rows[0].assignee !== req.user.userId) {
    return res.status(403).json({ error: "Members can only update their own tasks" });
  }

  const result = await pool.query(
    "UPDATE tasks SET status=$1 WHERE id=$2 RETURNING *",
    [status, taskId]
  );

  await logActivity(orgId, req.user.userId, `updated task '${task.rows[0].title}' status to '${status}'`);

  res.json({ task: result.rows[0] });
});

// Update task status (allow admin or assignee)
router.patch("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.userId;

  try {
    // Get the task, its assignee, and the user's role in the org
    const taskResult = await pool.query(
      `SELECT t.assignee, p.org_id, uo.role
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       JOIN user_organizations uo ON uo.org_id = p.org_id AND uo.user_id = $1
       WHERE t.id = $2`,
      [userId, id]
    );
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found or no access" });
    }
    const task = taskResult.rows[0];

    // Allow if admin or assignee
    if (task.role !== "admin" && String(task.assignee) !== String(userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.query(
      "UPDATE tasks SET status = $1 WHERE id = $2",
      [status, id]
    );
    res.json({ message: "Task status updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// LIST TASKS FOR A PROJECT
router.get("/:projectId", authenticateToken, async (req, res) => {
  const { projectId } = req.params;

  try {
    const project = await pool.query("SELECT * FROM projects WHERE id=$1", [projectId]);
    if (!project.rows.length) return res.status(404).json({ error: "Project not found" });

    // Join users table to get assignee details (use correct column names)
    const tasks = await pool.query(`
      SELECT t.*,
        CASE
          WHEN u.id IS NOT NULL THEN json_build_object(
            'id', u.id,
            'email', u.email
          )
          ELSE NULL
        END AS assignee
      FROM tasks t
      LEFT JOIN users u ON t.assignee = u.id
      WHERE t.project_id = $1
    `, [projectId]);

    res.json({ tasks: tasks.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get a single task by ID - Admins and assigned users can view
router.get("/task/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const task = await pool.query(
      `SELECT t.*, p.org_id, uo.role
       FROM tasks t
       JOIN projects p ON t.project_id = p.id
       JOIN user_organizations uo ON uo.org_id = p.org_id AND uo.user_id = $1
       WHERE t.id = $2`,
      [userId, id]
    );
    if (!task.rows.length) {
      return res.status(404).json({ error: "Task not found or no access" });
    }

    res.json({ task: task.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE TASK - Admins only
router.delete("/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    // Check if task exists
    const task = await pool.query("SELECT * FROM tasks WHERE id=$1", [id]);
    if (!task.rows.length) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Check project and org
    const project = await pool.query("SELECT * FROM projects WHERE id=$1", [task.rows[0].project_id]);
    const orgId = project.rows[0].org_id;

    // Check admin role and assignee
    const membership = await pool.query(
      "SELECT role FROM user_organizations WHERE user_id=$1 AND org_id=$2",
      [userId, orgId]
    );
    const isAdmin = membership.rows.length && membership.rows[0].role === "admin";
    const isAssignee = String(task.rows[0].assignee) === String(userId);
    if (!isAdmin && !isAssignee) {
      return res.status(403).json({ error: "Only admins or the assignee can delete this task" });
    }

    await pool.query("DELETE FROM tasks WHERE id=$1", [id]);
    await logActivity(orgId, userId, `deleted task '${task.rows[0].title}'`);

    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
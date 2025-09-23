import express from "express";
import pool from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { logActivity } from "../utils/logActivity.js";


const router = express.Router();

// Create a project within an organization
router.post("/", authenticateToken, async (req, res) => {
  const { orgId, name } = req.body;

  try {
    // Check if user is part of the org
    const membership = await pool.query(
      "SELECT * FROM user_organizations WHERE user_id=$1 AND org_id=$2",
      [req.user.userId, orgId]
    );
    if (membership.rows.length === 0)
      return res.status(403).json({ error: "You are not a member of this organization" });

    // Insert project
    const result = await pool.query(
      "INSERT INTO projects (org_id, name) VALUES ($1, $2) RETURNING *",
      [orgId, name]
    );

    await logActivity(orgId, req.user.userId, `created project '${name}'`);


    res.json({ project: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// List all projects for an organization
router.get("/:orgId", authenticateToken, async (req, res) => {
  const { orgId } = req.params;

  try {
    // Check membership
    const membership = await pool.query(
      "SELECT * FROM user_organizations WHERE user_id=$1 AND org_id=$2",
      [req.user.userId, orgId]
    );
    if (membership.rows.length === 0)
      return res.status(403).json({ error: "You are not a member of this organization" });

    const result = await pool.query(
      "SELECT * FROM projects WHERE org_id=$1 ORDER BY created_at DESC",
      [orgId]
    );

    res.json({ projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all tasks for a project
router.get("/:projectId/tasks", authenticateToken, async (req, res) => {
  const { projectId } = req.params;
  try {
    const result = await pool.query(
      `SELECT t.*, u.email AS "assignedToName"
       FROM tasks t
       LEFT JOIN users u ON t.assignee = u.id
       WHERE t.project_id = $1`,
      [projectId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

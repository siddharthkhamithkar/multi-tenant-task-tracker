import express from "express";
import pool from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Log a manual activity (optional)
router.post("/", authenticateToken, async (req, res) => {
  const { orgId, message } = req.body;

  try {
    // Check membership
    const membership = await pool.query(
      "SELECT * FROM user_organizations WHERE user_id=$1 AND org_id=$2",
      [req.user.userId, orgId]
    );
    if (membership.rows.length === 0)
      return res.status(403).json({ error: "You are not a member of this organization" });

    const result = await pool.query(
      "INSERT INTO activity (org_id, message) VALUES ($1, $2) RETURNING *",
      [orgId, message]
    );

    res.json({ activity: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get recent activity for an organization
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
      "SELECT * FROM activity WHERE org_id=$1 ORDER BY created_at DESC LIMIT 20",
      [orgId]
    );

    res.json({ activity: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get recent activity for a specific project
router.get("/project/:projectId", authenticateToken, async (req, res) => {
  const { projectId } = req.params;

  try {
    // First, verify the user has access to this project through organization membership
    const projectCheck = await pool.query(
      `SELECT p.org_id FROM projects p 
       JOIN user_organizations uo ON p.org_id = uo.org_id 
       WHERE p.id = $1 AND uo.user_id = $2`,
      [projectId, req.user.userId]
    );
    
    if (projectCheck.rows.length === 0) {
      return res.status(403).json({ error: "You don't have access to this project" });
    }

    const orgId = projectCheck.rows[0].org_id;

    // Get project name for filtering activities
    const projectResult = await pool.query("SELECT name FROM projects WHERE id = $1", [projectId]);
    const projectName = projectResult.rows[0]?.name;

    // Get activities that mention this project (by name in the message)
    const result = await pool.query(
      `SELECT * FROM activity 
       WHERE org_id = $1 
       AND (message ILIKE $2 OR message ILIKE $3 OR message ILIKE $4)
       ORDER BY created_at DESC LIMIT 20`,
      [orgId, `%project "${projectName}"%`, `%project '${projectName}'%`, `%${projectName}%`]
    );

    res.json({ activity: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

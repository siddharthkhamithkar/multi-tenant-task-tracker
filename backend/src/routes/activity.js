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

export default router;

import express from "express";
import pool from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { logActivity } from "../utils/logActivity.js";



const router = express.Router();

// Create an organization
router.post("/", authenticateToken, async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO organizations (name) VALUES ($1) RETURNING *",
      [name]
    );

    // Add creator as admin
    await pool.query(
      "INSERT INTO user_organizations (user_id, org_id, role) VALUES ($1, $2, 'admin')",
      [req.user.userId, result.rows[0].id]
    );

    await logActivity(result.rows[0].id, req.user.userId, `created organization '${name}'`);

    res.json({ organization: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Join an organization
router.post("/join", authenticateToken, async (req, res) => {
  const { orgId } = req.body;
  try {
    // Check if already a member
    const exists = await pool.query(
      "SELECT * FROM user_organizations WHERE user_id=$1 AND org_id=$2",
      [req.user.userId, orgId]
    );
    if (exists.rows.length > 0)
      return res.status(400).json({ error: "Already a member" });

    await pool.query(
      "INSERT INTO user_organizations (user_id, org_id, role) VALUES ($1, $2, 'member')",
      [req.user.userId, orgId]
    );

    await logActivity(orgId, req.user.userId, "joined the organization");

    res.json({ message: "Joined organization successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all organizations for the logged-in user
router.get("/", authenticateToken, async (req, res) => {
  console.log("Authenticated user in /api/organizations:", req.user);
  try {
    const result = await pool.query(
      `SELECT o.id, o.name, uo.role
       FROM organizations o
       JOIN user_organizations uo ON o.id = uo.org_id
       WHERE uo.user_id = $1`,
      [req.user.userId]
    );
    res.json({ organizations: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:orgId/join", authenticateToken, async (req, res) => {
  const { orgId } = req.params;
  // Defensive: check req.body exists and userId is provided
  const { userId, role } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: "userId is required in request body" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO user_organizations (user_id, org_id, role) VALUES ($1, $2, $3) RETURNING *",
      [userId, orgId, role || "member"]
    );

    res.json({ message: "User added to organization", membership: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get organization details by ID
router.get("/:orgId", authenticateToken, async (req, res) => {
  const { orgId } = req.params;
  try {
    const orgResult = await pool.query(
      "SELECT id, name FROM organizations WHERE id = $1",
      [orgId]
    );
    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Also return user's role in this org
    const roleResult = await pool.query(
      "SELECT role FROM user_organizations WHERE user_id = $1 AND org_id = $2",
      [req.user.userId, orgId]
    );
    const userRole = roleResult.rows[0]?.role || "member";

    res.json({ ...orgResult.rows[0], userRole });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get organization members
router.get("/:orgId/members", authenticateToken, async (req, res) => {
  const { orgId } = req.params;
  try {
    const membersResult = await pool.query(
      `SELECT u.id, u.email, uo.role
       FROM users u
       JOIN user_organizations uo ON u.id = uo.user_id
       WHERE uo.org_id = $1`,
      [orgId]
    );
    res.json(membersResult.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get projects for an organization
router.get("/:orgId/projects", authenticateToken, async (req, res) => {
  const { orgId } = req.params;
  try {
    const projectsResult = await pool.query(
      "SELECT * FROM projects WHERE org_id = $1",
      [orgId]
    );
    res.json(projectsResult.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
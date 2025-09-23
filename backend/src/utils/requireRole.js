import pool from "../db.js";

/**
 * Middleware to enforce role-based permissions.
 * @param {string} role - Required role, e.g., "admin"
 * Usage: router.post("/", authenticateToken, requireRole("admin"), ...)
 */
export const requireRole = (role) => async (req, res, next) => {
  try {
    // Determine orgId: either from body or params
    const orgId = req.body.orgId || req.params.orgId;
    if (!orgId) return res.status(400).json({ error: "Organization ID is required" });

    const membership = await pool.query(
      "SELECT role FROM user_organizations WHERE user_id=$1 AND org_id=$2",
      [req.user.userId, orgId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({ error: "You are not a member of this organization" });
    }

    const userRole = membership.rows[0].role;
    if (role === "admin" && userRole !== "admin") {
      return res.status(403).json({ error: "Only admins can perform this action" });
    }

    // Store role in request for further checks (optional)
    req.userRole = userRole;

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

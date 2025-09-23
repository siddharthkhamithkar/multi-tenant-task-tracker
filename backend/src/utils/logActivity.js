import pool from "../db.js";

export const logActivity = async (orgId, userId, message) => {
  try {
    // Fetch user's email
    const userResult = await pool.query(
      "SELECT email FROM users WHERE id = $1",
      [userId]
    );
    
    const userEmail = userResult.rows.length > 0 ? userResult.rows[0].email : `User ${userId}`;
    const fullMessage = `${userEmail} ${message}`;
    
    await pool.query(
      "INSERT INTO activity (org_id, message) VALUES ($1, $2)",
      [orgId, fullMessage]
    );
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
};

import pool from "../db.js";

export const logActivity = async (orgId, userId, message) => {
  try {
    const fullMessage = `User ${userId} ${message}`;
    await pool.query(
      "INSERT INTO activity (org_id, message) VALUES ($1, $2)",
      [orgId, fullMessage]
    );
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
};

import { query } from './database.js';

export async function createCannedResponse(shortcut, message) {
  const result = await query(
    `INSERT INTO canned_responses (shortcut, message)
     VALUES ($1, $2)
     RETURNING *`,
    [shortcut, message]
  );
  return result.rows[0];
}

export async function getCannedResponses() {
  const result = await query(
    `SELECT * FROM canned_responses ORDER BY shortcut ASC`
  );
  return result.rows;
}

export async function getCannedResponse(id) {
  const result = await query(
    `SELECT * FROM canned_responses WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

export async function updateCannedResponse(id, shortcut, message) {
  const result = await query(
    `UPDATE canned_responses SET shortcut = $1, message = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
    [shortcut, message, id]
  );
  return result.rows[0];
}

export async function deleteCannedResponse(id) {
  await query(`DELETE FROM canned_responses WHERE id = $1`, [id]);
}

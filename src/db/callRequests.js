import { query } from './database.js';

export async function createCallRequest(data) {
  const result = await query(
    `INSERT INTO call_requests (conversation_id, visitor_name, visitor_phone, best_time, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.conversationId, data.visitorName, data.visitorPhone, data.bestTime, data.notes]
  );
  return result.rows[0];
}

export async function getCallRequests(limit = 100) {
  const result = await query(
    `SELECT * FROM call_requests ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getCallRequest(id) {
  const result = await query(
    `SELECT * FROM call_requests WHERE id = $1`,
    [id]
  );
  return result.rows[0];
}

export async function updateCallRequestStatus(id, status) {
  const result = await query(
    `UPDATE call_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0];
}

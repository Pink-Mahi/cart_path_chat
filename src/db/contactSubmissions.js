import { query } from './database.js';

export async function createContactSubmission(data) {
  const result = await query(
    `INSERT INTO contact_submissions (visitor_name, visitor_email, visitor_phone, organization_type, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.visitorName, data.visitorEmail, data.visitorPhone, data.organizationType, data.message]
  );
  return result.rows[0];
}

export async function getContactSubmissions(limit = 100) {
  const result = await query(
    `SELECT cs.*, u.name as assigned_to_name 
     FROM contact_submissions cs
     LEFT JOIN users u ON cs.assigned_to = u.id
     ORDER BY cs.created_at DESC 
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getContactSubmission(id) {
  const result = await query(
    `SELECT cs.*, u.name as assigned_to_name 
     FROM contact_submissions cs
     LEFT JOIN users u ON cs.assigned_to = u.id
     WHERE cs.id = $1`,
    [id]
  );
  return result.rows[0];
}

export async function updateContactSubmissionStatus(id, status) {
  const result = await query(
    `UPDATE contact_submissions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return result.rows[0];
}

export async function assignContactSubmission(id, userId) {
  const result = await query(
    `UPDATE contact_submissions SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
    [userId, id]
  );
  return result.rows[0];
}

export async function deleteContactSubmission(id) {
  await query('DELETE FROM contact_submissions WHERE id = $1', [id]);
}

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);

export const getConversation = async (conversationId) => {
  const result = await query(
    'SELECT * FROM conversations WHERE id = $1',
    [conversationId]
  );
  return result.rows[0];
};

export const createConversation = async (visitorId, visitorName, visitorEmail) => {
  const result = await query(
    'INSERT INTO conversations (visitor_id, visitor_name, visitor_email) VALUES ($1, $2, $3) RETURNING *',
    [visitorId, visitorName, visitorEmail]
  );
  return result.rows[0];
};

export const getOrCreateConversation = async (visitorId, visitorName, visitorEmail) => {
  let result = await query(
    "SELECT * FROM conversations WHERE visitor_id = $1 AND status <> 'closed' ORDER BY created_at DESC LIMIT 1",
    [visitorId]
  );
  
  if (result.rows.length === 0) {
    return await createConversation(visitorId, visitorName, visitorEmail);
  }
  
  const conversation = result.rows[0];
  
  // Update name/email if provided and not already set
  if ((visitorName && !conversation.visitor_name) || (visitorEmail && !conversation.visitor_email)) {
    const updateResult = await query(
      'UPDATE conversations SET visitor_name = COALESCE($1, visitor_name), visitor_email = COALESCE($2, visitor_email) WHERE id = $3 RETURNING *',
      [visitorName, visitorEmail, conversation.id]
    );
    return updateResult.rows[0];
  }
  
  return conversation;
};

export const addMessage = async (conversationId, sender, content, metadata = {}) => {
  const result = await query(
    'INSERT INTO messages (conversation_id, sender, content, metadata) VALUES ($1, $2, $3, $4) RETURNING *',
    [conversationId, sender, content, metadata]
  );
  
  await query(
    'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [conversationId]
  );
  
  return result.rows[0];
};

export const getMessages = async (conversationId, limit = 50) => {
  const result = await query(
    'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2',
    [conversationId, limit]
  );
  return result.rows;
};

export const getAllConversations = async (limit = 100, filters = {}) => {
  let whereClause = '1=1';
  const params = [];
  let paramCount = 1;

  if (filters.assignedTo) {
    whereClause += ` AND c.assigned_to = $${paramCount++}`;
    params.push(filters.assignedTo);
  }

  if (filters.status) {
    whereClause += ` AND c.status = $${paramCount++}`;
    params.push(filters.status);
  }

  if (filters.unassignedOnly) {
    whereClause += ` AND c.assigned_to IS NULL`;
  }

  params.push(limit);

  const result = await query(
    `SELECT c.*, 
      u.name as assigned_to_name,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
     FROM conversations c 
     LEFT JOIN users u ON c.assigned_to = u.id
     WHERE ${whereClause}
     ORDER BY c.updated_at DESC 
     LIMIT $${paramCount}`,
    params
  );
  return result.rows;
};

export const updateConversationStatus = async (conversationId, status) => {
  const result = await query(
    'UPDATE conversations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
    [status, conversationId]
  );
  return result.rows[0];
};

export const assignConversation = async (conversationId, userId) => {
  const result = await query(
    'UPDATE conversations SET assigned_to = $1, assigned_at = CURRENT_TIMESTAMP, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
    [userId, 'assigned', conversationId]
  );
  return result.rows[0];
};

export const unassignConversation = async (conversationId) => {
  const result = await query(
    'UPDATE conversations SET assigned_to = NULL, assigned_at = NULL, status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
    ['unassigned', conversationId]
  );
  return result.rows[0];
};

export default pool;

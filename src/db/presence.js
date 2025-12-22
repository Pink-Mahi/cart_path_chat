import { query } from './database.js';

export const setUserOnline = async (userId) => {
  await query(
    `INSERT INTO admin_presence (user_id, is_online, last_activity)
     VALUES ($1, TRUE, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id) 
     DO UPDATE SET is_online = TRUE, last_activity = CURRENT_TIMESTAMP`,
    [userId]
  );
};

export const setUserOffline = async (userId) => {
  await query(
    `UPDATE admin_presence 
     SET is_online = FALSE, current_conversation_id = NULL, is_typing = FALSE, last_activity = CURRENT_TIMESTAMP
     WHERE user_id = $1`,
    [userId]
  );
};

export const setUserViewingConversation = async (userId, conversationId) => {
  await query(
    `INSERT INTO admin_presence (user_id, current_conversation_id, last_activity)
     VALUES ($1, $2, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id)
     DO UPDATE SET current_conversation_id = $2, last_activity = CURRENT_TIMESTAMP`,
    [userId, conversationId]
  );
};

export const setUserTyping = async (userId, conversationId, isTyping) => {
  await query(
    `INSERT INTO admin_presence (user_id, current_conversation_id, is_typing, last_activity)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id)
     DO UPDATE SET current_conversation_id = $2, is_typing = $3, last_activity = CURRENT_TIMESTAMP`,
    [userId, conversationId, isTyping]
  );
};

export const getUsersViewingConversation = async (conversationId) => {
  const result = await query(
    `SELECT u.id, u.name, u.email, p.is_typing
     FROM admin_presence p
     JOIN users u ON p.user_id = u.id
     WHERE p.current_conversation_id = $1 AND p.is_online = TRUE`,
    [conversationId]
  );
  return result.rows;
};

export const getOnlineUsers = async () => {
  const result = await query(
    `SELECT u.id, u.name, u.email, u.role, p.current_conversation_id, p.is_typing, p.last_activity
     FROM users u
     LEFT JOIN admin_presence p ON u.id = p.user_id
     WHERE u.is_active = TRUE AND (p.is_online = TRUE OR p.last_activity > NOW() - INTERVAL '5 minutes')
     ORDER BY u.name`
  );
  return result.rows;
};

export const clearStalePresence = async () => {
  // Mark users as offline if no activity for 10 minutes
  await query(
    `UPDATE admin_presence 
     SET is_online = FALSE, current_conversation_id = NULL, is_typing = FALSE
     WHERE last_activity < NOW() - INTERVAL '10 minutes' AND is_online = TRUE`
  );
};

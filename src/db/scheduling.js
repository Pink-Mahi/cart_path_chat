import { query } from './database.js';

export const createScheduledVisit = async (data) => {
  const {
    conversationId,
    visitorName,
    visitorEmail,
    visitorPhone,
    propertyAddress,
    propertyType,
    preferredDate,
    preferredTime,
    notes
  } = data;

  const result = await query(
    `INSERT INTO scheduled_visits 
     (conversation_id, visitor_name, visitor_email, visitor_phone, property_address, 
      property_type, preferred_date, preferred_time, notes) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
     RETURNING *`,
    [conversationId, visitorName, visitorEmail, visitorPhone, propertyAddress, 
     propertyType, preferredDate, preferredTime, notes]
  );

  return result.rows[0];
};

export const getScheduledVisits = async (limit = 100) => {
  const result = await query(
    `SELECT sv.*, c.visitor_id 
     FROM scheduled_visits sv
     LEFT JOIN conversations c ON sv.conversation_id = c.id
     ORDER BY sv.preferred_date ASC, sv.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
};

export const getScheduledVisit = async (id) => {
  const result = await query(
    'SELECT * FROM scheduled_visits WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

export const updateScheduledVisitStatus = async (id, status) => {
  const result = await query(
    'UPDATE scheduled_visits SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
    [status, id]
  );
  return result.rows[0];
};

export const getUpcomingVisits = async (daysAhead = 7) => {
  const result = await query(
    `SELECT * FROM scheduled_visits 
     WHERE preferred_date >= CURRENT_DATE 
     AND preferred_date <= CURRENT_DATE + $1 
     AND status = 'pending'
     ORDER BY preferred_date ASC, preferred_time ASC`,
    [daysAhead]
  );
  return result.rows;
};

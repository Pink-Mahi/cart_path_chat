import { query } from './database.js';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const createUser = async (name, email, password, role = 'agent', phoneNumber = null) => {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role, phone_number) 
     VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, phone_number, is_active, created_at`,
    [name, email, passwordHash, role, phoneNumber]
  );
  return result.rows[0];
};

export const getUserByEmail = async (email) => {
  const result = await query(
    'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
    [email]
  );
  return result.rows[0];
};

export const getUserById = async (id) => {
  const result = await query(
    'SELECT id, name, email, role, phone_number, notify_sms, notify_call, notify_in_app, is_muted, muted_until, work_schedule, is_active, last_seen FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

export const getUserWithPassword = async (id) => {
  const result = await query(
    'SELECT id, name, email, password_hash FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

export const getAllUsers = async () => {
  const result = await query(
    'SELECT id, name, email, role, phone_number, is_active, last_seen, created_at FROM users ORDER BY created_at DESC'
  );
  return result.rows;
};

export const getActiveAdmins = async () => {
  const result = await query(
    'SELECT id, name, email, phone_number, notify_sms, notify_call, is_muted, muted_until, work_schedule FROM users WHERE role = $1 AND is_active = TRUE',
    ['admin']
  );
  return result.rows;
};

export const verifyPassword = async (password, passwordHash) => {
  return await bcrypt.compare(password, passwordHash);
};

export const updateUser = async (id, updates) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramCount++}`);
    values.push(updates.name);
  }
  if (updates.email !== undefined) {
    fields.push(`email = $${paramCount++}`);
    values.push(updates.email);
  }
  if (updates.role !== undefined) {
    fields.push(`role = $${paramCount++}`);
    values.push(updates.role);
  }
  if (updates.phone_number !== undefined) {
    fields.push(`phone_number = $${paramCount++}`);
    values.push(updates.phone_number);
  }
  if (updates.is_active !== undefined) {
    fields.push(`is_active = $${paramCount++}`);
    values.push(updates.is_active);
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, name, email, role, phone_number, is_active`,
    values
  );
  return result.rows[0];
};

export const updateUserPassword = async (id, newPassword) => {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await query(
    'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [passwordHash, id]
  );
};

export const updateUserNotificationSettings = async (id, settings) => {
  const fields = [];
  const values = [];
  let paramCount = 1;

  if (settings.notify_sms !== undefined) {
    fields.push(`notify_sms = $${paramCount++}`);
    values.push(settings.notify_sms);
  }
  if (settings.notify_call !== undefined) {
    fields.push(`notify_call = $${paramCount++}`);
    values.push(settings.notify_call);
  }
  if (settings.notify_in_app !== undefined) {
    fields.push(`notify_in_app = $${paramCount++}`);
    values.push(settings.notify_in_app);
  }
  if (settings.is_muted !== undefined) {
    fields.push(`is_muted = $${paramCount++}`);
    values.push(settings.is_muted);
  }
  if (settings.muted_until !== undefined) {
    fields.push(`muted_until = $${paramCount++}`);
    values.push(settings.muted_until);
  }
  if (settings.work_schedule !== undefined) {
    fields.push(`work_schedule = $${paramCount++}`);
    values.push(JSON.stringify(settings.work_schedule));
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const result = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, notify_sms, notify_call, notify_in_app, is_muted, muted_until, work_schedule`,
    values
  );
  return result.rows[0];
};

export const updateUserLastSeen = async (id) => {
  await query(
    'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );
};

export const deactivateUser = async (id) => {
  await query(
    'UPDATE users SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );
};

export const isUserAvailableForNotification = (user) => {
  // Check if manually muted
  if (user.is_muted) {
    if (user.muted_until && new Date() < new Date(user.muted_until)) {
      return false;
    }
  }

  // Check work schedule
  if (user.work_schedule) {
    const now = new Date();
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const daySchedule = user.work_schedule[dayOfWeek];
    if (!daySchedule || !daySchedule.enabled) {
      return false;
    }

    // Check if within work hours
    if (daySchedule.start && daySchedule.end) {
      if (currentTime < daySchedule.start || currentTime >= daySchedule.end) {
        return false;
      }
    }

    // Check lunch break
    const lunchBreak = user.work_schedule.lunch_break;
    if (lunchBreak && lunchBreak.enabled && lunchBreak.start && lunchBreak.end) {
      if (currentTime >= lunchBreak.start && currentTime < lunchBreak.end) {
        return false;
      }
    }
  }

  return true;
};

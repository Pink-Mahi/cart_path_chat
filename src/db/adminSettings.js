import { query } from './database.js';

const SETTINGS_ID = 1;

export async function getAdminSettings() {
  const result = await query('SELECT * FROM admin_settings WHERE id = $1', [SETTINGS_ID]);
  if (result.rows.length > 0) return result.rows[0];

  const created = await query(
    `INSERT INTO admin_settings (id)
     VALUES ($1)
     RETURNING *`,
    [SETTINGS_ID]
  );
  return created.rows[0];
}

export async function updateAdminSettings(patch) {
  const current = await getAdminSettings();

  const next = {
    on_duty_phone: patch.on_duty_phone ?? current.on_duty_phone,
    notify_sms_new_chat: patch.notify_sms_new_chat ?? current.notify_sms_new_chat,
    notify_call_new_chat: patch.notify_call_new_chat ?? current.notify_call_new_chat,
    notify_sms_needs_human: patch.notify_sms_needs_human ?? current.notify_sms_needs_human,
    notify_call_needs_human: patch.notify_call_needs_human ?? current.notify_call_needs_human
  };

  const updated = await query(
    `UPDATE admin_settings
     SET on_duty_phone = $1,
         notify_sms_new_chat = $2,
         notify_call_new_chat = $3,
         notify_sms_needs_human = $4,
         notify_call_needs_human = $5,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $6
     RETURNING *`,
    [
      next.on_duty_phone,
      next.notify_sms_new_chat,
      next.notify_call_new_chat,
      next.notify_sms_needs_human,
      next.notify_call_needs_human,
      SETTINGS_ID
    ]
  );

  return updated.rows[0];
}

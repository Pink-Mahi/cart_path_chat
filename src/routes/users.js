import express from 'express';
import bcrypt from 'bcrypt';
import { 
  createUser, 
  getAllUsers, 
  getUserById,
  getUserWithPassword,
  updateUser, 
  updateUserPassword,
  updateUserNotificationSettings,
  deactivateUser 
} from '../db/users.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all users (all authenticated users can see team members)
router.get('/', requireAuth, async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Create user (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, phone_number } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password required' });
    }

    if (role && !['admin', 'agent'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await createUser(name, email, password, role || 'agent', phone_number);
    res.json(user);
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// Get user by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Agents can only view their own profile, admins can view anyone
    if (req.session.userRole !== 'admin' && req.session.userId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user (admin only, or self for basic info)
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { name, email, role, phone_number, is_active } = req.body;

    // Check permissions
    const isSelf = req.session.userId === req.params.id;
    const isAdmin = req.session.userRole === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only admins can change role and is_active
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone_number !== undefined) updates.phone_number = phone_number;
    
    if (isAdmin) {
      if (role !== undefined) updates.role = role;
      if (is_active !== undefined) updates.is_active = is_active;
    }

    const user = await updateUser(req.params.id, updates);
    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Change password with current password verification
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    // Verify current password
    const user = await getUserWithPassword(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Update to new password
    await updateUserPassword(req.session.userId, newPassword);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Update password (self only) - admin can reset without current password
router.patch('/:id/password', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    // Users can only change their own password
    if (req.session.userId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await updateUserPassword(req.params.id, password);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Update notification settings (self only)
router.patch('/:id/notifications', requireAuth, async (req, res) => {
  try {
    const { notify_sms, notify_call, notify_in_app, is_muted, muted_until, work_schedule } = req.body;

    // Users can only change their own settings
    if (req.session.userId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const settings = {};
    if (notify_sms !== undefined) settings.notify_sms = notify_sms;
    if (notify_call !== undefined) settings.notify_call = notify_call;
    if (notify_in_app !== undefined) settings.notify_in_app = notify_in_app;
    if (is_muted !== undefined) settings.is_muted = is_muted;
    if (muted_until !== undefined) settings.muted_until = muted_until;
    if (work_schedule !== undefined) settings.work_schedule = work_schedule;

    const user = await updateUserNotificationSettings(req.params.id, settings);
    res.json(user);
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// Quick mute actions (self only)
router.post('/:id/mute', requireAuth, async (req, res) => {
  try {
    const { duration } = req.body; // 'lunch', 'day', 'custom', or null to unmute

    if (req.session.userId !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let mutedUntil = null;
    let isMuted = false;

    if (duration === 'lunch') {
      // Mute for 1 hour
      mutedUntil = new Date(Date.now() + 60 * 60 * 1000);
      isMuted = true;
    } else if (duration === 'day') {
      // Mute until tomorrow 9am
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      mutedUntil = tomorrow;
      isMuted = true;
    } else if (duration && typeof duration === 'number') {
      // Custom duration in minutes
      mutedUntil = new Date(Date.now() + duration * 60 * 1000);
      isMuted = true;
    }

    const user = await updateUserNotificationSettings(req.params.id, {
      is_muted: isMuted,
      muted_until: mutedUntil
    });

    res.json(user);
  } catch (error) {
    console.error('Mute user error:', error);
    res.status(500).json({ error: 'Failed to mute user' });
  }
});

// Deactivate user (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await deactivateUser(req.params.id);
    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// Update user presence (last_seen)
router.post('/:id/presence', requireAuth, async (req, res) => {
  try {
    if (req.params.id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await query(
      'UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1',
      [req.params.id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update presence error:', error);
    res.status(500).json({ error: 'Failed to update presence' });
  }
});

export default router;

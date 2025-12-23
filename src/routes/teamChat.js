import express from 'express';
import { query } from '../db/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get team chat messages
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT tc.*, u.name as sender_name 
       FROM team_chat tc
       JOIN users u ON tc.sender_id = u.id
       ORDER BY tc.created_at DESC
       LIMIT 100`,
      []
    );
    
    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Get team chat error:', error);
    res.status(500).json({ error: 'Failed to fetch team chat' });
  }
});

// Send team chat message
router.post('/', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const result = await query(
      'INSERT INTO team_chat (sender_id, content) VALUES ($1, $2) RETURNING *',
      [req.user.id, content.trim()]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Send team chat error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;

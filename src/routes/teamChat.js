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

// Edit team chat message
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    // Check if message belongs to user
    const checkResult = await query(
      'SELECT sender_id FROM team_chat WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (checkResult.rows[0].sender_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own messages' });
    }
    
    const result = await query(
      'UPDATE team_chat SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [content.trim(), id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Edit team chat error:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// Delete team chat message
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if message belongs to user
    const checkResult = await query(
      'SELECT sender_id FROM team_chat WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (checkResult.rows[0].sender_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }
    
    await query('DELETE FROM team_chat WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete team chat error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;

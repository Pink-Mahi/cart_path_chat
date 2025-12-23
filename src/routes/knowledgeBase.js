import express from 'express';
import {
  createKnowledgeEntry,
  getAllKnowledgeEntries,
  getKnowledgeEntryById,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
  getKnowledgeByCategory
} from '../db/knowledgeBase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all knowledge entries (admin only)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const entries = await getAllKnowledgeEntries();
    res.json(entries);
  } catch (error) {
    console.error('Get knowledge entries error:', error);
    res.status(500).json({ error: 'Failed to get knowledge entries' });
  }
});

// Get knowledge entry by ID (admin only)
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await getKnowledgeEntryById(id);
    
    if (!entry) {
      return res.status(404).json({ error: 'Knowledge entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    console.error('Get knowledge entry error:', error);
    res.status(500).json({ error: 'Failed to get knowledge entry' });
  }
});

// Create knowledge entry (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { category, question, answer, isActive } = req.body;
    
    if (!category || !question || !answer) {
      return res.status(400).json({ error: 'Category, question, and answer are required' });
    }
    
    const entry = await createKnowledgeEntry(category, question, answer, isActive);
    res.status(201).json(entry);
  } catch (error) {
    console.error('Create knowledge entry error:', error);
    res.status(500).json({ error: 'Failed to create knowledge entry' });
  }
});

// Update knowledge entry (admin only)
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, question, answer, isActive } = req.body;
    
    if (!category || !question || !answer) {
      return res.status(400).json({ error: 'Category, question, and answer are required' });
    }
    
    const entry = await updateKnowledgeEntry(id, category, question, answer, isActive);
    
    if (!entry) {
      return res.status(404).json({ error: 'Knowledge entry not found' });
    }
    
    res.json(entry);
  } catch (error) {
    console.error('Update knowledge entry error:', error);
    res.status(500).json({ error: 'Failed to update knowledge entry' });
  }
});

// Delete knowledge entry (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await deleteKnowledgeEntry(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete knowledge entry error:', error);
    res.status(500).json({ error: 'Failed to delete knowledge entry' });
  }
});

// Get knowledge by category (admin only)
router.get('/category/:category', requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const entries = await getKnowledgeByCategory(category);
    res.json(entries);
  } catch (error) {
    console.error('Get knowledge by category error:', error);
    res.status(500).json({ error: 'Failed to get knowledge by category' });
  }
});

export default router;

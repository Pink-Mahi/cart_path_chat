import { query } from './database.js';

export const createKnowledgeEntry = async (category, question, answer, isActive = true) => {
  const result = await query(
    `INSERT INTO knowledge_base (category, question, answer, is_active) 
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [category, question, answer, isActive]
  );
  return result.rows[0];
};

export const getAllKnowledgeEntries = async () => {
  const result = await query(
    'SELECT * FROM knowledge_base ORDER BY category, created_at DESC'
  );
  return result.rows;
};

export const getActiveKnowledgeEntries = async () => {
  const result = await query(
    'SELECT * FROM knowledge_base WHERE is_active = TRUE ORDER BY category, created_at DESC'
  );
  return result.rows;
};

export const getKnowledgeEntryById = async (id) => {
  const result = await query(
    'SELECT * FROM knowledge_base WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

export const updateKnowledgeEntry = async (id, category, question, answer, isActive) => {
  const result = await query(
    `UPDATE knowledge_base 
     SET category = $1, question = $2, answer = $3, is_active = $4, updated_at = CURRENT_TIMESTAMP 
     WHERE id = $5 RETURNING *`,
    [category, question, answer, isActive, id]
  );
  return result.rows[0];
};

export const deleteKnowledgeEntry = async (id) => {
  await query('DELETE FROM knowledge_base WHERE id = $1', [id]);
};

export const getKnowledgeByCategory = async (category) => {
  const result = await query(
    'SELECT * FROM knowledge_base WHERE category = $1 AND is_active = TRUE ORDER BY created_at DESC',
    [category]
  );
  return result.rows;
};

export const getKnowledgeBaseAsContext = async () => {
  const entries = await getActiveKnowledgeEntries();
  
  if (entries.length === 0) {
    return '';
  }
  
  const categorized = entries.reduce((acc, entry) => {
    if (!acc[entry.category]) {
      acc[entry.category] = [];
    }
    acc[entry.category].push(entry);
    return acc;
  }, {});
  
  let context = '\nCompany Knowledge Base:\n\n';
  
  for (const [category, items] of Object.entries(categorized)) {
    context += `${category}:\n`;
    items.forEach(item => {
      context += `Q: ${item.question}\nA: ${item.answer}\n\n`;
    });
  }
  
  return context;
};

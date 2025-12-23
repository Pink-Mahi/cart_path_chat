import { query } from '../src/db/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  console.log('\n=== Running Team Features Migration ===\n');

  try {
    // Create users table
    console.log('Creating users table...');
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'agent',
        phone_number VARCHAR(50),
        notify_sms BOOLEAN DEFAULT TRUE,
        notify_call BOOLEAN DEFAULT FALSE,
        notify_in_app BOOLEAN DEFAULT TRUE,
        is_muted BOOLEAN DEFAULT FALSE,
        muted_until TIMESTAMP,
        work_schedule JSONB DEFAULT '{"monday":{"start":"09:00","end":"17:00","enabled":true},"tuesday":{"start":"09:00","end":"17:00","enabled":true},"wednesday":{"start":"09:00","end":"17:00","enabled":true},"thursday":{"start":"09:00","end":"17:00","enabled":true},"friday":{"start":"09:00","end":"17:00","enabled":true},"saturday":{"enabled":false},"sunday":{"enabled":false},"lunch_break":{"start":"12:00","end":"13:00","enabled":false}}',
        is_active BOOLEAN DEFAULT TRUE,
        last_seen TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add new columns to conversations table
    console.log('Updating conversations table...');
    
    // Check if columns exist before adding
    const checkAssignedTo = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='conversations' AND column_name='assigned_to'
    `);
    
    if (checkAssignedTo.rows.length === 0) {
      await query(`ALTER TABLE conversations ADD COLUMN assigned_to UUID REFERENCES users(id) ON DELETE SET NULL`);
      console.log('  - Added assigned_to column');
    }

    const checkAssignedAt = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='conversations' AND column_name='assigned_at'
    `);
    
    if (checkAssignedAt.rows.length === 0) {
      await query(`ALTER TABLE conversations ADD COLUMN assigned_at TIMESTAMP`);
      console.log('  - Added assigned_at column');
    }

    // Update status column default if needed
    const checkStatus = await query(`
      SELECT column_name, column_default
      FROM information_schema.columns 
      WHERE table_name='conversations' AND column_name='status'
    `);
    
    if (checkStatus.rows.length > 0 && checkStatus.rows[0].column_default !== "'unassigned'::character varying") {
      await query(`ALTER TABLE conversations ALTER COLUMN status SET DEFAULT 'unassigned'`);
      console.log('  - Updated status column default to unassigned');
    }

    // Create admin_presence table
    console.log('Creating admin_presence table...');
    await query(`
      CREATE TABLE IF NOT EXISTS admin_presence (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        is_online BOOLEAN DEFAULT FALSE,
        current_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        is_typing BOOLEAN DEFAULT FALSE,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    console.log('Creating indexes...');
    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_admin_presence_conversation ON admin_presence(current_conversation_id)`);

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: node scripts/createAdminUser.js');
    console.log('2. Login at /login.html\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }

  process.exit(0);
}

runMigration();

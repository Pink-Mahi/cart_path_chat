import { createUser } from '../src/db/users.js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n=== Create Admin User ===\n');

  const name = await question('Admin name: ');
  const email = await question('Admin email: ');
  const password = await question('Admin password: ');
  const phoneNumber = await question('Phone number (optional, E.164 format): ');

  if (!name || !email || !password) {
    console.error('Error: Name, email, and password are required');
    process.exit(1);
  }

  try {
    const user = await createUser(
      name,
      email,
      password,
      'admin',
      phoneNumber || null
    );

    console.log('\n✅ Admin user created successfully!');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    if (user.phone_number) {
      console.log(`   Phone: ${user.phone_number}`);
    }
    console.log('\nYou can now login at /login.html\n');
  } catch (error) {
    if (error.code === '23505') {
      console.error('\n❌ Error: Email already exists');
    } else {
      console.error('\n❌ Error creating admin user:', error.message);
    }
    process.exit(1);
  }

  rl.close();
  process.exit(0);
}

main();

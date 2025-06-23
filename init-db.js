#!/usr/bin/env node

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    // Create admin user if doesn't exist
    const adminEmail = 'admin@localhost';
    const adminPassword = 'admin123'; // Change this after first login
    
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const result = await client.query(`
      INSERT INTO users (
        id, 
        email, 
        password, 
        first_name, 
        last_name, 
        is_active, 
        is_admin, 
        email_verified,
        token_quota,
        created_at,
        updated_at
      ) VALUES (
        'admin-' || gen_random_uuid()::text,
        $1,
        $2,
        'Admin',
        'User',
        true,
        true,
        true,
        100000,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) ON CONFLICT (email) DO UPDATE SET
        is_admin = true,
        is_active = true,
        token_quota = 100000
      RETURNING id, email;
    `, [adminEmail, hashedPassword]);

    if (result.rows.length > 0) {
      console.log('✓ Admin user created/updated:', result.rows[0]);
    }

    // Insert default admin configuration
    await client.query(`
      INSERT INTO admin_config (
        api_provider,
        model_name,
        default_token_quota,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        'openai',
        'gpt-4',
        10000,
        false,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      ) ON CONFLICT DO NOTHING;
    `);

    console.log('✓ Default admin configuration inserted');
    console.log('\n=== Database Setup Complete ===');
    console.log('Admin credentials:');
    console.log('Email: admin@localhost');
    console.log('Password: admin123');
    console.log('⚠️  Please change the admin password after first login!\n');

  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
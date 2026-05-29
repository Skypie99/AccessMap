#!/usr/bin/env node

// Simple script to help apply migrations
// Read the SQL files and show what needs to be executed

const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'supabase/schema.sql');
const migrationPath = path.join(__dirname, 'supabase/migrations/2026-05-25_flag_edit_rls.sql');

try {
  // Read SQL files
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const migration = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📄 Schema file:', schemaPath);
  console.log('   Size:', (schema.length / 1024).toFixed(2), 'KB');

  console.log('\n📄 Migration file:', migrationPath);
  console.log('   Size:', (migration.length / 1024).toFixed(2), 'KB');

  // Count statements
  const schemaCount = schema.split(';').filter(s => s.trim().length > 0).length;
  const migrationCount = migration.split(';').filter(s => s.trim().length > 0).length;

  console.log('\n✅ Total statements:');
  console.log('   Schema:', schemaCount);
  console.log('   Migration:', migrationCount);

  console.log('\n📋 To apply these migrations:');
  console.log('   1. Go to Supabase dashboard: https://supabase.com/dashboard');
  console.log('   2. Select project: kldlwszpfkdmsjrjhjym');
  console.log('   3. Go to SQL Editor');
  console.log('   4. Create new query');
  console.log('   5. Copy and paste the content below into the editor');
  console.log('   6. Click "Execute" to run');

  console.log('\n' + '='.repeat(70));
  console.log('BEGIN: SCHEMA SQL');
  console.log('='.repeat(70));
  console.log(schema);

  console.log('\n' + '='.repeat(70));
  console.log('BEGIN: MIGRATION SQL');
  console.log('='.repeat(70));
  console.log(migration);

} catch (err) {
  console.error('❌ Error reading files:', err.message);
  process.exit(1);
}

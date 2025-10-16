// scripts/import-database.js
const { query } = require('../backend/config/database');
const fs = require('fs');
const path = require('path');

async function importDatabase() {
  try {
    console.log('Starting database import...\n');

    const backupFile = path.join(__dirname, '../db/backup/parkarlabs_backup.sql');

    if (!fs.existsSync(backupFile)) {
      console.error('❌ Backup file not found:', backupFile);
      console.log('Please ensure parkarlabs_backup.sql exists in db/backup/ directory');
      process.exit(1);
    }

    console.log('📁 Reading backup file...');
    const sqlContent = fs.readFileSync(backupFile, 'utf8');

    // Split SQL statements (basic splitting by semicolon)
    const statements = sqlContent
      .split('\n')
      .filter(line => !line.startsWith('--') && line.trim() !== '' && !line.startsWith('SET'))
      .join('\n')
      .split(';')
      .filter(stmt => stmt.trim() !== '');

    console.log(`📊 Found ${statements.length} SQL statements\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;

      try {
        await query(statement);
        successCount++;

        // Show progress every 100 statements
        if ((i + 1) % 100 === 0) {
          console.log(`  Processed ${i + 1}/${statements.length} statements...`);
        }
      } catch (error) {
        errorCount++;
        if (errorCount <= 5) {
          console.error(`  ⚠ Warning (statement ${i + 1}):`, error.message);
        }
      }
    }

    console.log(`\n✅ Database import completed!`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Import error:', error);
    process.exit(1);
  }
}

importDatabase();

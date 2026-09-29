import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../database/vetassist.db');
const BACKUP_DIR = path.join(__dirname, '../backups');

const targetBackup = process.argv[2];

if (!targetBackup) {
  console.log(`\nUsage: node scripts/restore.js <backup-file-name-or-path>`);
  if (fs.existsSync(BACKUP_DIR)) {
    const available = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db'));
    console.log(`Available backups in ${BACKUP_DIR}:`);
    available.forEach(f => console.log(` - ${f}`));
  }
  process.exit(1);
}

const resolvedPath = path.isAbsolute(targetBackup)
  ? targetBackup
  : fs.existsSync(targetBackup)
  ? targetBackup
  : path.join(BACKUP_DIR, targetBackup);

if (!fs.existsSync(resolvedPath)) {
  console.error(`❌ Backup file not found at: ${resolvedPath}`);
  process.exit(1);
}

fs.copyFileSync(resolvedPath, DB_PATH);
console.log(`\n✅ Database restored successfully from: ${resolvedPath}`);
console.log(`📁 Active database location: ${DB_PATH}\n`);

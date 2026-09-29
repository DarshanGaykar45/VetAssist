import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../database/vetassist.db');
const BACKUP_DIR = path.join(__dirname, '../backups');

if (!fs.existsSync(DB_PATH)) {
  console.error(`❌ Database file not found at: ${DB_PATH}`);
  process.exit(1);
}

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(BACKUP_DIR, `vetassist_backup_${timestamp}.db`);

fs.copyFileSync(DB_PATH, backupPath);

const stats = fs.statSync(backupPath);
console.log(`\n======================================================`);
console.log(`✅ Database backup created successfully!`);
console.log(`📁 File: ${backupPath}`);
console.log(`📦 Size: ${(stats.size / 1024).toFixed(2)} KB`);
console.log(`🕒 Timestamp: ${new Date().toLocaleString()}`);
console.log(`======================================================\n`);

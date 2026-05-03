import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sqliteDb = require('./db.cjs');
const pg = require('./db_pg.cjs');

export async function logAction({ userId, userName, action, details, type, ip, device }) {
  const timestamp = new Date().toISOString();
  try {
    if (pg) {
      await pg.query(`
        INSERT INTO logs (userId, userName, action, details, type, ip, device, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        userId || null, 
        userName || null, 
        action, 
        details ? JSON.stringify(details) : null, 
        type || 'activity', 
        ip || null, 
        device || null, 
        timestamp
      ]);
    } else {
      sqliteDb.prepare(`
        INSERT INTO logs (userId, userName, action, details, type, ip, device, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId || null, 
        userName || null, 
        action, 
        details ? JSON.stringify(details) : null, 
        type || 'activity', 
        ip || null, 
        device || null, 
        timestamp
      );
    }
  } catch (err) {
    console.error('Logging error:', err);
  }
}

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sqliteDb = require('./db.cjs');
const pg = require('./db_pg.cjs');
import { logAction } from './logger.js';

export async function triggerAutomation(event, payload) {
  try {
    let rules = [];
    if (pg) {
      const { rows } = await pg.query('SELECT * FROM automation_rules WHERE is_active = true AND trigger_type = $1 AND trigger_event = $2', ['event', event]);
      rules = rows;
    } else {
      rules = sqliteDb.prepare('SELECT * FROM automation_rules WHERE is_active = 1 AND trigger_type = ? AND trigger_event = ?').all('event', event);
    }

    for (const rule of rules) {
      const params = rule.action_params ? JSON.parse(rule.action_params) : {};
      
      if (rule.action_type === 'send_notification') {
        const message = params.message || `Automated alert for ${event}`;
        const date = new Date().toISOString();
        if (pg) {
          await pg.query('INSERT INTO notices (title, content, date, author) VALUES ($1, $2, $3, $4)', ['Auto Alert', message, date, 'System']);
        } else {
          sqliteDb.prepare('INSERT INTO notices (title, content, date, author) VALUES (?, ?, ?, ?)').run('Auto Alert', message, date, 'System');
        }
      } else if (rule.action_type === 'clean_logs') {
        if (pg) {
          await pg.query("DELETE FROM logs WHERE timestamp < NOW() - INTERVAL '7 days'");
        } else {
          sqliteDb.prepare("DELETE FROM logs WHERE timestamp < datetime('now', '-7 days')").run();
        }
      } else if (rule.action_type === 'generate_report') {
        logAction({
          userId: 'system',
          userName: 'System',
          action: `Generated automated report for ${event}`,
          type: 'activity'
        });
      }
    }
  } catch (err) {
    console.error('Automation error:', err);
  }
}

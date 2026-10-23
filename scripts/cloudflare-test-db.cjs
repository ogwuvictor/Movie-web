// Test-only D1 adapter. Production uses Cloudflare's actual D1 binding.
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
module.exports = function testDatabase() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(fs.readFileSync(path.join(__dirname, '../cloudflare/schema.sql'), 'utf8'));
  const execute = (query, values) => {
    const statement = sql.prepare(query);
    if (statement.columns().length) return { success: true, results: statement.all(...values), meta: { changes: 0 } };
    const result = statement.run(...values);
    return { success: true, results: [], meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  };
  const db = {
    prepare(query) {
      let values = [];
      return { bind(...input) { values = input; return this; },
        async first() { return execute(query, values).results[0] || null; },
        async all() { return execute(query, values); },
        async run() { return execute(query, values); }
      };
    },
    async batch(statements) {
      sql.exec('BEGIN IMMEDIATE');
      try { const results = []; for (const statement of statements) results.push(await statement.all()); sql.exec('COMMIT'); return results; }
      catch (error) { sql.exec('ROLLBACK'); throw error; }
    },
    withSession(mode) { if (mode !== 'first-primary') throw Error('Unexpected consistency mode'); return db; },
    sql,
    close() { sql.close(); }
  };
  return db;
};

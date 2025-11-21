#!/usr/bin/env node
/**
 * scripts/fetch_openai_threads.js
 *
 * Fetch conversations from OpenAI by thread id (openai_thread_id) stored in a source DB
 * and store raw responses in the target v2 DB in a `migration_preview` table.
 *
 * Usage:
 *   # dry-run (default): collect previews but don't write to messages
 *   node scripts/fetch_openai_threads.js --limit 100 --batch 20
 *
 * Environment variables (via .env):
 *   OPENAI_API_KEY           (required)
 *   SOURCE_DB_NAME           default: iunaorg_chatBeto
 *   TARGET_DB_NAME           default: iunaorg_chatBeto_v2
 *   DB_HOST, DB_USER, DB_PASSWORD, DB_PORT
 *
 * This script is safe by default (it only inserts into migration_preview). To
 * actually write into messages you'd set --write (not recommended without review).
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is required in environment (.env)');
  process.exit(1);
}

const argv = require('minimist')(process.argv.slice(2));
const LIMIT = Number(argv.limit || 100);
const BATCH = Number(argv.batch || 20);
const WRITE = Boolean(argv.write);
const SOURCE_DB = argv.sourceDb || process.env.SOURCE_DB_NAME || 'iunaorg_chatBeto';
const TARGET_DB = argv.targetDb || process.env.TARGET_DB_NAME || 'iunaorg_chatBeto_v2';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: false,
  charset: 'utf8mb4'
};

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';

async function createPreviewTable(pool) {
  const sql = `
    CREATE TABLE IF NOT EXISTS \`${TARGET_DB}\`.migration_preview (
      id INT AUTO_INCREMENT PRIMARY KEY,
      conversation_id VARCHAR(100) DEFAULT NULL,
      openai_thread_id VARCHAR(200) DEFAULT NULL,
      fetched_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
      raw_response LONGTEXT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await pool.execute(sql);
}

async function fetchThreadFromOpenAI(threadId) {
  const url = `${OPENAI_RESPONSES_URL}/${encodeURIComponent(threadId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${txt}`);
  }
  return res.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const sourcePool = await mysql.createPool({ ...dbConfig, database: SOURCE_DB });
  const targetPool = await mysql.createPool({ ...dbConfig, database: TARGET_DB });

  try {
    await createPreviewTable(targetPool);

    // Select thread ids from source conversations
    const [rows] = await sourcePool.execute(
      `SELECT id, conversation_id, openai_thread_id FROM \`${SOURCE_DB}\`.conversations WHERE openai_thread_id IS NOT NULL LIMIT ?`,
      [LIMIT]
    );

    console.log(`Found ${rows.length} conversations with openai_thread_id (limit ${LIMIT})`);

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      console.log(`Processing batch ${i/BATCH + 1} (${batch.length} items)`);

      for (const r of batch) {
        const threadId = r.openai_thread_id;
        try {
          console.log(`Fetching thread ${threadId} ...`);
          const resp = await fetchThreadFromOpenAI(threadId);

          // Insert preview
          const insertSql = `INSERT INTO \`${TARGET_DB}\`.migration_preview (conversation_id, openai_thread_id, raw_response) VALUES (?, ?, ?)`;
          await targetPool.execute(insertSql, [r.conversation_id, threadId, JSON.stringify(resp)]);

          // Respectful rate limit
          await sleep(200); // 5 req/sec ~ adjust if needed
        } catch (err) {
          console.error(`Failed fetching thread ${threadId}:`, err.message);
          // Insert an error placeholder so we know it failed
          await targetPool.execute(`INSERT INTO \`${TARGET_DB}\`.migration_preview (conversation_id, openai_thread_id, raw_response) VALUES (?, ?, ?)`, [r.conversation_id, threadId, JSON.stringify({ error: err.message })]);
        }
      }
    }

    console.log('Done. Preview rows inserted into migration_preview.');
  } finally {
    await sourcePool.end();
    await targetPool.end();
  }
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});

#!/usr/bin/env node
// Creates or updates one of the app's two accounts. Run this yourself
// against a real DATABASE_URL — real passwords never pass through a
// migration file or a chat session.
//
//   npm run create-user -- --username=alex --password=... --display-name="Alex"
//
// Re-running with an existing username updates that user's password and
// display name (upsert) rather than failing.

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) out[match[1]] = match[2];
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { username, password, ['display-name']: displayName } = args;

  if (!username || !password) {
    console.error('Usage: npm run create-user -- --username=<u> --password=<p> --display-name="<name>"');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Point it at the database you actually mean to write to.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (username, password_hash, display_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (username)
     DO UPDATE SET password_hash = EXCLUDED.password_hash, display_name = EXCLUDED.display_name`,
    [username, passwordHash, displayName || username]
  );

  console.log(`User "${username}" created/updated.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

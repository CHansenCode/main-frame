import bcrypt from 'bcryptjs';

import { pool } from './db';

export type AppUser = {
  id: number;
  username: string;
  displayName: string;
};

// Shared by NextAuth's Credentials provider (for a future web login) and
// the mobile login route — one users table, one place that checks a
// password against it.
export async function verifyCredentials(username: string, password: string): Promise<AppUser | null> {
  const result = await pool.query<{ id: number; username: string; password_hash: string; display_name: string }>(
    'SELECT id, username, password_hash, display_name FROM users WHERE username = $1',
    [username]
  );

  const row = result.rows[0];
  if (!row) return null;

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) return null;

  return { id: row.id, username: row.username, displayName: row.display_name };
}

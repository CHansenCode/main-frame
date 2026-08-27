/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Just the two accounts this app will ever have. Deliberately no
 * self-signup, no email verification, no password reset flow — real
 * credentials get created with `npm run create-user`, never committed
 * to a migration.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('users', {
    id: 'id',
    username: { type: 'text', notNull: true, unique: true },
    password_hash: { type: 'text', notNull: true },
    display_name: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('users');
};

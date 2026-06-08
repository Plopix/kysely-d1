import { env } from 'cloudflare:workers';
import { Kysely } from 'kysely';
import { beforeEach, describe, expect, it } from 'vitest';
import { D1Dialect } from '../src/index.ts';

interface UsersTable {
  id: number;
  name: string;
  email: string;
}

interface Database {
  users: UsersTable;
}

function createDb() {
  return new Kysely<Database>({ dialect: new D1Dialect({ database: env.DB }) });
}

describe('D1Dialect', () => {
  let db: Kysely<Database>;

  beforeEach(async () => {
    db = createDb();
    await db.deleteFrom('users').execute();
  });

  it('selects from an empty table', async () => {
    const rows = await db.selectFrom('users').selectAll().execute();
    expect(rows).toEqual([]);
  });

  it('inserts a row and returns insertId', async () => {
    const result = await db
      .insertInto('users')
      .values({ name: 'Alice', email: 'alice@example.com' })
      .executeTakeFirstOrThrow();

    expect(result.insertId).toBe(1n);
  });

  it('selects inserted rows', async () => {
    await db.insertInto('users').values({ name: 'Alice', email: 'alice@example.com' }).execute();
    await db.insertInto('users').values({ name: 'Bob', email: 'bob@example.com' }).execute();

    const rows = await db.selectFrom('users').selectAll().orderBy('id').execute();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: 'Alice', email: 'alice@example.com' });
    expect(rows[1]).toMatchObject({ name: 'Bob', email: 'bob@example.com' });
  });

  it('updates a row and returns numAffectedRows', async () => {
    await db.insertInto('users').values({ name: 'Alice', email: 'alice@example.com' }).execute();

    const result = await db
      .updateTable('users')
      .set({ name: 'Alicia' })
      .where('email', '=', 'alice@example.com')
      .executeTakeFirstOrThrow();

    expect(result.numUpdatedRows).toBe(1n);

    const user = await db.selectFrom('users').selectAll().where('email', '=', 'alice@example.com').executeTakeFirst();
    expect(user?.name).toBe('Alicia');
  });

  it('deletes a row and returns numAffectedRows', async () => {
    await db.insertInto('users').values({ name: 'Alice', email: 'alice@example.com' }).execute();

    const result = await db
      .deleteFrom('users')
      .where('email', '=', 'alice@example.com')
      .executeTakeFirstOrThrow();

    expect(result.numDeletedRows).toBe(1n);

    const rows = await db.selectFrom('users').selectAll().execute();
    expect(rows).toHaveLength(0);
  });

  it('throws on transaction attempt', async () => {
    await expect(db.transaction().execute(async () => {})).rejects.toThrow(
      'Transactions are not supported yet.',
    );
  });
});

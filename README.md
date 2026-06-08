# @notsplol/kysely-d1

[![ci](https://github.com/notsplol/kysely-d1/actions/workflows/ci.yaml/badge.svg)](https://github.com/notsplol/kysely-d1/actions/workflows/ci.yaml)
[![npm](https://img.shields.io/npm/v/@notsplol/kysely-d1.svg)](https://www.npmjs.com/package/@notsplol/kysely-d1)

[Kysely](https://github.com/koskimas/kysely) dialect for [Cloudflare D1](https://developers.cloudflare.com/d1/).

```bash
npm i @notsplol/kysely-d1
```

> This is an actively maintained fork of the original [kysely-d1](https://github.com/aidenwallis/kysely-d1) by Aiden Wallis, which appears to be no longer maintained. It targets the current Kysely and Cloudflare Workers APIs.

## Requirements

- `kysely >= 0.27.0`
- Cloudflare Workers or Pages environment with a D1 binding

## Usage

Pass your D1 binding into the dialect to configure the Kysely client. Follow [these docs](https://developers.cloudflare.com/d1/get-started/#4-bind-your-worker-to-your-d1-database) for instructions on how to bind D1 to your Worker.

```typescript
import { Kysely } from 'kysely';
import { D1Dialect } from '@notsplol/kysely-d1';

export interface Env {
  DB: D1Database;
}

interface KvTable {
  key: string;
  value: string;
}

interface Database {
  kv: KvTable;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (!key) {
      return new Response('No key defined.', { status: 400 });
    }

    // Create a Kysely instance using your D1 binding
    const db = new Kysely<Database>({ dialect: new D1Dialect({ database: env.DB }) });

    // Read row from D1 table
    const result = await db.selectFrom('kv').selectAll().where('key', '=', key).executeTakeFirst();
    if (!result) {
      return new Response('No value found.', { status: 404 });
    }

    return new Response(result.value);
  },
};
```

There is a working [example](example) included, which implements a simple K/V store.

## Transactions

Transactions are implemented using D1's [batch API](https://developers.cloudflare.com/d1/worker-api/d1-client-api/#dbbatch). All statements are buffered and submitted atomically on commit.

```typescript
await db.transaction().execute(async (trx) => {
  await trx.insertInto('users').values({ name: 'Alice', email: 'alice@example.com' }).execute();
  await trx.insertInto('users').values({ name: 'Bob', email: 'bob@example.com' }).execute();
});
```

> **Note:** Queries inside a transaction do not return rows or affected-row counts — the statements are buffered and not yet executed. Use transactions for writes only.

## Read replication (Sessions API)

To use D1's [global read replication](https://developers.cloudflare.com/d1/configuration/data-security/#global-read-replication) with sequential consistency, pass a session created via `withSession()` instead of the raw database binding:

```typescript
const session = env.DB.withSession('first-primary');
const db = new Kysely<Database>({ dialect: new D1Dialect({ database: session }) });

// ... run your queries

// Persist this bookmark and pass it to the next request to maintain consistency
const bookmark = session.getBookmark();
```

## Limitations

- **Transactions use D1's batch API** — reads within a transaction return empty results since statements are buffered until commit.
- **Streaming is not supported.**
- **D1 has a per-statement SQL variable limit.** Very large bulk inserts (many rows × many columns) may hit this limit. Split large inserts into smaller batches as a workaround.

# kysely-d1 example

A simple K/V store Worker demonstrating [@notsplol/kysely-d1](https://github.com/notsplol/kysely-d1) with [Cloudflare D1](https://developers.cloudflare.com/d1/).

## Setup

**Create a D1 database:**

```bash
npm run create-db
```

**Update `wrangler.toml` with your database ID:**

```toml
[[d1_databases]]
binding = "DB"
database_name = "kysely-test"
database_id = "<YOUR_DATABASE_ID>"
```

**Run the migration:**

```bash
npm run setup
```

## Running locally

```bash
npm run start
```

## API

- `GET /?action=get&key=foo` — read a value
- `GET /?action=set&key=foo&value=bar` — write a value
- `GET /?action=delete&key=foo` — delete a value

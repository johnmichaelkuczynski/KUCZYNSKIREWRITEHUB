# Kuczynski Rewriter

Rewrites user-supplied target text using authentic Kuczynski corpus passages and a choice of ChatGPT, Anthropic, DeepSeek, or Grok.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- Source retrieval must succeed before any model request. Never fall back to unsupported style imitation.
- The Kuczynski key is distinct from a Genius 101 account key.
- No account, payments, or permanent server-side text storage is needed for this scoped tool.

## Corpus integration blocker

The Kuczynski API key is saved securely, but its corpus endpoint and request/response contract have not been established. The public Genius 101 site does not expose corpus API documentation at the documentation locations inspected. Do not assume that the site's internal chat endpoint is a corpus retrieval API.

The server intentionally reports this missing configuration and refuses to rewrite. `KUCZYNSKI_API_URL` must only be configured after confirming the correct endpoint and adapting `artifacts/api-server/src/lib/rewriter.ts` to its actual contract. The current adapter is a provisional JSON POST `{query, limit}` with Bearer authorization and passage-array parsing, not a verified Genius 101 contract. No credential has been sent to an unconfirmed endpoint.

Model access is provisioned through Replit AI Integrations for OpenRouter. Model IDs were discovered from OpenRouter's models API. End-to-end corpus retrieval and rewriting are NOT verified.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

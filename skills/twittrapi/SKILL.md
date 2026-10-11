---
name: twittrapi
description: Read public X (Twitter) data through the TwittrAPI REST API or its MCP server - user profiles, tweets, replies, followers, search with X operators, lists, communities and trends. Use when a task needs tweets, X accounts, follower lists, X search results or trending topics, or when writing code against api.twittrapi.com. Covers auth (X-API-KEY), the compact simple response format, cursor pagination, errors and retries, and keeping spend inside a budget.
license: MIT
metadata:
  homepage: https://twittrapi.com
  docs: https://twittrapi.com/llms-full.txt
  openapi: https://twittrapi.com/openapi.json
---

# TwittrAPI

TwittrAPI is a pay-per-call REST API for public X (Twitter) data. Read endpoints are `GET`
requests on `https://api.twittrapi.com` with path and query parameters. Every successful call is
billed to a prepaid balance; failed calls are refunded or not charged.

Full reference for machines (load on demand, not up front):

| What | URL |
| --- | --- |
| All docs and every endpoint as one Markdown file | https://twittrapi.com/llms-full.txt |
| OpenAPI 3.1 spec (YAML: `/openapi.yaml`) | https://twittrapi.com/openapi.json |
| Prices, rate limits, payment methods as JSON | https://twittrapi.com/pricing.json |
| Any docs page as Markdown | page URL + `.md`, e.g. https://twittrapi.com/docs/reference/search.md |

The most used endpoints are in [references/endpoints.md](references/endpoints.md).

## 1. Choose how to connect

1. **MCP tools already available** (tool names like `get_user_by_username`, `search_tweets`):
   use them. They handle auth, pagination headers and the simple format. Skip to section 5.
2. **No MCP, but you can run code or curl**: call the REST API (sections 2-5).
3. **The user wants MCP set up**:
   - Hosted, nothing to install: `https://mcp.twittrapi.com/mcp` (Streamable HTTP; OAuth sign-in, or
     `Authorization: Bearer <key>` / `X-API-KEY` header). Claude Code:
     `claude mcp add --transport http twittrapi https://mcp.twittrapi.com/mcp`.
     Setup for Claude.ai, ChatGPT, Cursor and VS Code: https://twittrapi.com/docs/hosted-mcp
   - Local stdio package: `claude mcp add twittrapi --env TWITTRAPI_API_KEY=... -- npx -y twittrapi-mcp`

## 2. Authentication

- Send the key in the `X-API-KEY` header on every request. Read it from the environment variable
  `TWITTRAPI_API_KEY`. Never print it, log it, put it in a URL or commit it.
- No key yet: a person creates an account at https://twittrapi.com/start (small free trial credit
  after email confirmation) and copies the key from the dashboard. You cannot sign up for them.
- RapidAPI keys also work: same paths on `https://twitter-aio.p.rapidapi.com` with headers
  `x-rapidapi-key: <key>` and `x-rapidapi-host: twitter-aio.p.rapidapi.com`.

```bash
curl -s 'https://api.twittrapi.com/user/by/username/XDevelopers?format=simple' \
  -H "X-API-KEY: $TWITTRAPI_API_KEY"
```

`scripts/twittrapi.sh` wraps this: `scripts/twittrapi.sh /search searchItem='from:XDevelopers' category=Latest`.

## 3. Always use the simple format

Add `format=simple` (or header `X-Response-Format: simple`) to every read call. You get flat
camelCase JSON with a fixed schema instead of X's deeply nested GraphQL, about 60 % fewer tokens,
same price:

```json
{ "data": [ ... ], "nextCursor": "..." , "previousCursor": "...", "hasNextPage": true }
```

Single objects come as `{ "data": { ... } }`. Tweets carry `id`, `url`, `text`, `createdAt`,
`author`, `counts` (likes, retweets, replies, quotes, views, bookmarks), `media`, `quoted`,
`retweetOf`, `lang`. Users carry `id`, `username`, `name`, `description`, `counts` (followers,
following, tweets), `verified`, `createdAt`. Use the raw format (omit `format`) only for fields the
simple format leaves out: cards, polls, edit history, community notes.

## 4. Pagination

- List endpoints take `count` (default 20, max about 100; X may return a few more or fewer) and
  `cursor`.
- First page: no `cursor`. Next page: pass `nextCursor` from the previous response as `cursor`.
- Stop when `hasNextPage` is `false`, when `nextCursor` is empty, or when it equals the cursor you
  just sent. Empty pages can happen; they are not errors.
- Decide a page limit before looping. 1,000 followers at ~20 per page is ~50 billed calls.
- Resolve a handle once (`/username/to/id/{username}`) and reuse the numeric ID for timelines;
  user timeline paths also accept `-1` as the ID together with `?username=<handle>`.

## 5. Errors and retries

Act on the status code, not the message text.

| Status | Meaning | Do |
| --- | --- | --- |
| 401, 403 | Key missing, wrong, deactivated or not allowed for this endpoint | Stop, tell the user |
| 402 | Balance used up (not charged) | Stop, ask the user to top up. Never retry. |
| 404 | User/tweet/list does not exist, is private or suspended | Do not retry |
| 422 | Invalid parameter (non-numeric ID, bad handle, bad operator) | Fix the input |
| 400 | Bad request (refunded) | Retry once at most, then check parameters |
| 408, 409, 5xx | Temporary (refunded) | Retry with backoff: 0.5 s, 1 s, 2 s, max ~4 tries |
| 429 | Rate limit of the key (not charged, no Retry-After) | Back off, slow down, lower concurrency |

Refunded responses carry `X-Refunded: true`. Rate limits: trial keys 3 requests/s, paid keys 30/s
by default (higher tiers can be booked).

## 6. Budget

- The balance is prepaid: spending can never exceed what was topped up.
- Every billed response has `X-Remaining-Balance` and `X-Price-Per-Call` headers. Check them and
  stop below the user's threshold.
- `GET https://api.twittrapi.com/balance` returns the balance and price per call; it is free.
- Prices are per 1,000 successful calls: $0.09 (Standard), $0.075 (Volume), $0.065 (Scale). Current
  values: https://twittrapi.com/pricing.json. Estimate calls x price before large jobs and tell the
  user when a job will cost more than a few dollars.

## 7. Rules

- Read-only public data. Account actions under `/client/*` (post, like, follow, DM) act on the
  user's own X account with their session cookie; use them only if the user explicitly set that up.
- Protected accounts and private data are not available. Respect X's rules and
  https://twittrapi.com/aup. TwittrAPI is not affiliated with X Corp.
- Support: support@twittrapi.com. Status: https://twittrapi.com/status

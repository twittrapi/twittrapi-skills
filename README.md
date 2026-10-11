# TwittrAPI agent skills

Agent skills for [TwittrAPI](https://twittrapi.com), the pay-per-call API for public X (Twitter)
data. The `twittrapi` skill teaches Claude Code, Codex, Cursor and other coding agents how to use
the API well: authentication, the most used endpoints, the compact simple response format, cursor
pagination, errors and retries, and keeping spend inside a budget. It links the full machine
docs ([llms-full.txt](https://twittrapi.com/llms-full.txt), [openapi.json](https://twittrapi.com/openapi.json))
instead of copying them, so the agent loads details only when it needs them.

Not affiliated with X Corp.

## Install

With the [skills CLI](https://github.com/vercel-labs/skills) (Claude Code, Codex, Cursor, Gemini CLI and more):

```bash
npx skills add twittrapi/twittrapi-skills
```

Only for one agent, or for all your projects:

```bash
npx skills add twittrapi/twittrapi-skills -a claude-code
npx skills add twittrapi/twittrapi-skills -g
```

As a Claude Code plugin:

```text
/plugin marketplace add twittrapi/twittrapi-skills
/plugin install twittrapi@twittrapi
```

By hand: copy `skills/twittrapi` to `.claude/skills/twittrapi` (project) or
`~/.claude/skills/twittrapi` (all projects).

Then give the agent a key: set `TWITTRAPI_API_KEY` in its environment. Get one at
[twittrapi.com/start](https://twittrapi.com/start).

## What is inside

| Path | Content |
| --- | --- |
| `skills/twittrapi/SKILL.md` | When to use the API, auth, simple format, pagination, errors, budget, rules |
| `skills/twittrapi/references/endpoints.md` | The most used read endpoints with their MCP tool names |
| `skills/twittrapi/scripts/twittrapi.sh` | `curl` wrapper: simple format, URL-encoding, balance headers |

## MCP instead of a skill

If your agent supports MCP, connect the TwittrAPI MCP server as well; the skill then tells the
agent to use its tools.

- Hosted: `https://mcp.twittrapi.com/mcp` (see [docs/hosted-mcp](https://twittrapi.com/docs/hosted-mcp))
- Local: `npx -y twittrapi-mcp` ([twittrapi-mcp](https://github.com/twittrapi/twittrapi-mcp))

## Development

```bash
npm test   # checks frontmatter, links between files and the helper script
```

## License

MIT

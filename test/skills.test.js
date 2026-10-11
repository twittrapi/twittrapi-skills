// Checks every skill the way `npx skills add` and Claude Code read them: frontmatter, name rules,
// links between files, plugin manifests and the helper script's syntax.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const SKILLS = path.join(ROOT, "skills");

function frontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  assert.ok(m, "SKILL.md must start with YAML frontmatter");
  const out = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) out[kv[1]] = kv[2];
  }
  return out;
}

const skillDirs = readdirSync(SKILLS).filter((d) => statSync(path.join(SKILLS, d)).isDirectory());

test("there is at least one skill", () => {
  assert.ok(skillDirs.includes("twittrapi"));
});

for (const dir of skillDirs) {
  const file = path.join(SKILLS, dir, "SKILL.md");
  const text = readFileSync(file, "utf8");

  test(`${dir}: frontmatter name and description`, () => {
    const fm = frontmatter(text);
    assert.equal(fm.name, dir, "name must match the folder");
    assert.match(fm.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(fm.name.length <= 64);
    assert.ok(fm.description && fm.description.length >= 50, "description says what and when");
    assert.ok(fm.description.length <= 1024, "description at most 1024 characters");
    assert.doesNotMatch(fm.description, /[<>]/);
  });

  test(`${dir}: compact body and working relative links`, () => {
    assert.ok(text.split("\n").length < 500, "keep SKILL.md under 500 lines; move details to references/");
    const links = [...readdirSync(path.join(SKILLS, dir), { recursive: true })]
      .filter((f) => f.endsWith(".md"))
      .flatMap((f) => [...readFileSync(path.join(SKILLS, dir, f), "utf8").matchAll(/\]\(([^)#]+)\)/g)].map((m) => [f, m[1]]));
    for (const [from, target] of links) {
      if (/^(https?:|mailto:)/.test(target)) continue;
      const resolved = path.resolve(path.join(SKILLS, dir, path.dirname(from)), target);
      assert.ok(existsSync(resolved), `${from} links to missing ${target}`);
    }
    // Paths mentioned in the text exist too
    for (const m of text.matchAll(/`((?:scripts|references)\/[\w./-]+)`/g)) {
      assert.ok(existsSync(path.join(SKILLS, dir, m[1])), `missing ${m[1]}`);
    }
  });

  test(`${dir}: no secrets`, () => {
    const all = [...readdirSync(path.join(SKILLS, dir), { recursive: true })]
      .map((f) => path.join(SKILLS, dir, f))
      .filter((f) => statSync(f).isFile())
      .map((f) => readFileSync(f, "utf8"))
      .join("\n");
    assert.doesNotMatch(all, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, "looks like an API key");
  });
}

test("helper scripts are executable and valid bash", () => {
  const script = path.join(SKILLS, "twittrapi", "scripts", "twittrapi.sh");
  assert.ok(statSync(script).mode & 0o111, "executable bit");
  execFileSync("bash", ["-n", script]);
  // Usage errors exit 2 without calling the network
  for (const args of [[], ["no-slash"]]) {
    try {
      execFileSync(script, args, { env: { PATH: process.env.PATH, TWITTRAPI_API_KEY: "x" }, stdio: "pipe" });
      assert.fail("should exit non-zero");
    } catch (err) {
      assert.equal(err.status, 2);
    }
  }
  try {
    execFileSync(script, ["/balance"], { env: { PATH: process.env.PATH }, stdio: "pipe" });
    assert.fail("should exit non-zero without a key");
  } catch (err) {
    assert.equal(err.status, 2);
    assert.match(String(err.stderr), /TWITTRAPI_API_KEY/);
  }
});

test("Claude Code plugin and marketplace manifests", () => {
  const plugin = JSON.parse(readFileSync(path.join(ROOT, ".claude-plugin", "plugin.json"), "utf8"));
  const market = JSON.parse(readFileSync(path.join(ROOT, ".claude-plugin", "marketplace.json"), "utf8"));
  assert.equal(plugin.name, "twittrapi");
  assert.equal(market.plugins[0].name, plugin.name);
  assert.equal(market.plugins[0].source, "./");
  assert.ok(existsSync(path.join(ROOT, "skills", "twittrapi", "SKILL.md")), "plugin skills/ directory");
});

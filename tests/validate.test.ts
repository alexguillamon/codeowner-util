import { describe, expect, test } from "bun:test";
import { Volume } from "memfs";
import { generate, own, add, only, team } from "../src/index.js";
import { globToRegExp } from "../src/glob.js";
import type { CodeOwnersConfig, FsLike, Team } from "../src/types.js";

function vol(files: Record<string, string> = { "/repo/a.ts": "" }) {
  return Volume.fromJSON(files) as unknown as FsLike;
}

// ── team handles ───────────────────────────────────────

describe("team() rejects handles that would corrupt the output", () => {
  test("a newline cannot forge extra rules", () => {
    expect(() => team("@org/ok\n* @attacker")).toThrow(/team handle/);
  });

  test("a space cannot split one handle into two owners", () => {
    expect(() => team("@org/ok @attacker")).toThrow(/team handle/);
  });

  test("a carriage return is rejected", () => {
    expect(() => team("@org/ok\r* @attacker")).toThrow(/team handle/);
  });

  test("a hash cannot comment out the rest of the line", () => {
    expect(() => team("@org/ok#")).toThrow(/team handle/);
  });

  test("real handles still work", () => {
    expect(() => team("@octocat")).not.toThrow();
    expect(() => team("@org/team-name")).not.toThrow();
    expect(() => team("@org/team_name.v2")).not.toThrow();
    expect(() => team("user@example.com")).not.toThrow();
  });

  test("a newline in a description cannot escape the comment", () => {
    expect(() => team("@org/ok", "fine\n* @attacker")).toThrow(/description/);
  });

  test("a description may contain spaces and punctuation", () => {
    expect(() => team("@org/x", "Platform & Infra (core)")).not.toThrow();
  });
});

// ── paths and patterns ─────────────────────────────────

describe("own() and rule patterns reject paths that would corrupt the output", () => {
  test("a newline in an own() path is rejected", () => {
    expect(() => own(team("@org/a"), "x\n* @attacker")).toThrow(/own\(\) path/);
  });

  test("a hash in an own() path is rejected", () => {
    expect(() => own(team("@org/a"), "x#y")).toThrow(/own\(\) path/);
  });

  test("normal paths still work", () => {
    const t = team("@org/a");
    expect(() => own(t, "*")).not.toThrow();
    expect(() => own(t, ["apps/web", "libs/search/"])).not.toThrow();
    expect(() => own(t, "apps/web/src/routes/search.ts")).not.toThrow();
  });

  test("a newline in a rule pattern is rejected", () => {
    expect(() =>
      add(team("@org/a"), "**/*.json\n* @attacker"),
    ).toThrow(/rule pattern/);
  });

  test("normal glob patterns still work", () => {
    const t = team("@org/a");
    expect(() => add(t, "**/locales/**/*.json")).not.toThrow();
    expect(() => only(t, "src/**/*.test.ts")).not.toThrow();
    expect(() => only(t, "**/.env*")).not.toThrow();
  });

  test("a newline in an own() description is rejected", () => {
    expect(() => own(team("@org/a"), "x", "bad\n* @attacker")).toThrow(
      /description/,
    );
  });
});

// ── generate() is the backstop ─────────────────────────

describe("generate() validates a hand-built config", () => {
  test("rejects a bad handle that bypassed team()", () => {
    const config: CodeOwnersConfig = {
      own: [{ owners: ["@org/ok\n* @attacker" as Team], paths: ["*"] }],
    };
    expect(() => generate(config, { rootDir: "/repo", fs: vol() })).toThrow(
      /team handle/,
    );
  });

  test("rejects a bad handle in always", () => {
    const config: CodeOwnersConfig = {
      always: ["@bot\n* @attacker" as Team],
      own: [own(team("@org/ok"), "*")],
    };
    expect(() => generate(config, { rootDir: "/repo", fs: vol() })).toThrow(
      /team handle/,
    );
  });

  test("accepts a clean config", () => {
    const config: CodeOwnersConfig = {
      own: [own(team("@org/ok"), "*")],
    };
    expect(() => generate(config, { rootDir: "/repo", fs: vol() })).not.toThrow();
  });
});

// ── glob compiler ──────────────────────────────────────

describe("globToRegExp does not backtrack exponentially", () => {
  test("a run of **/ means the same as a single **/", () => {
    const once = globToRegExp("**/x.json");
    const many = globToRegExp("**/**/**/x.json");
    for (const p of ["x.json", "a/x.json", "a/b/c/x.json", "a/nope.json"]) {
      expect(many.test(p)).toBe(once.test(p));
    }
  });

  test("a pathological pattern still finishes quickly", () => {
    const re = globToRegExp("**/".repeat(12) + "*.json");
    const victim = `${"a/".repeat(40)}nomatch.txt`;
    const started = performance.now();
    re.test(victim);
    // Before collapsing the runs this did not finish at all.
    expect(performance.now() - started).toBeLessThan(500);
  });
});

import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Volume } from "memfs";
import { team, own, match, generate, write } from "../src/index.js";
import type { CodeOwnersConfig, Team } from "../src/index.js";

// ── match() validation ─────────────────────────────────

describe("match() validation", () => {
  test("throws when neither add nor only is provided", () => {
    expect(() => {
      // @ts-expect-error — intentionally passing invalid options
      match("**/*.json", {});
    }).toThrow();
  });
});

// ── generate() output format ────────────────────────────

describe("generate() output format", () => {
  test("no line should have trailing whitespace", () => {
    const config: CodeOwnersConfig = {
      own: [own(team("@org/team-a"), "libs/foo")],
      match: [match("**/secrets", { only: [] })],
    };
    const output = generate(config);
    for (const line of output.split("\n")) {
      if (line.length > 0) {
        expect(line).not.toMatch(/\s$/);
      }
    }
  });

  test("own rule with empty owners and no always produces valid line", () => {
    const noOwners: Team[] = [];
    const config: CodeOwnersConfig = {
      own: [own(noOwners, "libs/unowned")],
    };
    const output = generate(config);
    for (const line of output.split("\n")) {
      if (line.length > 0) {
        expect(line).not.toMatch(/\s$/);
      }
    }
  });
});

// ── barrel exports ──────────────────────────────────────

describe("barrel exports", () => {
  test("all public API functions are importable from index", () => {
    expect(typeof team).toBe("function");
    expect(typeof own).toBe("function");
    expect(typeof match).toBe("function");
    expect(typeof generate).toBe("function");
    expect(typeof write).toBe("function");
  });
});

// ── write() ─────────────────────────────────────────────

const tmpDir = join(import.meta.dir, ".tmp");

describe("write()", () => {
  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const config: CodeOwnersConfig = {
    own: [own(team("@org/platform"), "*")],
  };

  test("writes CODEOWNERS file to the given path", () => {
    const outputPath = join(tmpDir, ".github", "CODEOWNERS");
    const result = write(config, { outputPath });

    expect(result.written).toBe(true);
    expect(result.content).toBe(generate(config));

    const onDisk = readFileSync(outputPath, "utf-8");
    expect(onDisk).toBe(result.content);
  });

  test("creates parent directories if they don't exist", () => {
    const outputPath = join(tmpDir, "deep", "nested", "CODEOWNERS");
    const result = write(config, { outputPath });

    expect(result.written).toBe(true);
    const onDisk = readFileSync(outputPath, "utf-8");
    expect(onDisk).toBe(result.content);
  });

  test("check mode returns upToDate=true when file matches", () => {
    const outputPath = join(tmpDir, "CODEOWNERS");
    // Write first, then check
    write(config, { outputPath });
    const result = write(config, { outputPath, check: true });

    expect(result.written).toBe(false);
    expect(result.upToDate).toBe(true);
  });

  test("check mode returns upToDate=false when file differs", () => {
    const outputPath = join(tmpDir, "CODEOWNERS");
    writeFileSync(outputPath, "stale content");
    const result = write(config, { outputPath, check: true });

    expect(result.written).toBe(false);
    expect(result.upToDate).toBe(false);
  });

  test("check mode returns upToDate=false when file doesn't exist", () => {
    const outputPath = join(tmpDir, "nonexistent", "CODEOWNERS");
    const result = write(config, { outputPath, check: true });

    expect(result.written).toBe(false);
    expect(result.upToDate).toBe(false);
  });

  test("check mode does NOT modify the existing file", () => {
    const outputPath = join(tmpDir, "CODEOWNERS");
    const staleContent = "stale content that should not change";
    writeFileSync(outputPath, staleContent);

    write(config, { outputPath, check: true });

    // File must be untouched
    const afterCheck = readFileSync(outputPath, "utf-8");
    expect(afterCheck).toBe(staleContent);
  });

  test("check mode does NOT create a missing file", () => {
    const outputPath = join(tmpDir, "should-not-exist", "CODEOWNERS");

    write(config, { outputPath, check: true });

    // Parent dir should not have been created
    expect(() => readFileSync(outputPath, "utf-8")).toThrow();
  });

  test("check detects stale file after config change", () => {
    const outputPath = join(tmpDir, "CODEOWNERS");

    // Write with original config
    write(config, { outputPath });
    expect(write(config, { outputPath, check: true }).upToDate).toBe(true);

    // Change the config — different team
    const newConfig: CodeOwnersConfig = {
      own: [own(team("@org/different-team"), "*")],
    };
    const result = write(newConfig, { outputPath, check: true });
    expect(result.upToDate).toBe(false);

    // File still has old content
    const onDisk = readFileSync(outputPath, "utf-8");
    expect(onDisk).toContain("@org/platform");
    expect(onDisk).not.toContain("@org/different-team");
  });

  test("check returns generated content even when stale", () => {
    const outputPath = join(tmpDir, "CODEOWNERS");
    writeFileSync(outputPath, "old");

    const result = write(config, { outputPath, check: true });

    expect(result.upToDate).toBe(false);
    // content should be the freshly generated output, not the stale file
    expect(result.content).toContain("@org/platform");
    expect(result.content).not.toBe("old");
  });
});

// ── CLI ─────────────────────────────────────────────────

describe("CLI", () => {
  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  const configPath = join(
    import.meta.dir,
    "fixtures",
    "basic-single-owner",
    "config.ts",
  );
  const cliPath = join(import.meta.dir, "..", "src", "cli.ts");

  test("--stdout prints generated output to stdout", async () => {
    const proc = Bun.spawn(
      ["bun", "run", cliPath, "--config", configPath, "--stdout"],
      { stdout: "pipe", stderr: "pipe" },
    );
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    expect(stdout).toContain("libs/config @org/platform");
  });

  test("writes CODEOWNERS file with --config and --output", async () => {
    const outputPath = join(tmpDir, "CODEOWNERS");
    const proc = Bun.spawn(
      [
        "bun", "run", cliPath,
        "--config", configPath,
        "--output", outputPath,
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    const content = readFileSync(outputPath, "utf-8");
    expect(content).toContain("libs/config @org/platform");
  });

  test("--check exits 0 when file is up to date", async () => {
    const outputPath = join(tmpDir, "CODEOWNERS");
    // Write first
    await Bun.spawn(
      [
        "bun", "run", cliPath,
        "--config", configPath,
        "--output", outputPath,
      ],
      { stdout: "pipe", stderr: "pipe" },
    ).exited;

    // Check
    const proc = Bun.spawn(
      [
        "bun", "run", cliPath,
        "--config", configPath,
        "--output", outputPath,
        "--check",
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    await proc.exited;
    expect(proc.exitCode).toBe(0);
  });

  test("--check exits 1 when file is stale", async () => {
    const outputPath = join(tmpDir, "CODEOWNERS");
    writeFileSync(outputPath, "stale");

    const proc = Bun.spawn(
      [
        "bun", "run", cliPath,
        "--config", configPath,
        "--output", outputPath,
        "--check",
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    await proc.exited;
    expect(proc.exitCode).toBe(1);
  });

  test("--check exits 1 when file does not exist", async () => {
    const outputPath = join(tmpDir, "missing", "CODEOWNERS");

    const proc = Bun.spawn(
      [
        "bun", "run", cliPath,
        "--config", configPath,
        "--output", outputPath,
        "--check",
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    await proc.exited;
    expect(proc.exitCode).toBe(1);
  });

  test("--check does not modify existing stale file", async () => {
    const outputPath = join(tmpDir, "CODEOWNERS");
    const stale = "this should not change";
    writeFileSync(outputPath, stale);

    const proc = Bun.spawn(
      [
        "bun", "run", cliPath,
        "--config", configPath,
        "--output", outputPath,
        "--check",
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    await proc.exited;
    expect(proc.exitCode).toBe(1);

    // File must be untouched
    const afterCheck = readFileSync(outputPath, "utf-8");
    expect(afterCheck).toBe(stale);
  });

  test("--check prints useful message on stderr when stale", async () => {
    const outputPath = join(tmpDir, "CODEOWNERS");
    writeFileSync(outputPath, "stale");

    const proc = Bun.spawn(
      [
        "bun", "run", cliPath,
        "--config", configPath,
        "--output", outputPath,
        "--check",
      ],
      { stdout: "pipe", stderr: "pipe" },
    );
    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    expect(proc.exitCode).toBe(1);
    expect(stderr).toContain("out of date");
  });

  test("exits 2 when config file does not exist", async () => {
    const proc = Bun.spawn(
      ["bun", "run", cliPath, "--config", "nonexistent.ts", "--stdout"],
      { stdout: "pipe", stderr: "pipe" },
    );
    await proc.exited;
    expect(proc.exitCode).toBe(2);
  });

  test("--help exits 0", async () => {
    const proc = Bun.spawn(
      ["bun", "run", cliPath, "--help"],
      { stdout: "pipe", stderr: "pipe" },
    );
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    expect(stdout).toContain("--config");
    expect(stdout).toContain("--output");
  });
});

// ── filesystem-aware generation (memfs) ─────────────────

function createVolume(files: Record<string, string>) {
  const vol = Volume.fromJSON(files, "/repo");
  return vol;
}

describe("generate() with rootDir (filesystem-aware)", () => {
  const platform = team("@org/platform");
  const teamA = team("@org/team-a");
  const teamB = team("@org/team-b");
  const i18n = team("@org/i18n");
  const bot = team("@ci-bot");

  test("match rules only emit for directories that actually contain matching files", () => {
    // libs/search has locales, libs/config does NOT
    const vol = createVolume({
      "libs/search/src/index.ts": "",
      "libs/search/locales/en-US/common.json": "{}",
      "libs/config/src/index.ts": "",
      // libs/config has no locales/ directory
    });

    const config: CodeOwnersConfig = {
      always: [bot],
      own: [
        own(teamA, "libs/search"),
        own(platform, "libs/config"),
      ],
      match: [match("**/locales/**/*.json", { only: [i18n] })],
    };

    const output = generate(config, { rootDir: "/repo", fs: vol as any });

    // Should emit locale rule for libs/search (locales exist)
    expect(output).toContain("libs/search/locales/**/*.json");
    // Should NOT emit locale rule for libs/config (no locales dir)
    expect(output).not.toContain("libs/config/locales");
  });

  test("match rules discover directories NOT declared in own()", () => {
    // libs/new-thing has locales but is not in any own() rule.
    // The catch-all * covers it, so it should get platform as parent.
    const vol = createVolume({
      "libs/search/locales/en-US/common.json": "{}",
      "libs/new-thing/locales/en-US/common.json": "{}",
    });

    const config: CodeOwnersConfig = {
      always: [bot],
      own: [
        own(platform, "*"),
        own(teamA, "libs/search"),
      ],
      match: [match("**/locales/en-US/**/*.json", { add: [i18n] })],
    };

    const output = generate(config, { rootDir: "/repo", fs: vol as any });

    // libs/search: inherits teamA + adds i18n — different owners than global,
    // so this per-path rule is NOT redundant and must appear
    expect(output).toContain(
      "libs/search/locales/en-US/**/*.json @org/team-a @org/i18n @ci-bot",
    );
    // libs/new-thing: inherits from * (platform) + adds i18n — SAME owners
    // as the global pattern, so it's subsumed and pruned. The global covers it.
    expect(output).toContain(
      "**/locales/en-US/**/*.json @org/platform @org/i18n @ci-bot",
    );
    expect(output).not.toContain("libs/new-thing");
  });

  test("no redundant global + per-path rules when catch-all exists with only", () => {
    const vol = createVolume({
      "libs/search/locales/en-US/common.json": "{}",
      "libs/billing/locales/en-US/common.json": "{}",
    });

    const config: CodeOwnersConfig = {
      own: [
        own(platform, "*"),
        own(teamA, "libs/search"),
        own(teamB, "libs/billing"),
      ],
      match: [match("**/locales/**/*.json", { only: [i18n] })],
    };

    const output = generate(config, { rootDir: "/repo", fs: vol as any });
    const lines = output.split("\n").filter((l) => l.includes("locales"));

    // No nonsensical paths, no double slashes
    for (const line of lines) {
      expect(line).not.toContain("//");
      expect(line).not.toMatch(/\.ts\//);
    }
  });

  test("trailing-slash paths produce clean output with filesystem", () => {
    const vol = createVolume({
      "data/locales/en-US/products.json": "{}",
    });

    const config: CodeOwnersConfig = {
      own: [own(platform, "data/")],
      match: [match("**/locales/**/*.json", { only: [i18n] })],
    };

    const output = generate(config, { rootDir: "/repo", fs: vol as any });

    // No double slashes
    expect(output).not.toContain("//");
    expect(output).toContain("data/locales/**/*.json");
  });

  test("ignores node_modules and dotfile directories", () => {
    const vol = createVolume({
      // Real locale files
      "libs/search/locales/en-US/common.json": "{}",
      // Junk in node_modules and dotfiles
      "node_modules/zod/locales/en-US/messages.json": "{}",
      ".opencode/node_modules/zod/locales/en-US/messages.json": "{}",
      ".cache/locales/en-US/cached.json": "{}",
    });

    const config: CodeOwnersConfig = {
      always: [bot],
      own: [
        own(platform, "*"),
        own(teamA, "libs/search"),
      ],
      match: [match("**/locales/**/*.json", { only: [i18n] })],
    };

    const output = generate(config, { rootDir: "/repo", fs: vol as any });

    // Global pattern from catch-all covers everything;
    // per-path rules with identical owners are pruned as redundant.
    // The key check: no node_modules, dotfiles, or zod in output.
    expect(output).toContain("**/locales/**/*.json @org/i18n @ci-bot");
    expect(output).not.toContain("node_modules");
    expect(output).not.toContain(".opencode");
    expect(output).not.toContain(".cache");
    expect(output).not.toContain("zod");
  });

  test("respects .gitignore patterns for discovery", () => {
    const vol = createVolume({
      ".gitignore": "dist\nbuild\n",
      "libs/search/locales/en-US/common.json": "{}",
      "dist/locales/en-US/built.json": "{}",
      "build/locales/en-US/output.json": "{}",
    });

    const config: CodeOwnersConfig = {
      always: [bot],
      own: [
        own(platform, "*"),
        own(teamA, "libs/search"),
      ],
      match: [match("**/locales/en-US/**/*.json", { add: [i18n] })],
    };

    const output = generate(config, { rootDir: "/repo", fs: vol as any });

    expect(output).toContain("libs/search/locales/en-US/**/*.json");
    expect(output).not.toContain("dist/");
    expect(output).not.toContain("build/");
  });

  test("respects nested .gitignore files in subdirectories", () => {
    const vol = createVolume({
      ".gitignore": "node_modules\n",
      // nested .gitignore ignores build output
      "libs/search/.gitignore": "dist\npublic\n",
      "libs/search/locales/en-US/common.json": "{}",
      // build output that should be ignored
      "libs/search/dist/locales/en-US/built.json": "{}",
      "libs/search/public/locales/en-US/output.json": "{}",
    });

    const config: CodeOwnersConfig = {
      always: [bot],
      own: [
        own(platform, "*"),
        own(teamA, "libs/search"),
      ],
      match: [match("**/locales/en-US/**/*.json", { add: [i18n] })],
    };

    const output = generate(config, { rootDir: "/repo", fs: vol as any });

    // Real locale files should produce a rule
    expect(output).toContain("libs/search/locales/en-US/**/*.json");
    // Build output in gitignored dirs should NOT produce rules
    expect(output).not.toContain("libs/search/dist");
    expect(output).not.toContain("libs/search/public");
  });
});

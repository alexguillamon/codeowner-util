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

    // libs/search: inherits teamA + adds i18n
    expect(output).toContain(
      "libs/search/locales/en-US/**/*.json @org/team-a @org/i18n @ci-bot",
    );
    // libs/new-thing: inherits from * (platform) + adds i18n
    expect(output).toContain(
      "libs/new-thing/locales/en-US/**/*.json @org/platform @org/i18n @ci-bot",
    );
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
});

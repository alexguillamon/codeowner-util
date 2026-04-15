import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

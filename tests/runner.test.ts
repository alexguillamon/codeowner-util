import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Volume } from "memfs";
import { generate } from "../src/generate.js";
import type { CodeOwnersConfig, FsLike, MatchRule } from "../src/types.js";

const fixturesDir = join(import.meta.dir, "fixtures");
const fixtures = readdirSync(fixturesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

/**
 * Build a memfs volume from a config so the filesystem-aware generator
 * finds matching files for every owned directory + match pattern combination.
 */
function buildVolume(config: CodeOwnersConfig): Volume {
  const files: Record<string, string> = {};
  const matchRules: readonly MatchRule[] = config.match ?? [];

  for (const ownRule of config.own) {
    for (const rawPath of ownRule.paths) {
      const p = rawPath.replace(/\/+$/, "");
      if (p === "*") continue;
      if (p.includes("*") || p.includes("?")) continue;

      // If the last segment has an extension, create as a file
      const lastSegment = p.split("/").pop() ?? "";
      if (lastSegment.includes(".")) {
        files[`/repo/${p}`] = "";
        continue;
      }

      // Create as a directory
      files[`/repo/${p}/.gitkeep`] = "";

      // For each match pattern, create a sample file that would match
      for (const rule of matchRules) {
        const sample = sampleFileForPattern(p, rule.pattern);
        if (sample) files[`/repo/${sample}`] = "";
      }
    }
  }

  // Ensure at least the root exists
  if (Object.keys(files).length === 0) {
    files["/repo/.gitkeep"] = "";
  }

  return Volume.fromJSON(files);
}

/**
 * Given a directory and a match pattern, produce a concrete sample file path
 * that would be found when the generator searches for matching directories.
 *
 * Examples:
 *   ("libs/search", "** /locales/** /*.json") → "libs/search/locales/en/sample.json"
 *   ("libs/search", "** /.env*")              → "libs/search/.envrc"
 *   ("libs/search", "src/** /*.test.ts")      → "libs/search/src/sample.test.ts"
 */
function sampleFileForPattern(dir: string, pattern: string): string | null {
  // Strip leading **/ if present (scoping prefix)
  const scoped = pattern.startsWith("**/") ? pattern.slice(3) : pattern;

  // Replace glob segments with concrete sample values
  const concrete = scoped
    .replace(/\*\*\//g, "sample/") // **/ → sample/
    .replace(/\*\.(\w+)/g, "sample.$1") // *.ext → sample.ext
    .replace(/\*(\w+)/g, "sample$1") // *suffix → samplesuffix
    .replace(/\*/g, "sample"); // bare * → sample

  return `${dir}/${concrete}`;
}

describe("codeowners-util", () => {
  for (const fixture of fixtures) {
    test(fixture, async () => {
      const dir = join(fixturesDir, fixture);

      const configModule = await import(join(dir, "config.ts"));
      const config: CodeOwnersConfig = configModule.default;

      const vol = buildVolume(config);
      const expected = readFileSync(join(dir, "CODEOWNERS"), "utf-8");
      const actual = generate(config, {
        rootDir: "/repo",
        fs: vol as unknown as FsLike,
      });

      expect(actual).toBe(expected);
    });
  }
});

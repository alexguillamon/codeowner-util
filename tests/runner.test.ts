import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { generate } from "../src/generate.js";
import { buildVolume } from "./volume.js";
import type { CodeOwnersConfig, FsLike } from "../src/types.js";

const fixturesDir = join(import.meta.dir, "fixtures");
const fixtures = readdirSync(fixturesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

describe("codeowners-util", () => {
  for (const fixture of fixtures) {
    test(fixture, async () => {
      const dir = join(fixturesDir, fixture);

      const configModule = await import(join(dir, "config.ts"));
      const config: CodeOwnersConfig = configModule.default;

      const vol = await buildVolume(dir);
      const expected = readFileSync(join(dir, "CODEOWNERS"), "utf-8");
      const actual = generate(config, {
        rootDir: "/repo",
        fs: vol as unknown as FsLike,
      });

      expect(actual).toBe(expected);
    });
  }
});

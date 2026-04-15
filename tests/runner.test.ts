import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { generate } from "../src/generate.js";

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
      const config = configModule.default;

      const expected = readFileSync(join(dir, "CODEOWNERS"), "utf-8");
      const actual = generate(config);

      expect(actual).toBe(expected);
    });
  }
});

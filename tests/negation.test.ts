import { describe, expect, test } from "bun:test";
import { Volume } from "memfs";
import { add, generate, only, own, team } from "../src/index.js";
import { evaluateRules, resolveOwnersByFile } from "../src/resolve.js";
import type { CodeOwnersConfig, FsLike, ResolvedRule, Team } from "../src/types.js";

const commerceDev = team("@org/commerce-dev");
const airCars = team("@org/air-cars");
const stays = team("@org/stays");
const localization = team("@org/localization");
const security = team("@org/security");

function vol(files: string[]) {
  return Volume.fromJSON(
    Object.fromEntries(files.map((f) => [`/repo/${f}`, ""])),
  ) as unknown as FsLike;
}

function emitted(output: string): ResolvedRule[] {
  return output
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const [path, ...owners] = l.split(/\s+/);
      return { path, owners: owners as Team[] };
    });
}

// ── resolution ─────────────────────────────────────────

describe("a ! pattern excludes files from a rule", () => {
  const files = [
    "libs/air/locales/en-US/air.json",
    "libs/air/locales/fr/air.json",
    "libs/stays/locales/en-US/stays.json",
  ];

  test("only() skips the excluded files", () => {
    const owners = resolveOwnersByFile(
      {
        own: [own(commerceDev, "*"), own(airCars, "libs/air")],
        rules: [
          only(commerceDev, ["**/locales/**/*.json", "!**/locales/en-US/**"]),
        ],
      },
      files,
    );
    expect(owners.get("libs/air/locales/fr/air.json")).toEqual([commerceDev]);
    // excluded, so it keeps the own() declaration
    expect(owners.get("libs/air/locales/en-US/air.json")).toEqual([airCars]);
  });

  test("add() skips the excluded files", () => {
    const owners = resolveOwnersByFile(
      {
        own: [own(commerceDev, "*")],
        rules: [add(security, ["**/locales/**/*.json", "!**/locales/fr/**"])],
      },
      files,
    );
    expect(owners.get("libs/air/locales/en-US/air.json")).toEqual([
      commerceDev,
      security,
    ]);
    expect(owners.get("libs/air/locales/fr/air.json")).toEqual([commerceDev]);
  });
});

// ── the shape that motivated this ──────────────────────

describe("a broad only with a narrow carve-out", () => {
  const files = [
    "libs/air/locales/en-US/air.json",
    "libs/air/locales/fr/air.json",
    "libs/stays/locales/en-US/stays.json",
    "libs/stays/locales/de/stays.json",
  ];

  const config: CodeOwnersConfig = {
    own: [
      own(commerceDev, "*"),
      own(airCars, "libs/air"),
      own(stays, "libs/stays"),
    ],
    rules: [
      only(commerceDev, ["**/locales/**/*.json", "!**/locales/en-US/**"]),
      add(localization, "**/locales/en-US/**/*.json"),
    ],
  };

  test("each product team keeps its own English source strings", () => {
    const rules = emitted(generate(config, { rootDir: "/repo", fs: vol(files) }));
    expect(evaluateRules(rules, "libs/air/locales/en-US/air.json")).toEqual([
      airCars,
      localization,
    ]);
    expect(evaluateRules(rules, "libs/stays/locales/en-US/stays.json")).toEqual([
      stays,
      localization,
    ]);
  });

  test("every other locale still goes to the shared team", () => {
    const rules = emitted(generate(config, { rootDir: "/repo", fs: vol(files) }));
    expect(evaluateRules(rules, "libs/air/locales/fr/air.json")).toEqual([
      commerceDev,
    ]);
    expect(evaluateRules(rules, "libs/stays/locales/de/stays.json")).toEqual([
      commerceDev,
    ]);
  });
});

// ── the excluded files must not leak ───────────────────

describe("an emitted rule never captures an excluded file", () => {
  test("no later rule is needed to protect the carve-out", () => {
    // Nothing follows the only() rule, so its own emitted lines must already
    // leave the excluded files alone.
    const files = [
      "libs/air/locales/fr/air.json",
      "libs/air/locales/en-US/air.json",
    ];
    const config: CodeOwnersConfig = {
      own: [own(commerceDev, "*"), own(airCars, "libs/air")],
      rules: [only(security, ["**/locales/**/*.json", "!**/locales/en-US/**"])],
    };

    const rules = emitted(generate(config, { rootDir: "/repo", fs: vol(files) }));
    expect(evaluateRules(rules, "libs/air/locales/fr/air.json")).toEqual([security]);
    expect(evaluateRules(rules, "libs/air/locales/en-US/air.json")).toEqual([airCars]);
  });
});

// ── validation ─────────────────────────────────────────

describe("rule patterns", () => {
  test("a rule needs at least one pattern that is not an exclusion", () => {
    expect(() => only(security, ["!**/locales/en-US/**"])).toThrow(
      /at least one/i,
    );
  });

  test("an exclusion may sit in any position", () => {
    expect(() =>
      only(security, ["!**/generated/**", "**/*.json"]),
    ).not.toThrow();
  });
});

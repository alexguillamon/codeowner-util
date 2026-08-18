import { describe, expect, test } from "bun:test";
import { Volume } from "memfs";
import { own, team, add, only } from "../src/index.js";
import {
  evaluateRules,
  matchesCodeownersPattern,
  resolveOwnersByFile,
  walkFiles,
} from "../src/resolve.js";
import type { CodeOwnersConfig, FsLike, ResolvedRule, Team } from "../src/types.js";

function vol(files: Record<string, string | null>) {
  return Volume.fromJSON(files, "/repo") as unknown as FsLike;
}

const platform = team("@org/platform");
const air = team("@org/air");
const partner = team("@org/partner");
const i18n = team("@org/i18n");
const bot = team("@ci-bot");
const security = team("@org/security");
const qa = team("@org/qa");

// ── walkFiles ──────────────────────────────────────────

describe("walkFiles()", () => {
  test("returns repo-relative file paths, sorted, excluding directories", () => {
    const fs = vol({
      "/repo/b.ts": "",
      "/repo/a/x.ts": "",
      "/repo/a/nested/y.ts": "",
    });
    expect(walkFiles("/repo", fs)).toEqual([
      "a/nested/y.ts",
      "a/x.ts",
      "b.ts",
    ]);
  });

  test("includes dotfiles — required for patterns like **/.env*", () => {
    const fs = vol({ "/repo/libs/search/.envrc": "", "/repo/libs/search/a.ts": "" });
    expect(walkFiles("/repo", fs)).toContain("libs/search/.envrc");
  });

  test("skips dot directories, node_modules and .git", () => {
    const fs = vol({
      "/repo/src/a.ts": "",
      "/repo/node_modules/pkg/index.js": "",
      "/repo/.git/config": "",
      "/repo/.cache/x.ts": "",
    });
    expect(walkFiles("/repo", fs)).toEqual(["src/a.ts"]);
  });

  test("respects root .gitignore", () => {
    const fs = vol({
      "/repo/.gitignore": "dist\n",
      "/repo/src/a.ts": "",
      "/repo/dist/a.js": "",
    });
    const files = walkFiles("/repo", fs);
    expect(files).toContain("src/a.ts");
    expect(files).not.toContain("dist/a.js");
  });

  test("respects nested .gitignore scoped to its subtree", () => {
    const fs = vol({
      "/repo/libs/a/.gitignore": "build\n",
      "/repo/libs/a/build/out.js": "",
      "/repo/libs/a/src.ts": "",
      "/repo/libs/b/build/out.js": "",
    });
    const files = walkFiles("/repo", fs);
    expect(files).not.toContain("libs/a/build/out.js");
    expect(files).toContain("libs/b/build/out.js");
  });
});

// ── resolveOwnersByFile ────────────────────────────────

describe("resolveOwnersByFile()", () => {
  const files = [
    "config/air-email/_default.json",
    "config/air-email/partner.json",
    "config/other/partner.json",
    "src/index.ts",
  ];

  function resolve(config: CodeOwnersConfig) {
    const map = resolveOwnersByFile(config, files);
    return (f: string) => map.get(f);
  }

  test("seeds owners from the longest matching own() prefix", () => {
    const at = resolve({
      own: [own(platform, "*"), own(air, "config/air-email")],
    });
    expect(at("config/air-email/partner.json")).toEqual([air]);
    expect(at("src/index.ts")).toEqual([platform]);
  });

  test("appends always teams to every file", () => {
    const at = resolve({ always: [bot], own: [own(platform, "*")] });
    expect(at("src/index.ts")).toEqual([platform, bot]);
  });

  test("add layers on top of inherited own() owners", () => {
    const at = resolve({
      own: [own(platform, "*")],
      rules: [add(partner, "**/partner.json")],
    });
    expect(at("config/other/partner.json")).toEqual([platform, partner]);
  });

  test("only replaces inherited owners", () => {
    const at = resolve({
      own: [own(platform, "*")],
      rules: [only(air, "config/air-email/**")],
    });
    expect(at("config/air-email/partner.json")).toEqual([air]);
  });

  test("only replaces owners declared exactly at the matched path", () => {
    // Deliberate semantic change: own() is NOT preserved through only.
    const at = resolve({
      own: [own(platform, "*"), own(air, "config/air-email")],
      rules: [only(partner, "config/air-email/**")],
    });
    expect(at("config/air-email/partner.json")).toEqual([partner]);
  });

  // ── the reported bug ──

  test("mode A: narrow add layers on the owners a prior only established", () => {
    const at = resolve({
      own: [own(platform, "*"), own(platform, "config")],
      rules: [
        only(air, "config/air-email/**"),
        add(partner, "config/air-email/partner.json"),
      ],
    });
    expect(at("config/air-email/partner.json")).toEqual([air, partner]);
    expect(at("config/air-email/_default.json")).toEqual([air]);
  });

  test("mode B: broad add reaches into a narrower only region", () => {
    const at = resolve({
      own: [own(platform, "*"), own(platform, "config")],
      rules: [
        only(air, "config/air-email/**"),
        add(partner, "**/partner.json"),
      ],
    });
    expect(at("config/air-email/partner.json")).toEqual([air, partner]);
    expect(at("config/other/partner.json")).toEqual([platform, partner]);
  });

  test("resolution follows declaration order, not pattern specificity", () => {
    const broadFirst = resolve({
      own: [own(platform, "*")],
      rules: [
        add(partner, "**/partner.json"),
        only(air, "config/air-email/**"),
      ],
    });
    // only comes second, so it clobbers the add
    expect(broadFirst("config/air-email/partner.json")).toEqual([air]);
  });

  test("add after add unions both", () => {
    const at = resolve({
      own: [own(platform, "*")],
      rules: [
        add(air, "config/air-email/**"),
        add(partner, "**/partner.json"),
      ],
    });
    expect(at("config/air-email/partner.json")).toEqual([platform, air, partner]);
  });

  test("always survives an only rule", () => {
    const at = resolve({
      always: [bot],
      own: [own(platform, "*")],
      rules: [only(air, "config/air-email/**")],
    });
    expect(at("config/air-email/partner.json")).toEqual([air, bot]);
  });

  test("does not duplicate an owner already present", () => {
    const at = resolve({
      own: [own(platform, "*")],
      rules: [add(platform, "**/partner.json")],
    });
    expect(at("config/other/partner.json")).toEqual([platform]);
  });
});

// ── root anchoring ─────────────────────────────────────

describe("match patterns are anchored at the repository root", () => {
  test("a **/ prefix matches at any depth, not just under an owned path", () => {
    const files = ["libs/search/.envrc", "libs/search/deep/.envrc"];
    const map = resolveOwnersByFile(
      {
        own: [own(platform, "libs/search")],
        rules: [only(security, "**/.env*")],
      },
      files,
    );
    expect(map.get("libs/search/.envrc")).toEqual([security]);
    expect(map.get("libs/search/deep/.envrc")).toEqual([security]);
  });

  test("a pattern without a **/ prefix matches only at the root", () => {
    const files = ["src/a.test.ts", "libs/search/src/a.test.ts"];
    const map = resolveOwnersByFile(
      {
        own: [own(platform, "*")],
        rules: [add(qa, "src/**/*.test.ts")],
      },
      files,
    );
    expect(map.get("src/a.test.ts")).toEqual([platform, qa]);
    expect(map.get("libs/search/src/a.test.ts")).toEqual([platform]);
  });

  test("a rule applies outside every owned path", () => {
    // No catch-all. Under per-owned-path anchoring this file was never matched.
    const files = ["apps/web/locales/en.json"];
    const map = resolveOwnersByFile(
      {
        own: [own(platform, "libs/search")],
        rules: [add(i18n, "**/locales/**/*.json")],
      },
      files,
    );
    expect(map.get("apps/web/locales/en.json")).toEqual([i18n]);
  });
});

// ── matchesCodeownersPattern ───────────────────────────

describe("matchesCodeownersPattern()", () => {
  const cases: [string, string, boolean][] = [
    ["*", "any/deep/file.ts", true],
    ["apps/web", "apps/web/src/a.ts", true],
    ["apps/web", "apps/website/src/a.ts", false],
    ["apps/web", "apps/web", true],
    ["apps/web/**", "apps/web/src/a.ts", true],
    ["apps/web/**", "apps/other/a.ts", false],
    ["**/locales/**/*.json", "libs/air/locales/en/x.json", true],
    ["**/locales/**/*.json", "libs/air/my-locales/en/x.json", false],
    ["libs/search/.env*", "libs/search/.envrc", true],
    ["libs/search/.env*", "libs/search/src/.envrc", false],
    ["**/partner.json", "config/air/partner.json", true],
  ];

  for (const [pattern, file, want] of cases) {
    test(`${pattern} vs ${file} → ${want}`, () => {
      expect(matchesCodeownersPattern(pattern, file)).toBe(want);
    });
  }
});

// ── evaluateRules ──────────────────────────────────────

describe("evaluateRules()", () => {
  test("last matching rule wins, mirroring GitHub", () => {
    const rules: ResolvedRule[] = [
      { path: "*", owners: [platform] },
      { path: "config/air-email/**", owners: [air] },
    ];
    expect(evaluateRules(rules, "config/air-email/x.json")).toEqual([air]);
    expect(evaluateRules(rules, "src/a.ts")).toEqual([platform]);
  });

  test("earlier rule does not win even if more specific", () => {
    const rules: ResolvedRule[] = [
      { path: "config/air-email/partner.json", owners: [partner] },
      { path: "config/air-email/**", owners: [air] },
    ];
    expect(evaluateRules(rules, "config/air-email/partner.json")).toEqual([air]);
  });

  test("returns empty owners when nothing matches", () => {
    expect(evaluateRules([{ path: "libs/**", owners: [i18n] }], "src/a.ts")).toEqual([]);
  });
});

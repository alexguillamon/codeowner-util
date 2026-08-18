import { describe, expect, test } from "bun:test";
import { Volume } from "memfs";
import { generate, own, team } from "../src/index.js";
import { evaluateRules, resolveOwnersByFile } from "../src/resolve.js";
import type { FsLike, ResolvedRule, Team } from "../src/types.js";

const core = team("@org/core");
const corp = team("@org/corp");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");
const teamC = team("@org/team-c");
const platform = team("@org/platform");

function vol(files: string[]) {
  return Volume.fromJSON(
    Object.fromEntries(files.map((f) => [`/repo/${f}`, ""])),
  ) as unknown as FsLike;
}

/** Parse generated output back into rules, in the order they are written. */
function emittedRules(output: string): ResolvedRule[] {
  return output
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const [path, ...owners] = l.split(/\s+/);
      return { path, owners: owners as Team[] };
    });
}

// ── defect 1: globs in own() paths ─────────────────────

describe("own() paths may contain glob patterns", () => {
  const files = [
    "apps/portal/src/pages/TravelerProfilesPage.test.tsx",
    "apps/portal/src/pages/Other.tsx",
  ];

  test("a glob own() path matches files in the resolver", () => {
    const owners = resolveOwnersByFile(
      {
        own: [
          own(core, "apps/portal"),
          own([corp, core], "apps/portal/src/pages/TravelerProfilesPage*"),
        ],
      },
      files,
    );
    expect(owners.get("apps/portal/src/pages/TravelerProfilesPage.test.tsx")).toEqual([
      corp,
      core,
    ]);
    expect(owners.get("apps/portal/src/pages/Other.tsx")).toEqual([core]);
  });

  test("generate() does not report an internal inconsistency", () => {
    // The resolver used literal prefixes while the emitter wrote the glob
    // verbatim, so the two disagreed and the check threw.
    const config = {
      own: [
        own(core, "apps/portal"),
        own([corp, core], "apps/portal/src/pages/TravelerProfilesPage*"),
      ],
    };
    expect(() =>
      generate(config, { rootDir: "/repo", fs: vol(files) }),
    ).not.toThrow();

    const rules = emittedRules(
      generate(config, { rootDir: "/repo", fs: vol(files) }),
    );
    expect(
      evaluateRules(rules, "apps/portal/src/pages/TravelerProfilesPage.test.tsx"),
    ).toEqual([corp, core]);
    expect(evaluateRules(rules, "apps/portal/src/pages/Other.tsx")).toEqual([core]);
  });
});

// ── defect 2: emitted order of direct rules ────────────

describe("direct rules keep last-match-wins order", () => {
  test("one team owning two paths does not pull the specific rule earlier", () => {
    // Grouping by owner used to place apps/web/src/components (specificity 4)
    // next to libs/auth, which put it before apps/web/src (specificity 3).
    // The less specific rule then won.
    const file = "apps/web/src/components/Button.tsx";
    const config = {
      own: [
        own(teamA, "apps/web/src/components"),
        own(teamB, "libs/billing"),
        own(platform, "*"),
        own(teamC, "apps/web/src"),
        own(teamA, "libs/auth"),
      ],
    };

    const output = generate(config, { rootDir: "/repo", fs: vol([file]) });
    const rules = emittedRules(output);

    expect(evaluateRules(rules, file)).toEqual([teamA]);

    // The specific rule must be written after the broader one.
    const paths = rules.map((r) => r.path);
    expect(paths.indexOf("apps/web/src/components")).toBeGreaterThan(
      paths.indexOf("apps/web/src"),
    );
  });

  test("the catch-all never outranks a named path", () => {
    const file = "apps/foo.ts";
    const config = { own: [own(teamA, "apps"), own(platform, "*")] };
    const rules = emittedRules(
      generate(config, { rootDir: "/repo", fs: vol([file]) }),
    );
    expect(evaluateRules(rules, file)).toEqual([teamA]);
  });
});

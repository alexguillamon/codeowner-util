import { join } from "node:path";
import {
  globToRegExp,
  loadIgnorePatterns,
  loadLocalIgnorePatterns,
  matchesAnyIgnore,
  shouldIgnore,
  type IgnorePattern,
} from "./glob.js";
import type {
  CodeOwnersConfig,
  FsLike,
  OwnershipRule,
  ResolvedRule,
  Team,
} from "./types.js";

/**
 * File-level ownership resolution — the ground truth layer.
 *
 * Rather than reasoning about patterns and comparing them with string
 * heuristics, this module enumerates the real files in the repository and
 * computes the exact owner set for each one. Emitted CODEOWNERS output can
 * then be verified against it.
 */

// ── Ownership model ────────────────────────────────────

export interface FlatEntry {
  path: string;
  owners: Team[];
  /** Descriptions from own() calls that contributed to this entry */
  descriptions: string[];
}

/** Normalize a path: strip trailing slashes */
export function normalizePath(p: string): string {
  if (p === "/" || p === "*") return p;
  return p.replace(/\/+$/, "");
}

/**
 * Flatten ownership rules into one entry per unique path.
 * Normalizes paths and merges co-ownership automatically.
 */
export function flattenOwnership(rules: readonly OwnershipRule[]): FlatEntry[] {
  const byPath = new Map<string, FlatEntry>();
  const order: string[] = [];

  for (const rule of rules) {
    for (const rawPath of rule.paths) {
      const path = normalizePath(rawPath);
      const existing = byPath.get(path);
      if (existing) {
        for (const owner of rule.owners) {
          if (!existing.owners.includes(owner)) {
            existing.owners.push(owner);
          }
        }
        if (rule.description && !existing.descriptions.includes(rule.description)) {
          existing.descriptions.push(rule.description);
        }
      } else {
        const entry: FlatEntry = {
          path,
          owners: [...rule.owners],
          descriptions: rule.description ? [rule.description] : [],
        };
        byPath.set(path, entry);
        order.push(path);
      }
    }
  }

  return order.map((path) => byPath.get(path)!);
}

/**
 * Rank a pattern by how narrow it is. The generator sorts emitted rules by
 * this number, ascending, so a narrower rule is written later and wins under
 * GitHub's last-match-wins evaluation.
 *
 * The resolver ranks `own()` paths with the same function. If the two ever
 * used different rankings they would disagree about who owns a file.
 */
export function specificity(pattern: string): number {
  if (pattern === "*") return 0;
  return pattern.split("/").filter((s) => s !== "**").length;
}

/**
 * Find the owners of a path from the `own()` declarations.
 *
 * This mirrors how the emitted file is read: every declaration that matches
 * is a candidate, the narrowest one wins, and declaration order breaks a tie
 * in favour of the later one. Paths may contain globs, so the check uses the
 * same matcher as the emitted rules.
 */
export function findOwners(path: string, flatEntries: readonly FlatEntry[]): Team[] {
  let bestMatch: FlatEntry | undefined;
  let bestRank = -1;

  for (const entry of flatEntries) {
    if (!matchesCodeownersPattern(entry.path, path)) continue;
    const rank = specificity(entry.path);
    if (rank >= bestRank) {
      bestMatch = entry;
      bestRank = rank;
    }
  }

  return bestMatch ? [...bestMatch.owners] : [];
}

export function unique(arr: readonly Team[]): Team[] {
  return [...new Set(arr)];
}

// ── Phase 1: enumerate ─────────────────────────────────

/**
 * Walk the repository and return every non-ignored file, as repo-relative
 * paths, sorted.
 *
 * Dot-directories, node_modules and .git are skipped, matching the
 * directory-discovery behaviour of the generator. Dot*files* are kept, so
 * patterns like `**\/.env*` can still match them.
 */
export function walkFiles(rootDir: string, fs: FsLike): string[] {
  const files: string[] = [];
  const rootIgnorePatterns = loadIgnorePatterns(rootDir, fs);

  function walk(
    absDir: string,
    relDir: string,
    ignorePatterns: readonly IgnorePattern[],
  ): void {
    let entries: readonly { name: string; isDirectory(): boolean }[];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }

    const localPatterns = loadLocalIgnorePatterns(absDir, relDir, fs);
    const effectiveIgnore =
      localPatterns.length > 0
        ? [...ignorePatterns, ...localPatterns]
        : ignorePatterns;

    for (const entry of entries) {
      const name = entry.name;
      const rel = relDir ? `${relDir}/${name}` : name;

      if (entry.isDirectory()) {
        if (shouldIgnore(name, rel, effectiveIgnore)) continue;
        walk(join(absDir, name), rel, effectiveIgnore);
        continue;
      }

      if (matchesAnyIgnore(rel, effectiveIgnore)) continue;
      files.push(rel);
    }
  }

  walk(rootDir, "", rootIgnorePatterns);
  return files.sort();
}

// ── Pattern matching ───────────────────────────────────

const regexCache = new Map<string, RegExp>();

function cachedRegExp(pattern: string): RegExp {
  let re = regexCache.get(pattern);
  if (!re) {
    re = globToRegExp(pattern);
    regexCache.set(pattern, re);
  }
  return re;
}

/**
 * Does a pattern match a repo-relative file path?
 *
 * One matcher serves both `match()` patterns from the config and emitted
 * CODEOWNERS lines, so resolution and verification cannot drift apart.
 *
 * Patterns are anchored at the repository root:
 * - `*` is the catch-all and matches every file.
 * - `**\/locales\/**\/*.json` matches `locales` at any depth.
 * - `src\/**\/*.test.ts` matches only the root `src` directory. Write
 *   `**\/src\/**\/*.test.ts` to match `src` at any depth.
 * - A pattern with no glob characters acts as a directory prefix. It matches
 *   the path itself and every file below it.
 */
export function matchesCodeownersPattern(pattern: string, file: string): boolean {
  if (pattern === "*") return true;
  if (!/[*?]/.test(pattern)) {
    return file === pattern || file.startsWith(`${pattern}/`);
  }
  return cachedRegExp(pattern).test(file);
}

// ── Phase 2: resolve owners per file ───────────────────

/**
 * Compute the exact owner set for every file.
 *
 * Ownership is seeded from `own()` (longest matching prefix, falling back to
 * the catch-all), then each `match()` rule is applied **in declaration
 * order**: `only` replaces the current owners, `add` unions onto them.
 *
 * Because rules are applied sequentially to a per-file owner set, overlapping
 * rules compose correctly regardless of their relative pattern specificity.
 */
export function resolveOwnersByFile(
  config: CodeOwnersConfig,
  files: readonly string[],
): Map<string, Team[]> {
  const stages = resolveOwnerStages(config, files);
  return stages[stages.length - 1];
}

/**
 * The owner map after each step of resolution.
 *
 * Index 0 holds the owners that `own()` alone gives. Index `k + 1` holds the
 * owners after match rule `k` runs. The generator needs these snapshots to
 * attribute a line to the rule that caused it. Without them, a change made by
 * a late rule looks like it came from the first rule that touched the file.
 */
export function resolveOwnerStages(
  config: CodeOwnersConfig,
  files: readonly string[],
): Map<string, Team[]>[] {
  const always = config.always ?? [];
  const flatEntries = flattenOwnership(config.own);

  // `always` teams go last, so they read as a suffix on every line.
  const withAlways = (source: Map<string, Team[]>): Map<string, Team[]> => {
    const out = new Map<string, Team[]>();
    for (const [file, owners] of source) {
      out.set(file, always.length > 0 ? unique([...owners, ...always]) : owners);
    }
    return out;
  };

  let current = new Map<string, Team[]>();
  for (const file of files) {
    current.set(file, findOwners(file, flatEntries));
  }

  const stages: Map<string, Team[]>[] = [withAlways(current)];

  for (const rule of config.match ?? []) {
    const isOnly = "only" in rule;
    const next = new Map(current);
    for (const file of files) {
      if (!matchesCodeownersPattern(rule.pattern, file)) continue;
      const owners = next.get(file) ?? [];
      next.set(
        file,
        isOnly ? unique([...rule.only]) : unique([...owners, ...rule.add]),
      );
    }
    current = next;
    stages.push(withAlways(current));
  }

  return stages;
}

// ── Phase 4: verify ────────────────────────────────────

/**
 * Evaluate a list of emitted CODEOWNERS rules for a single file using
 * GitHub's semantics: the **last** matching rule wins.
 */
export function evaluateRules(
  rules: readonly ResolvedRule[],
  file: string,
): Team[] {
  let winner: readonly Team[] | undefined;
  for (const rule of rules) {
    if (matchesCodeownersPattern(rule.path, file)) {
      winner = rule.owners;
    }
  }
  return winner ? [...winner] : [];
}

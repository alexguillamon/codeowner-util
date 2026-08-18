import { join } from "node:path";
import type { FsLike } from "./types.js";

/**
 * Convert a glob pattern to a RegExp.
 *
 * `**\/` matches zero or more leading directories, `**` matches across
 * separators, `*` and `?` stay within a single segment.
 */
export function globToRegExp(pattern: string): RegExp {
  let source = "^";

  for (let i = 0; i < pattern.length;) {
    const char = pattern[i];
    const next = pattern[i + 1];
    const afterNext = pattern[i + 2];

    if (char === "*" && next === "*" && afterNext === "/") {
      source += "(?:.*\\/)?";
      i += 3;
      continue;
    }

    if (char === "*" && next === "*") {
      source += ".*";
      i += 2;
      continue;
    }

    if (char === "*") {
      source += "[^/]*";
      i += 1;
      continue;
    }

    if (char === "?") {
      source += "[^/]";
      i += 1;
      continue;
    }

    source += escapeRegExp(char);
    i += 1;
  }

  return new RegExp(`${source}$`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

export interface IgnorePattern {
  baseRelDir: string;
  anchored: boolean;
  hasSlash: boolean;
  regex: RegExp;
}

/**
 * Parse a .gitignore file into patterns scoped to the directory containing it.
 * Negations are skipped because ignored directories are never descended into.
 */
export function parseGitignore(content: string, baseRelDir: string): IgnorePattern[] {
  const patterns: IgnorePattern[] = [];
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) continue;

    const anchored = line.startsWith("/");
    const cleaned = line.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!cleaned) continue;

    patterns.push({
      baseRelDir,
      anchored,
      hasSlash: cleaned.includes("/"),
      regex: globToRegExp(cleaned),
    });
  }
  return patterns;
}

/** Load ignore patterns from .gitignore + built-in defaults. */
export function loadIgnorePatterns(rootDir: string, fs: FsLike): IgnorePattern[] {
  const patterns: IgnorePattern[] = [
    createIgnorePattern("node_modules", ""),
    createIgnorePattern(".git", ""),
  ];

  try {
    const content = fs.readFileSync(join(rootDir, ".gitignore"), "utf-8");
    patterns.push(...parseGitignore(content, ""));
  } catch {
    // No .gitignore or can't read it
  }

  return patterns;
}

export function createIgnorePattern(pattern: string, baseRelDir: string): IgnorePattern {
  return {
    baseRelDir,
    anchored: false,
    hasSlash: pattern.includes("/"),
    regex: globToRegExp(pattern),
  };
}

/**
 * Load additional ignore patterns from a .gitignore file in the given directory.
 * Returns the new patterns (not including inherited ones).
 */
export function loadLocalIgnorePatterns(
  absDir: string,
  relDir: string,
  fs: FsLike,
): IgnorePattern[] {
  try {
    const content = fs.readFileSync(join(absDir, ".gitignore"), "utf-8");
    return parseGitignore(content, relDir);
  } catch {
    return [];
  }
}

/**
 * Directory-oriented ignore check: dot-directories are always skipped,
 * in addition to any .gitignore pattern match.
 */
export function shouldIgnore(
  name: string,
  relPath: string,
  ignorePatterns: readonly IgnorePattern[],
): boolean {
  return name.startsWith(".") || matchesAnyIgnore(relPath, ignorePatterns);
}

/**
 * Pattern-only ignore check, with no dotfile rule. Used for files, which
 * must remain visible so patterns like `**\/.env*` can match them.
 */
export function matchesAnyIgnore(
  relPath: string,
  ignorePatterns: readonly IgnorePattern[],
): boolean {
  return ignorePatterns.some((p) => matchesIgnore(p, relPath));
}

function matchesIgnore(pattern: IgnorePattern, relPath: string): boolean {
  let scopedPath = relPath;

  if (pattern.baseRelDir) {
    if (relPath === pattern.baseRelDir) return false;
    if (!relPath.startsWith(`${pattern.baseRelDir}/`)) return false;
    scopedPath = relPath.slice(pattern.baseRelDir.length + 1);
  }

  if (!scopedPath) return false;

  if (!pattern.hasSlash && !pattern.anchored) {
    const basename = scopedPath.split("/").pop() ?? scopedPath;
    return pattern.regex.test(basename);
  }

  return pattern.regex.test(scopedPath);
}

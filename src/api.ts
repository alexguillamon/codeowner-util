import type { Team, OwnershipRule, AddRule, OnlyRule } from "./types.js";
import { assertPatterns, assertText, assertToken, assertTeams } from "./validate.js";

/**
 * Registry of team descriptions, keyed by team handle.
 * Populated by team() calls, can be spread into config.teams.
 */
export const teamDescriptions = new Map<string, string>();

/** Create a team reference, with an optional description for documentation */
export function team(name: string, description?: string): Team {
  assertToken("team handle", name);
  assertText("team description", description);
  if (description) {
    teamDescriptions.set(name, description);
  }
  return name as Team;
}

/** Declare ownership: team(s) own path(s), with an optional description */
export function own(
  owners: Team | readonly Team[],
  paths: string | readonly string[],
  description?: string,
): OwnershipRule {
  const ownerList = Array.isArray(owners) ? owners : [owners];
  const pathList = Array.isArray(paths) ? paths : [paths];
  assertTeams(ownerList);
  for (const path of pathList) assertToken("own() path", path);
  assertText("own() description", description);
  return {
    owners: ownerList,
    paths: pathList,
    ...(description ? { description } : {}),
  };
}

/**
 * Replace the owners of every file these patterns match.
 *
 * `only` discards whatever owners a file had, including a direct `own()`
 * declaration. Use `add` when you want to keep them.
 */
export function only(
  owners: Team | readonly Team[],
  patterns: string | readonly string[],
  description?: string,
): OnlyRule {
  return { kind: "only", ...ruleParts(owners, patterns, description) };
}

/**
 * Add owners on top of the owners a file already has.
 *
 * The owners a file already has come from `own()` and from any earlier rule,
 * so `add` composes with the rules declared before it.
 */
export function add(
  owners: Team | readonly Team[],
  patterns: string | readonly string[],
  description?: string,
): AddRule {
  return { kind: "add", ...ruleParts(owners, patterns, description) };
}

function ruleParts(
  owners: Team | readonly Team[],
  patterns: string | readonly string[],
  description?: string,
) {
  const ownerList = Array.isArray(owners) ? owners : [owners as Team];
  const patternList = Array.isArray(patterns) ? patterns : [patterns as string];
  assertTeams(ownerList);
  assertPatterns(patternList);
  assertText("rule description", description);
  return {
    owners: ownerList,
    patterns: patternList,
    ...(description ? { description } : {}),
  };
}

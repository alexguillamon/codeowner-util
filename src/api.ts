import type { Team, OwnershipRule, MatchAdd, MatchOnly } from "./types.js";
import { assertText, assertToken, assertTeams } from "./validate.js";

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

/** Create an `add` match rule — adds owners on top of inherited ownership */
export function match(
  pattern: string,
  opts: { add: readonly Team[]; description?: string },
): MatchAdd;

/** Create an `only` match rule — replaces inherited ownership entirely */
export function match(
  pattern: string,
  opts: { only: readonly Team[]; description?: string },
): MatchOnly;

export function match(
  pattern: string,
  opts: {
    add?: readonly Team[];
    only?: readonly Team[];
    description?: string;
  },
): MatchAdd | MatchOnly {
  assertToken("match() pattern", pattern);
  assertText("match() description", opts.description);
  if ("only" in opts && opts.only) {
    assertTeams(opts.only);
    return {
      pattern,
      only: opts.only,
      ...(opts.description ? { description: opts.description } : {}),
    };
  }
  if ("add" in opts && opts.add) {
    assertTeams(opts.add);
    return {
      pattern,
      add: opts.add,
      ...(opts.description ? { description: opts.description } : {}),
    };
  }
  throw new Error(
    `match("${pattern}"): must specify either { add: [...] } or { only: [...] }`,
  );
}

import type { Team, OwnershipRule, MatchAdd, MatchOnly } from "./types.js";

/** Create a team reference */
export function team(name: string): Team {
  return name as Team;
}

/** Declare ownership: team(s) own path(s) */
export function own(
  owners: Team | readonly Team[],
  paths: string | readonly string[],
): OwnershipRule {
  return {
    owners: Array.isArray(owners) ? owners : [owners],
    paths: Array.isArray(paths) ? paths : [paths],
  };
}

/** Create an `add` match rule — adds owners on top of inherited ownership */
export function match(
  pattern: string,
  opts: { add: readonly Team[] },
): MatchAdd;

/** Create an `only` match rule — replaces inherited ownership entirely */
export function match(
  pattern: string,
  opts: { only: readonly Team[] },
): MatchOnly;

export function match(
  pattern: string,
  opts: { add?: readonly Team[]; only?: readonly Team[] },
): MatchAdd | MatchOnly {
  if ("only" in opts && opts.only) {
    return { pattern, only: opts.only };
  }
  if ("add" in opts && opts.add) {
    return { pattern, add: opts.add };
  }
  throw new Error(
    `match("${pattern}"): must specify either { add: [...] } or { only: [...] }`,
  );
}

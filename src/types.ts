/** A GitHub team or user handle (e.g. "@org/my-team") */
export type Team = string & { readonly __brand: unique symbol };

/** A direct ownership declaration: these teams own these paths */
export interface OwnershipRule {
  readonly owners: readonly Team[];
  readonly paths: readonly string[];
}

/** A match rule using `add` — adds owners on top of inherited ownership */
export interface MatchAdd {
  readonly pattern: string;
  readonly add: readonly Team[];
}

/** A match rule using `only` — replaces inherited ownership entirely */
export interface MatchOnly {
  readonly pattern: string;
  readonly only: readonly Team[];
}

export type MatchRule = MatchAdd | MatchOnly;

export interface CodeOwnersConfig {
  /** Teams appended to every generated rule (e.g. a bot account) */
  readonly always?: readonly Team[];

  /** Ownership declarations */
  readonly own: readonly OwnershipRule[];

  /** Pattern-based rules applied across all owned paths */
  readonly match?: readonly MatchRule[];
}

/** A single resolved line in the generated CODEOWNERS file */
export interface ResolvedRule {
  readonly path: string;
  readonly owners: readonly Team[];
}

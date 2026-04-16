/** A GitHub team or user handle (e.g. "@org/my-team") */
export type Team = string & { readonly __brand: unique symbol };

/** A direct ownership declaration: these teams own these paths */
export interface OwnershipRule {
  readonly owners: readonly Team[];
  readonly paths: readonly string[];
  /** Optional description — rendered as a comment above this ownership block */
  readonly description?: string;
}

/** A match rule using `add` — adds owners on top of inherited ownership */
export interface MatchAdd {
  readonly pattern: string;
  readonly add: readonly Team[];
  /** Optional description — rendered as a comment above this match section */
  readonly description?: string;
}

/** A match rule using `only` — replaces inherited ownership entirely */
export interface MatchOnly {
  readonly pattern: string;
  readonly only: readonly Team[];
  /** Optional description — rendered as a comment above this match section */
  readonly description?: string;
}

export type MatchRule = MatchAdd | MatchOnly;

export interface CodeOwnersConfig {
  /** Teams appended to every generated rule (e.g. a bot account) */
  readonly always?: readonly Team[];

  /** Ownership declarations */
  readonly own: readonly OwnershipRule[];

  /** Pattern-based rules applied across all owned paths */
  readonly match?: readonly MatchRule[];

  /** Team descriptions for documentation — keyed by team handle */
  readonly teams?: Readonly<Record<string, string>>;
}

/** A single resolved line in the generated CODEOWNERS file */
export interface ResolvedRule {
  readonly path: string;
  readonly owners: readonly Team[];
}

/** Minimal filesystem interface for filesystem-aware generation */
export interface FsLike {
  statSync(path: string): { isDirectory(): boolean };
  readFileSync(path: string, encoding: "utf-8"): string;
  readdirSync(
    path: string,
    options: { withFileTypes: true },
  ): readonly { name: string; isDirectory(): boolean }[];
}

export interface GenerateOptions {
  /** Root directory for filesystem-aware match resolution */
  rootDir?: string;
  /** Custom fs implementation (defaults to node:fs). Pass memfs for testing. */
  fs?: FsLike;
}

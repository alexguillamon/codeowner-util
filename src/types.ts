/** A GitHub team or user handle (e.g. "@org/my-team") */
export type Team = string & { readonly __brand: unique symbol };

/** A direct ownership declaration: these teams own these paths */
export interface OwnershipRule {
  readonly owners: readonly Team[];
  readonly paths: readonly string[];
  /** Optional description — rendered as a comment above this ownership block */
  readonly description?: string;
}

/** Replaces the owners of every file the patterns match */
export interface OnlyRule {
  readonly kind: "only";
  readonly owners: readonly Team[];
  readonly patterns: readonly string[];
  /** Optional description — rendered as a comment above this section */
  readonly description?: string;
}

/** Adds owners on top of the owners a file already has */
export interface AddRule {
  readonly kind: "add";
  readonly owners: readonly Team[];
  readonly patterns: readonly string[];
  /** Optional description — rendered as a comment above this section */
  readonly description?: string;
}

/** A rule applied on top of `own()`, in declaration order */
export type PolicyRule = OnlyRule | AddRule;

export interface CodeOwnersConfig {
  /** Teams appended to every generated rule (e.g. a bot account) */
  readonly always?: readonly Team[];

  /**
   * Ownership declarations. These form the base layer. The narrowest
   * declaration that matches a file wins, so their order does not matter.
   */
  readonly own: readonly OwnershipRule[];

  /**
   * Rules applied on top of `own()`, in declaration order. Each rule builds
   * on the result of the rule before it.
   */
  readonly rules?: readonly PolicyRule[];

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

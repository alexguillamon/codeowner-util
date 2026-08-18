import type { CodeOwnersConfig, Team } from "./types.js";

/**
 * Input validation for everything that reaches the generated file.
 *
 * A CODEOWNERS line is whitespace separated, and `#` starts a comment. A
 * string that carries whitespace, a `#`, or a line break can therefore add or
 * truncate rules in the output. That turns a config value into forged
 * ownership, which matters when team names or paths come from data rather
 * than from literals in the config file.
 */

const CONTROL = /[\u0000-\u001F\u007F]/;
const WHITESPACE = /\s/;

/**
 * Check a value that must appear as a single field on a CODEOWNERS line:
 * a team handle, an `own()` path, or a rule pattern.
 */
export function assertToken(kind: string, value: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `codeowners-util: ${kind} must be a non-empty string. Got ${JSON.stringify(value)}.`,
    );
  }
  if (WHITESPACE.test(value) || CONTROL.test(value) || value.includes("#")) {
    throw new Error(
      `codeowners-util: ${kind} contains a character that would corrupt the ` +
        `generated file: ${JSON.stringify(value)}\n` +
        `Remove any whitespace, "#", or control character. A CODEOWNERS line ` +
        `separates fields by spaces, and "#" starts a comment.`,
    );
  }
}

/**
 * Check free text that becomes a comment line. Spaces are fine here. Only a
 * line break or control character can escape the comment.
 */
export function assertText(kind: string, value: string | undefined): void {
  if (value === undefined) return;
  if (typeof value !== "string") {
    throw new Error(
      `codeowners-util: ${kind} must be a string. Got ${JSON.stringify(value)}.`,
    );
  }
  if (CONTROL.test(value)) {
    throw new Error(
      `codeowners-util: ${kind} contains a line break or control character: ` +
        `${JSON.stringify(value)}\nDescriptions are written as one comment line.`,
    );
  }
}

/**
 * Check the patterns of a rule. A pattern starting with `!` excludes files,
 * so a rule made only of exclusions would select nothing.
 */
export function assertPatterns(patterns: readonly string[]): void {
  for (const pattern of patterns) assertToken("rule pattern", pattern);
  if (!patterns.some((p) => !p.startsWith("!"))) {
    throw new Error(
      "codeowners-util: a rule needs at least one pattern that is not an " +
        `exclusion. Got ${JSON.stringify(patterns)}.`,
    );
  }
}

export function assertTeams(owners: readonly Team[]): void {
  for (const owner of owners) assertToken("team handle", owner);
}

/**
 * Check a whole config. `generate()` calls this, so a config built by hand,
 * or loaded from data, is checked even when it skips `team()` and `own()`.
 */
export function assertConfig(config: CodeOwnersConfig): void {
  assertTeams(config.always ?? []);

  for (const rule of config.own) {
    assertTeams(rule.owners);
    for (const path of rule.paths) assertToken("own() path", path);
    assertText("own() description", rule.description);
  }

  for (const rule of config.rules ?? []) {
    assertPatterns(rule.patterns);
    assertTeams(rule.owners);
    assertText("rule description", rule.description);
  }

  for (const [handle, description] of Object.entries(config.teams ?? {})) {
    assertToken("team handle", handle);
    assertText("team description", description);
  }
}

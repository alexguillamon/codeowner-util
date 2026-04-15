# codeowners-util

Generate GitHub CODEOWNERS files from a typed TypeScript config.

Instead of hand-editing a flat CODEOWNERS file, define ownership rules in TypeScript with full type safety, then generate the file.

## Install

```sh
npm install codeowners-util
```

## Quick Start

Create a `codeowners.config.ts` at your repo root:

```typescript
import { team, own, match } from "codeowners-util";
import type { CodeOwnersConfig } from "codeowners-util";

const bot = team("@ci-bot");
const platform = team("@org/platform");
const teamA = team("@org/team-a");
const i18n = team("@org/i18n");

const config: CodeOwnersConfig = {
  always: [bot],
  own: [
    own(platform, ["*", "apps/web", "libs/config"]),
    own(teamA, ["libs/auth", "libs/search"]),
  ],
  match: [
    match("**/locales/**/*.json", { only: [i18n] }),
    match("**/locales/en-US/**/*.json", { add: [i18n] }),
  ],
};

export default config;
```

Generate the file:

```sh
npx codeowners-util
```

This writes `.github/CODEOWNERS` with rules sorted by specificity so GitHub's "last matching rule wins" semantics work correctly.

## CLI

```
codeowners-util [options]

  -c, --config <path>   Config file (default: codeowners.config.ts)
  -o, --output <path>   Output file (default: .github/CODEOWNERS)
      --check           Check if output is up to date (exit 1 if stale)
      --stdout          Print generated output to stdout
  -h, --help            Show help
```

The `--check` flag is useful in CI to ensure the CODEOWNERS file stays in sync:

```sh
npx codeowners-util --check
```

## Programmatic API

```typescript
import { team, own, match, generate, write } from "codeowners-util";
```

### `team(name)`

Creates a typed team handle.

```typescript
const platform = team("@org/platform");
```

### `own(owners, paths)`

Declares ownership. Accepts a single team or array of teams, and a single path or array of paths.

```typescript
own(platform, "libs/config");
own([teamA, teamB], ["libs/shared", "libs/utils"]);
```

When multiple `own()` calls declare the same path, their owners are merged (implicit co-ownership).

### `match(pattern, opts)`

Creates pattern-based rules that apply across all owned paths.

**`add`** — adds owners on top of inherited ownership:

```typescript
match("**/locales/en-US/**/*.json", { add: [i18n] });
// libs/auth/locales/en-US/**/*.json → @org/team-a @org/i18n
```

**`only`** — replaces inherited ownership entirely:

```typescript
match("**/locales/**/*.json", { only: [i18n] });
// libs/auth/locales/**/*.json → @org/i18n (team-a is NOT inherited)
```

Patterns starting with `**/` are scoped under each owned path. The `**/` prefix is stripped and the rest is appended to the owned path. Patterns without `**/` are appended directly.

### `generate(config)`

Returns the generated CODEOWNERS file content as a string.

```typescript
const content = generate(config);
```

### `write(config, options)`

Generates and writes the CODEOWNERS file to disk.

```typescript
import { write } from "codeowners-util";

// Write to file
write(config, { outputPath: ".github/CODEOWNERS" });

// Check mode — compare without writing
const result = write(config, {
  outputPath: ".github/CODEOWNERS",
  check: true,
});
console.log(result.upToDate); // true or false
```

## Config Reference

```typescript
interface CodeOwnersConfig {
  /** Teams appended to every generated rule (e.g. a bot account) */
  always?: Team[];

  /** Ownership declarations */
  own: OwnershipRule[];

  /** Pattern-based rules applied across all owned paths */
  match?: MatchRule[];
}
```

### How rules are resolved

1. Direct ownership rules are sorted by specificity (ascending)
2. Match rules are expanded against every owned path
3. When multiple match rules resolve to the same path, the more specific pattern wins; equal specificity uses last-declared
4. Match rules are sorted by specificity and placed after direct rules
5. `always` teams are appended to every rule

This ordering ensures GitHub's "last matching rule wins" semantics produce the correct result.

## License

MIT

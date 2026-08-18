# codeowners-util

GitHub's CODEOWNERS leaves a lot to desire and lacks a lot of features one would want to create fine grained rules about who owns what in a monorepo.

This library lets you define ownership in TypeScript. You describe who owns what and why. The library generates a correct CODEOWNERS file with rules sorted so GitHub's last-match-wins semantics produce the right result.

## The mental model

There are two layers to ownership:

`own()` is the source of truth. It's a direct declaration: these teams own these paths. If two teams both call `own()` on the same path, they share it. Nothing else in the system can remove an `own()` declaration.

`only()` and `add()` are for cross-cutting patterns. Things like "all locale files should be reviewed by the i18n team." They apply to file patterns anchored at the repository root. `only()` replaces the owners outright. `add()` puts reviewers on top of the owners a file already has.

### The rules

1. `own()` declarations merge. Two `own()` calls on the same path? Both teams are co-owners.

2. `add()` stacks. It puts teams on top of the current owners.

3. `only()` replaces. It sets the owners outright and discards whatever came before, including a direct `own()` declaration. Use `add()` when you want to keep the existing owners.

4. `always` is unconditional. Teams listed here are appended to every rule. Useful for bot accounts.

5. Declaration order decides. Entries in `rules` run in the order you write them, and each one builds on the result of the last. Pattern specificity does not reorder them. `own()` is the base layer, so its order does not matter — the narrowest declaration wins.

## Install

```sh
npm install codeowners-util
```

## Quick start

Create a `codeowners.config.ts` at your repo root:

```typescript
import { team, own, only, add } from "codeowners-util";
import type { CodeOwnersConfig } from "codeowners-util";

const bot = team("@ci-bot");
const platform = team("@org/platform");
const search = team("@org/search");
const i18n = team("@org/i18n");

const config: CodeOwnersConfig = {
  always: [bot],
  teams: {
    "@org/platform": "Platform & Infrastructure",
    "@org/search": "Search Experience",
    "@org/i18n": "Internationalization",
  },
  own: [
    own(
      platform,
      ["*", "apps/web", "libs/config"],
      "Platform owns the foundation",
    ),
    own(
      search,
      ["libs/search", "libs/search-api"],
      "Search team owns search libs",
    ),
    own([search, platform], "apps/web/src/routes/search.ts"),
  ],
  rules: [
    only(i18n, "**/locales/**/*.json", "All locale files are reviewed by i18n"),
    add(
      i18n,
      "**/locales/en-US/**/*.json",
      "English source strings need both product team and i18n",
    ),
  ],
};

export default config;
```

Generate the file:

```sh
npx codeowners-util
```

This writes `.github/CODEOWNERS` with rules sorted by specificity so GitHub's last-match-wins semantics produce the right result.

## How ownership works

### Direct ownership with `own()`

```typescript
own(platform, "libs/config");
own(search, ["libs/search", "libs/search-api"]);
own([search, platform], "apps/web/src/routes/search.ts");
```

When multiple `own()` calls declare the same path, their owners merge:

```typescript
own(teamA, "libs/core");
own(teamB, "libs/core");
// libs/core is co-owned by both
```

### Cross-cutting rules with `only()` and `add()`

Rules apply file patterns across the repository, in declaration order.

`add` adds teams on top of the current owners:

```typescript
add(i18n, "**/locales/en-US/**/*.json");
// If search owns libs/search:
// libs/search/locales/en-US/**/*.json → @org/search @org/i18n
```

`only` replaces the current owners:

```typescript
only(i18n, "**/locales/**/*.json");
// Every locale file → @org/i18n, whoever owned it before
```

`only` discards a direct `own()` declaration too:

```typescript
own([checkout, platform], "apps/web/config/features/checkout");
only(checkout, "**/features/checkout/**");

// Files inside apps/web/config/features/checkout/ → @org/checkout
// @org/platform is gone, because `only` replaces.
// Use add(checkout, ...) to keep @org/platform.
```

Rules run in the order you declare them, and each rule builds on the one before it:

```typescript
only(i18n, "**/locales/**/*.json");      // 1. locales → i18n
add(qa, "**/locales/en-US/**/*.json");   // 2. en-US → i18n + qa
```

Reversing those two lines gives a different result, because `only()` would then discard `@org/qa`.

### How match patterns work

Patterns are anchored at the repository root.

```
**/locales/**/*.json    matches locales at any depth
src/**/*.test.ts        matches the root src directory only
**/src/**/*.test.ts     matches src at any depth
```

A pattern with no glob characters acts as a directory prefix. `apps/web` matches `apps/web` and everything below it.

The generator reads the real files in your repository, works out the exact owner set for every file, then writes the smallest set of rules that reproduces those owners. It checks the result before writing. If a directory holds no matching file, no rule is emitted for it.

### Ordering

The generated file is sorted so that more specific rules appear later and win under GitHub's last-match-wins evaluation:

```
* @org/platform                              # catches everything
libs/search @org/search                      # more specific, wins for libs/search
libs/search/locales/**/*.json @org/i18n      # even more specific, wins for locale files
```

You do not need to reason about this ordering. The generator verifies the emitted file against the owners it resolved, and fails rather than write a file that disagrees.

## Descriptions

Every part of the config supports optional descriptions. They're rendered as comments in the generated file.

### Team descriptions

```typescript
// In the config
const config: CodeOwnersConfig = {
  teams: {
    "@org/platform": "Platform & Infrastructure",
    "@org/search": "Search Experience",
  },
  // ...
};

// Or inline with team()
const platform = team("@org/platform", "Platform & Infrastructure");
```

Shows up in section headers:

```
# @org/platform (Platform & Infrastructure), @ci-bot
```

### Ownership descriptions

```typescript
own(
  platform,
  ["*", "libs/config"],
  "Platform owns the foundation and shared config",
);
```

Rendered above the group:

```
# Platform owns the foundation and shared config
# @org/platform (Platform & Infrastructure), @ci-bot
* @org/platform @ci-bot
libs/config @org/platform @ci-bot
```

### Rule descriptions

```typescript
only(
  i18n,
  "**/locales/**/*.json",
  "All locale files are reviewed by i18n, product teams opt in via en-US",
);
```

Rendered below the rule header:

```
# ── only: **/locales/**/*.json ──
# All locale files are reviewed by i18n, product teams opt in via en-US
```

## CLI

```
codeowners-util [options]

  -c, --config <path>   Config file (default: codeowners.config.ts)
  -o, --output <path>   Output file (default: .github/CODEOWNERS)
      --check           Check if output is up to date (exit 1 if stale)
      --stdout          Print generated output to stdout
  -h, --help            Show help
```

Use `--check` in CI to keep the CODEOWNERS file in sync:

```sh
npx codeowners-util --check
```

## Input validation

A CODEOWNERS line separates fields by spaces, and `#` starts a comment. A team handle or path that carries whitespace, a `#`, or a line break can therefore add or truncate rules in the generated file.

`team()`, `own()`, `only()` and `add()` reject those values, and `generate()` checks the whole config again. That second check matters when you build a config from data instead of literals:

```typescript
// Throws, rather than writing "* @attacker" as an extra rule
team("@org/platform\n* @attacker");
own(platform, "apps/web\n* @attacker");

// Also throws, even though it never calls team()
generate({ own: [{ owners: ["@org/ok\n* @attacker"], paths: ["*"] }] });
```

Descriptions become comment lines, so they may contain spaces but not line breaks.

## Programmatic API

```typescript
import { team, own, match, generate, write } from "codeowners-util";
```

### `team(name, description?)`

Creates a typed team handle. The optional description is used in generated comments.

### `own(owners, paths, description?)`

Declares ownership. Accepts a single team or array, and a single path or array.

### `only(owners, patterns, description?)`

Replaces the owners of every file the patterns match. Accepts a single team or an array, and a single pattern or an array.

### `add(owners, patterns, description?)`

Adds owners on top of the owners a file already has. Same argument shape as `only()`.

### `generate(config, options?)`

Returns the generated CODEOWNERS content as a string.

- `rootDir` - root directory for filesystem-aware resolution (default: `process.cwd()`)
- `fs` - custom filesystem implementation for testing (default: `node:fs`)

### `write(config, options)`

Writes the CODEOWNERS file to disk.

```typescript
write(config, { outputPath: ".github/CODEOWNERS" });

// Check mode, compare without writing
const result = write(config, {
  outputPath: ".github/CODEOWNERS",
  check: true,
});
console.log(result.upToDate);
```

## Config reference

```typescript
interface CodeOwnersConfig {
  always?: Team[];
  teams?: Record<string, string>;
  /** Base layer. The narrowest declaration wins, so order does not matter. */
  own: OwnershipRule[];
  /** Applied on top of own(), in declaration order. */
  rules?: PolicyRule[];
}
```

## Upgrading from 0.1.x

`match()` is gone. It was two operations sharing one function, so it is now two functions, and both take the same arguments as `own()`:

```typescript
// before
match: [
  match("**/locales/**/*.json", { only: [i18n] }),
  match("**/*.test.ts", { add: [qa], description: "QA reviews tests" }),
];

// after
rules: [
  only(i18n, "**/locales/**/*.json"),
  add(qa, "**/*.test.ts", "QA reviews tests"),
];
```

The `match` config key is now `rules`. Owners come first, patterns second, and both accept a single value or an array. Resolution semantics are unchanged.

## License

MIT

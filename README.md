# codeowners-util

GitHub's CODEOWNERS format is a flat file where rule ordering determines who actually owns what. The last matching rule wins. This makes it hard to reason about ownership in a monorepo — you can't tell at a glance who owns what, and changing one line can silently break ownership for something completely unrelated.

This library lets you define ownership in TypeScript. You describe who owns what and why. The library generates a correct CODEOWNERS file with rules sorted so GitHub's last-match-wins semantics produce the right result.

## The mental model

There are two layers to ownership:

**`own()` is the source of truth.** It's a direct declaration: these teams own these paths. If two teams both call `own()` on the same path, they share it. Nothing else in the system can remove an `own()` declaration.

**`match()` is for cross-cutting patterns.** Things like "all locale files should be reviewed by the i18n team." Match rules operate on file patterns within owned directories. They can add reviewers on top of existing ownership, or replace inherited ownership — but they can't strip teams that were explicitly declared with `own()`.

### The rules

1. **`own()` declarations merge.** Two `own()` calls on the same path? Both teams are co-owners.

2. **`match(add)` stacks.** Adds teams on top of whoever owns the directory.

3. **`match(only)` replaces inherited owners** — but not direct ones. If a directory's ownership comes from a parent (inherited), `only` replaces it. If the path has its own `own()` declaration, those owners stay.

4. **`always` is unconditional.** Teams listed here are appended to every rule. Useful for bot accounts.

5. **Specificity resolves conflicts.** When two match rules hit the same path, the more specific pattern wins. Same specificity? Last declared wins.

## Install

```sh
npm install codeowners-util
```

## Quick start

Create a `codeowners.config.ts` at your repo root:

```typescript
import { team, own, match } from "codeowners-util";
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
    own(platform, ["*", "apps/web", "libs/config"], "Platform owns the foundation"),
    own(search, ["libs/search", "libs/search-api"], "Search team owns search libs"),
    own([search, platform], "apps/web/src/routes/search.ts"),
  ],
  match: [
    match("**/locales/**/*.json", {
      only: [i18n],
      description: "All locale files are reviewed by i18n",
    }),
    match("**/locales/en-US/**/*.json", {
      add: [i18n],
      description: "English source strings need both product team and i18n",
    }),
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

### Pattern matching with `match()`

Match rules apply file-level patterns across owned directories.

**`add`** adds teams on top of whoever owns the directory:

```typescript
match("**/locales/en-US/**/*.json", { add: [i18n] });
// If search owns libs/search:
// libs/search/locales/en-US/**/*.json → @org/search @org/i18n
```

**`only`** replaces inherited ownership for matching files:

```typescript
match("**/locales/**/*.json", { only: [i18n] });
// libs/search/locales/**/*.json → @org/i18n (search is not included)
```

But `only` cannot override direct `own()` declarations:

```typescript
own([checkout, platform], "apps/web/config/features/checkout");
match("**/features/checkout/**", { only: [checkout] });

// Files inside apps/web/config/features/checkout/:
//   → @org/checkout @org/platform
//   platform was directly declared with own() — it stays
//
// Files inside any OTHER features/checkout/ directory:
//   → @org/checkout only
```

### How match patterns work

Patterns starting with `**/` get scoped under each owned directory. The `**/` prefix is stripped and the rest is appended to the owned path:

```
Pattern:    **/locales/**/*.json
Owned path: libs/search
Resolved:   libs/search/locales/**/*.json
```

When there's a catch-all `*` owner, the pattern also stays global (`**/locales/**/*.json`), which covers any directory — including ones not declared in `own()`.

The generator uses the filesystem to verify that resolved pattern paths actually exist. If `libs/search` doesn't have a `locales` directory, no rule is emitted for it. It also walks the filesystem to discover directories that match the pattern but weren't declared in `own()`. For those discovered directories, ownership is inherited from the most specific parent that was declared with `own()`.

### Specificity and ordering

The generated file is sorted by specificity (ascending). More specific rules appear later and win:

```
* @org/platform                              # catches everything
libs/search @org/search                      # more specific, wins for libs/search
libs/search/locales/**/*.json @org/i18n      # even more specific, wins for locale files
```

When two match rules resolve to the same path, the more specific source pattern wins. Same specificity? Last declared wins.

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
own(platform, ["*", "libs/config"], "Platform owns the foundation and shared config");
```

Rendered above the group:

```
# Platform owns the foundation and shared config
# @org/platform (Platform & Infrastructure), @ci-bot
* @org/platform @ci-bot
libs/config @org/platform @ci-bot
```

### Match descriptions

```typescript
match("**/locales/**/*.json", {
  only: [i18n],
  description: "All locale files are reviewed by i18n — product teams opt in via en-US",
});
```

Rendered below the match header:

```
# ── Match: **/locales/**/*.json ──
# All locale files are reviewed by i18n — product teams opt in via en-US
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

## Programmatic API

```typescript
import { team, own, match, generate, write } from "codeowners-util";
```

### `team(name, description?)`

Creates a typed team handle. The optional description is used in generated comments.

### `own(owners, paths, description?)`

Declares ownership. Accepts a single team or array, and a single path or array.

### `match(pattern, opts)`

Creates a pattern-based rule. `opts` must include either `{ add: [...] }` or `{ only: [...] }`, and can include `{ description: "..." }`.

### `generate(config, options?)`

Returns the generated CODEOWNERS content as a string.

- `rootDir` — root directory for filesystem-aware resolution (default: `process.cwd()`)
- `fs` — custom filesystem implementation for testing (default: `node:fs`)

### `write(config, options)`

Writes the CODEOWNERS file to disk.

```typescript
write(config, { outputPath: ".github/CODEOWNERS" });

// Check mode — compare without writing
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
  own: OwnershipRule[];
  match?: MatchRule[];
}
```

## License

MIT

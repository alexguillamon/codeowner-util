import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const i18n = team("@org/i18n");
const qa = team("@org/qa");

// Rules run in declaration order, and each one builds on the one before it.
//
// 1. `only` sets every locale file to @org/i18n. @org/team-a is replaced.
// 2. `add` then stacks @org/qa on the en-US files.
//
// So the en-US files end up with @org/i18n and @org/qa. They must NOT list
// @org/team-a: the `add` rule stacks on the result of the `only` rule, not on
// the original own() owner.
//
// Reversing the two rules gives a different result, because the `only` rule
// would then discard @org/qa.
const config: CodeOwnersConfig = {
  always: [bot],
  own: [own(teamA, "libs/search")],
  match: [
    match("**/locales/**/*.json", { only: [i18n] }),
    match("**/locales/en-US/**/*.json", { add: [qa] }),
  ],
};

export default config;

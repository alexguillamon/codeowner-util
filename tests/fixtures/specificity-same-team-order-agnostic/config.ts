import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const i18n = team("@org/i18n");

// Declaration order decides the result, but not here.
//
// Both rules name the same team, @org/i18n. The `only` rule sets the owners
// to i18n, and the `add` rule adds i18n, which changes nothing. So this one
// config gives the same owners in either order.
//
// See specificity-declaration-order-decides for the general case, where the
// two rules name different teams and the order does change the result.
const config: CodeOwnersConfig = {
  always: [bot],
  own: [own(teamA, "libs/search")],
  match: [
    // Specific declared FIRST
    match("**/locales/en-US/**/*.json", { add: [i18n] }),
    // Broad declared SECOND
    match("**/locales/**/*.json", { only: [i18n] }),
  ],
};

export default config;

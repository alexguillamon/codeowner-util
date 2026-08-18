import { team, own, add, only } from "../../../src/index.js";
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
  rules: [
    // Specific declared FIRST
    add(i18n, "**/locales/en-US/**/*.json"),
    // Broad declared SECOND
    only(i18n, "**/locales/**/*.json"),
  ],
};

export default config;

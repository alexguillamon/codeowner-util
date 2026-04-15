import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const platform = team("@org/platform");
const teamA = team("@org/team-a");
const i18n = team("@org/i18n");

// * declared AFTER specific paths, combined with match rules.
// Direct rules must be sorted by specificity, match rules come after.
// The `add` rule inherits from each path's own owners — NOT from *.
const config: CodeOwnersConfig = {
  always: [bot],
  own: [
    own(teamA, "libs/auth"),
    own(platform, "*"),
  ],
  match: [
    match("**/locales/en-US/**/*.json", { add: [i18n] }),
  ],
};

export default config;

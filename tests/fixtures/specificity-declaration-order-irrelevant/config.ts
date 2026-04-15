import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const i18n = team("@org/i18n");

// Same as specificity-only-broad-add-specific but declarations are REVERSED.
// The output should be identical because the generator sorts by specificity.
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

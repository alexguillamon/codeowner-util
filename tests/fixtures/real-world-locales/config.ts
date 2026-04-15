import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const platform = team("@org/platform");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");
const teamC = team("@org/team-c");
const i18n = team("@org/i18n");

// Realistic locale ownership pattern:
// - All locale files owned exclusively by i18n
// - English source files inherit the product team
const config: CodeOwnersConfig = {
  always: [bot],
  own: [
    own(platform, "*"),
    own(teamA, ["libs/auth", "libs/search"]),
    own(teamB, ["libs/billing", "libs/payments"]),
    own(teamC, "libs/notifications"),
  ],
  match: [
    match("**/locales/**/*.json", { only: [i18n] }),
    match("**/locales/en-US/**/*.json", { add: [i18n] }),
  ],
};

export default config;

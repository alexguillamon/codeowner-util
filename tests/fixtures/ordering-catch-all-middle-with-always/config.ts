import { team, own } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const platform = team("@org/platform");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");

// * is declared in the MIDDLE — output must still sort by specificity.
const config: CodeOwnersConfig = {
  always: [bot],
  own: [
    own(teamA, "libs/auth"),
    own(platform, "*"),
    own(teamB, ["libs/billing", "libs/payments"]),
  ],
};

export default config;

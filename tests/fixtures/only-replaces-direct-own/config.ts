import { team, own, only } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");

// only() replaces the owners outright, including a direct own().
// teamA co-owns apps/web/config/settings/auth via own(), but the
// only() for **/settings/auth/** discards it and leaves teamB.
// Use add: [teamB] to keep teamA.
const config: CodeOwnersConfig = {
  always: [bot],
  own: [
    own(teamA, ["*", "apps/web"]),
    own(teamB, ["libs/auth"]),
    own([teamB, teamA], ["apps/web/config/settings/auth"]),
  ],
  rules: [only(teamB, "**/settings/auth/**")],
};

export default config;

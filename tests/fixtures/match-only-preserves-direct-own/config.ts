import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");

// match(only) should NOT strip directly declared owners.
// teamA co-owns apps/web/config/settings/auth via own(),
// so the match(only) for **/settings/auth/** should preserve teamA.
const config: CodeOwnersConfig = {
  always: [bot],
  own: [
    own(teamA, ["*", "apps/web"]),
    own(teamB, ["libs/auth"]),
    own([teamB, teamA], ["apps/web/config/settings/auth"]),
  ],
  match: [match("**/settings/auth/**", { only: [teamB] })],
};

export default config;

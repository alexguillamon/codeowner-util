import { team, own, add } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");
const teamC = team("@org/team-c");

// add() should stack on top of the inherited directory owner.
// teamA owns apps/web, teamB co-owns apps/web/config/settings/auth via own(),
// and add(teamC, ...) should add teamC on top of whoever owns the directory.
const config: CodeOwnersConfig = {
  always: [bot],
  own: [
    own(teamA, ["*", "apps/web"]),
    own([teamB, teamA], ["apps/web/config/settings/auth"]),
  ],
  rules: [add(teamC, "**/settings/auth/**")],
};

export default config;

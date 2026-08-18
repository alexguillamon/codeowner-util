import { team, own, only } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");

// only() SHOULD fully replace inherited owners when there is
// no direct own() on the overlapping path.
// teamA owns apps/web (parent), but there's no own() on apps/web/config/settings/auth,
// so only(teamB, ...) should replace teamA for files inside settings/auth.
const config: CodeOwnersConfig = {
  always: [bot],
  own: [
    own(teamA, ["*", "apps/web"]),
    own(teamB, ["libs/auth"]),
    // NOTE: no own() on apps/web/config/settings/auth — teamA is only inherited
  ],
  rules: [only(teamB, "**/settings/auth/**")],
};

export default config;

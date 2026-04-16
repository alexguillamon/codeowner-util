import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");

// match(only) SHOULD fully replace inherited owners when there is
// no direct own() on the overlapping path.
// teamA owns apps/web (parent), but there's no own() on apps/web/config/settings/auth,
// so match(only: [teamB]) should replace teamA for files inside settings/auth.
const config: CodeOwnersConfig = {
  always: [bot],
  own: [
    own(teamA, ["*", "apps/web"]),
    own(teamB, ["libs/auth"]),
    // NOTE: no own() on apps/web/config/settings/auth — teamA is only inherited
  ],
  match: [match("**/settings/auth/**", { only: [teamB] })],
};

export default config;

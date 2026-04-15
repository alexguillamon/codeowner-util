import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const platform = team("@org/platform");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");
const teamC = team("@org/team-c");
const enterprise = team("@org/enterprise");
const media = team("@org/media");
const i18n = team("@org/i18n");

// Full monorepo scenario with all teams, multiple match rules
const config: CodeOwnersConfig = {
  always: [bot],
  own: [
    own(platform, [
      "*",
      "apps/web",
      "apps/api",
      "libs/components",
      "libs/config",
      "libs/router",
      "libs/theme",
      "libs/utils",
    ]),
    own(teamA, [
      "libs/auth",
      "libs/auth-api",
      "libs/search",
      "libs/search-api",
    ]),
    own(teamB, [
      "libs/billing",
      "libs/billing-api",
      "libs/payments",
      "libs/analytics",
    ]),
    own(teamC, [
      "libs/notifications",
      "libs/notifications-api",
      "libs/dashboard",
    ]),
    own(enterprise, ["apps/admin", "libs/admin-components", "libs/policies"]),
    own(media, "libs/media"),
  ],
  match: [
    match("**/locales/**/*.json", { only: [i18n] }),
    match("**/locales/en-US/**/*.json", { add: [i18n] }),
  ],
};

export default config;

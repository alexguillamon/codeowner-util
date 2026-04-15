import { team, own } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const platform = team("@org/platform");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");

// Route files are just regular own declarations
const config: CodeOwnersConfig = {
  always: [bot],
  own: [
    own(platform, [
      "*",
      "apps/web/src/routes/auth.ts",
      "apps/web/src/routes/search.ts",
      "apps/web/src/routes/notifications.ts",
    ]),
    own(teamA, ["libs/auth", "libs/search"]),
    own(teamB, "libs/notifications"),
  ],
};

export default config;

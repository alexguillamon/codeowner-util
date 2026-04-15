import { team, own } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const platform = team("@org/platform");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");

const config: CodeOwnersConfig = {
  own: [
    own(platform, ["libs/config", "libs/components"]),
    own(teamA, ["libs/auth", "libs/search"]),
    own(teamB, "libs/notifications"),
  ],
};

export default config;

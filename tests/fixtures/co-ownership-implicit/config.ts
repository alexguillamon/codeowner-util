import { team, own } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");

// Two separate own() calls on the same path → merged automatically
const config: CodeOwnersConfig = {
  always: [bot],
  own: [
    own(teamA, ["libs/core", "libs/auth"]),
    own(teamB, ["libs/core", "libs/notifications"]),
  ],
};

export default config;

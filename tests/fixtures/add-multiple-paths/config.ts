import { team, own, add } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");
const teamC = team("@org/team-c");
const i18n = team("@org/i18n");

// One add rule expands across all owned paths
const config: CodeOwnersConfig = {
  always: [bot],
  own: [
    own(teamA, "libs/search"),
    own(teamB, "libs/notifications"),
    own(teamC, "libs/billing"),
  ],
  rules: [add(i18n, "**/locales/en-US/**/*.json")],
};

export default config;

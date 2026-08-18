import { team, own, only } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");
const security = team("@org/security");

// only rule should NOT include the parent team
const config: CodeOwnersConfig = {
  always: [bot],
  own: [own(teamA, "libs/search"), own(teamB, "libs/notifications")],
  rules: [only(security, "**/.env*")],
};

export default config;

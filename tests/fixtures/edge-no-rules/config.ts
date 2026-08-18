import { team, own } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const platform = team("@org/platform");
const teamA = team("@org/team-a");

const config: CodeOwnersConfig = {
  always: [bot],
  own: [own(platform, "*"), own(teamA, "libs/search")],
};

export default config;

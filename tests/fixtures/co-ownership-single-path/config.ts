import { team, own } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const teamA = team("@org/team-a");
const teamB = team("@org/team-b");

const config: CodeOwnersConfig = {
  own: [own([teamA, teamB], "libs/shared")],
};

export default config;

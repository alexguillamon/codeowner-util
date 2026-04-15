import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");
const i18n = team("@org/i18n");

const config: CodeOwnersConfig = {
  always: [bot],
  own: [own([teamA, teamB], "libs/shared")],
  match: [match("**/locales/en-US/**/*.json", { add: [i18n] })],
};

export default config;

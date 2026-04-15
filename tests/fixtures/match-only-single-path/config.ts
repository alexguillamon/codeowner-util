import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const i18n = team("@org/i18n");

const config: CodeOwnersConfig = {
  always: [bot],
  own: [own(teamA, "libs/search")],
  match: [match("**/locales/**/*.json", { only: [i18n] })],
};

export default config;

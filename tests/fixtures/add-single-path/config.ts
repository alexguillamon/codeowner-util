import { team, own, add } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const i18n = team("@org/i18n");

const config: CodeOwnersConfig = {
  always: [bot],
  own: [own(teamA, "libs/search")],
  rules: [add(i18n, "**/locales/en-US/**/*.json")],
};

export default config;

import { team, own, only } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const i18n = team("@org/i18n");
const security = team("@org/security");

const config: CodeOwnersConfig = {
  always: [bot],
  own: [own(teamA, "libs/search")],
  rules: [
    only(i18n, "**/locales/**/*.json"),
    only(security, "**/.env*"),
  ],
};

export default config;

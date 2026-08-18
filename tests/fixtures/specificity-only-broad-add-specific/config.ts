import { team, own, add, only } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");
const i18n = team("@org/i18n");

// The core locale pattern:
// - Broad "only" rule: all locale files → exclusively i18n
// - Specific "add" rule: en-US files → inherit parent + i18n
const config: CodeOwnersConfig = {
  always: [bot],
  own: [own(teamA, "libs/search"), own(teamB, "libs/notifications")],
  rules: [
    only(i18n, "**/locales/**/*.json"),
    add(i18n, "**/locales/en-US/**/*.json"),
  ],
};

export default config;

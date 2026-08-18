import { team, own, add, only } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const platform = team("@org/platform");
const teamA = team("@org/team-a");
const i18n = team("@org/i18n");

const config: CodeOwnersConfig = {
  always: [bot],
  teams: {
    "@org/platform": "Platform & Infrastructure",
    "@org/team-a": "Search Experience",
    "@org/i18n": "Internationalization",
  },
  own: [
    own(platform, "*", "Catch-all: platform owns everything by default"),
    own(teamA, ["libs/search", "libs/search-api"], "Search team owns search libs"),
    own([teamA, platform], "apps/web/src/routes/search.ts"),
  ],
  rules: [
    only(i18n, "**/locales/**/*.json", "All locale files are owned by the i18n team"),
    add(i18n, "**/locales/en-US/**/*.json", "English source strings need both product team and i18n review"),
  ],
};

export default config;

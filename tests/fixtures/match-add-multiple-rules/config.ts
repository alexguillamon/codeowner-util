import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const i18n = team("@org/i18n");
const qa = team("@org/qa");

// Multiple add rules each expand independently
const config: CodeOwnersConfig = {
  always: [bot],
  own: [own(teamA, "libs/search")],
  match: [
    match("**/locales/en-US/**/*.json", { add: [i18n] }),
    match("**/src/**/*.test.ts", { add: [qa] }),
  ],
};

export default config;

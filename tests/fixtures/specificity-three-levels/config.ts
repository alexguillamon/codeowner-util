import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const teamA = team("@org/team-a");
const i18n = team("@org/i18n");
const senior = team("@org/senior-translators");

// Three levels of specificity:
// 1. All locale files → only i18n
// 2. English source files → inherit parent + i18n
// 3. Critical file → inherit parent + senior translators
const config: CodeOwnersConfig = {
  always: [bot],
  own: [own(teamA, "libs/search")],
  match: [
    match("**/locales/**/*.json", { only: [i18n] }),
    match("**/locales/en-US/**/*.json", { add: [i18n] }),
    match("**/locales/en-US/critical/**/*.json", { add: [senior] }),
  ],
};

export default config;

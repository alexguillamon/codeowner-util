import { team, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const i18n = team("@org/i18n");

// Match rules with no owned paths — nothing to expand against
const config: CodeOwnersConfig = {
  own: [],
  match: [match("**/locales/**/*.json", { only: [i18n] })],
};

export default config;

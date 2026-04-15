import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const platform = team("@org/platform");
const i18n = team("@org/i18n");

// When the owned path is "*", the match pattern stays global
const config: CodeOwnersConfig = {
  own: [own(platform, "*")],
  match: [match("**/locales/en-US/**/*.json", { add: [i18n] })],
};

export default config;

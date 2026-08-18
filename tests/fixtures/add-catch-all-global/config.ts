import { team, own, add } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const platform = team("@org/platform");
const i18n = team("@org/i18n");

// When the owned path is "*", the match pattern stays global
const config: CodeOwnersConfig = {
  own: [own(platform, "*")],
  rules: [add(i18n, "**/locales/en-US/**/*.json")],
};

export default config;

import { team, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const i18n = team("@org/i18n");

// Match rules with no own() paths at all.
// Patterns are anchored at the repository root, so the rule still resolves
// against the real files. The locale files get the i18n team and nothing else.
const config: CodeOwnersConfig = {
  own: [],
  match: [match("**/locales/**/*.json", { only: [i18n] })],
};

export default config;

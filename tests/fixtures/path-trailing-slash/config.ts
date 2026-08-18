import { team, own, only } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const teamA = team("@org/team-a");
const i18n = team("@org/i18n");

// Trailing slash on owned path must NOT produce double slashes
// in expanded match rules (e.g. "stores//locales/..." is wrong).
const config: CodeOwnersConfig = {
  own: [own(teamA, "stores/")],
  rules: [only(i18n, "**/locales/**/*.json")],
};

export default config;

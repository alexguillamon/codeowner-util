import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const teamA = team("@org/team-a");
const i18n = team("@org/i18n");

// Trailing slash on owned path must NOT produce double slashes
// in expanded match rules (e.g. "stores//locales/..." is wrong).
const config: CodeOwnersConfig = {
  own: [own(teamA, "stores/")],
  match: [match("**/locales/**/*.json", { only: [i18n] })],
};

export default config;

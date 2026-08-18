import { team, own, only } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const foundation = team("@org/foundation");
const teamA = team("@org/team-a");
const i18n = team("@org/i18n");

// Glob patterns in own() (e.g. **/ruddertyper.yml) are valid CODEOWNERS
// direct rules, but must NOT have match patterns expanded against them —
// they reference files/patterns, not directories.
const config: CodeOwnersConfig = {
  own: [
    own(foundation, ["*", "**/ruddertyper.yml"]),
    own(teamA, "libs/auth"),
  ],
  rules: [only(i18n, "**/locales/**/*.json")],
};

export default config;

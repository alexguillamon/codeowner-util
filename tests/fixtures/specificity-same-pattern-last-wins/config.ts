import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const teamA = team("@org/team-a");
const i18n = team("@org/i18n");
const security = team("@org/security");

// Two match rules with the same pattern — later declaration wins
const config: CodeOwnersConfig = {
  own: [own(teamA, "libs/search")],
  match: [
    match("**/config/**/*.json", { only: [i18n] }),
    match("**/config/**/*.json", { add: [security] }),
  ],
};

export default config;

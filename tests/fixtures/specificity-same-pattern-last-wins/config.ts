import { team, own, add, only } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const teamA = team("@org/team-a");
const i18n = team("@org/i18n");
const security = team("@org/security");

// Two match rules with the same pattern — later declaration wins
const config: CodeOwnersConfig = {
  own: [own(teamA, "libs/search")],
  rules: [
    only(i18n, "**/config/**/*.json"),
    add(security, "**/config/**/*.json"),
  ],
};

export default config;

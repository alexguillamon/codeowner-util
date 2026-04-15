import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const teamA = team("@org/team-a");
const teamB = team("@org/team-b");
const i18n = team("@org/i18n");

const config: CodeOwnersConfig = {
  own: [
    own(teamA, ["libs/search", "libs/auth"]),
    own(teamB, "libs/notifications"),
  ],
  match: [match("**/locales/**/*.json", { only: [i18n] })],
};

export default config;

import { team, own } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const platform = team("@org/platform");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");

// * is declared LAST — output must still place it first (least specific)
// so CODEOWNERS "last matching rule wins" semantics work correctly.
const config: CodeOwnersConfig = {
  own: [
    own(teamA, "apps/web"),
    own(teamB, "libs/billing"),
    own(platform, "*"),
  ],
};

export default config;

import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const platform = team("@org/platform");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");
const security = team("@org/security");

// Multiple direct own() declarations overlap with the same global only pattern.
// teamA co-owns apps/web/config/settings/auth with platform,
// teamB co-owns apps/admin/config/settings/auth with platform.
// match(only: [security]) on **/settings/auth/** discards both sets of
// directly declared co-owners, because `only` replaces.
const config: CodeOwnersConfig = {
  always: [bot],
  own: [
    own(platform, ["*", "apps/web", "apps/admin"]),
    own([teamA, platform], ["apps/web/config/settings/auth"]),
    own([teamB, platform], ["apps/admin/config/settings/auth"]),
  ],
  match: [match("**/settings/auth/**", { only: [security] })],
};

export default config;

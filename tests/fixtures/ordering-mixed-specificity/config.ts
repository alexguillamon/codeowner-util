import { team, own } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const platform = team("@org/platform");
const teamA = team("@org/team-a");
const teamB = team("@org/team-b");
const teamC = team("@org/team-c");

// Paths declared in reverse specificity order.
// Output must sort by ascending specificity (for CODEOWNERS "last wins"),
// with stable sort preserving declaration order for equal specificity.
const config: CodeOwnersConfig = {
  own: [
    own(teamA, "apps/web/src/components"), // specificity 4
    own(teamB, "libs/billing"),            // specificity 2
    own(platform, "*"),                    // specificity 1
    own(teamC, "apps/web/src"),            // specificity 3
    own(teamA, "libs/auth"),               // specificity 2 (same as billing)
  ],
};

export default config;

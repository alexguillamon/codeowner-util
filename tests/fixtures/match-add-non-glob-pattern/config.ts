import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const teamA = team("@org/team-a");
const qa = team("@org/qa");

// Pattern without ** prefix gets appended directly
const config: CodeOwnersConfig = {
  own: [own(teamA, "libs/search")],
  match: [match("src/**/*.test.ts", { add: [qa] })],
};

export default config;

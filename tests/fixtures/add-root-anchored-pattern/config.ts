import { team, own, add } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const platform = team("@org/platform");
const teamA = team("@org/team-a");
const qa = team("@org/qa");

// A pattern without a `**/` prefix is anchored at the repository root.
// It matches `src/` at the root only. It does NOT match `libs/search/src/`.
// Write `**/src/**/*.test.ts` to match `src` at any depth.
const config: CodeOwnersConfig = {
  own: [own(platform, "*"), own(teamA, "libs/search")],
  rules: [add(qa, "src/**/*.test.ts")],
};

export default config;

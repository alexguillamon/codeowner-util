import { team, own, match } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const platform = team("@org/platform");
const security = team("@org/security");

// Only a catch-all + a match rule, no specific paths
const config: CodeOwnersConfig = {
  own: [own(platform, "*")],
  match: [match("**/.env*", { only: [security] })],
};

export default config;

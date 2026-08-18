import { team, own, only } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const platform = team("@org/platform");
const security = team("@org/security");

// Only a catch-all + a match rule, no specific paths
const config: CodeOwnersConfig = {
  own: [own(platform, "*")],
  rules: [only(security, "**/.env*")],
};

export default config;

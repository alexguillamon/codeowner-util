import { team, own } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const platform = team("@org/platform");

// always includes platform, and own also has platform → should dedup
const config: CodeOwnersConfig = {
  always: [platform],
  own: [own(platform, "libs/config")],
};

export default config;

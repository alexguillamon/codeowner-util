import { team, own } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const platform = team("@org/platform");

const config: CodeOwnersConfig = {
  own: [own(platform, ["libs/config", "libs/components", "libs/utils"])],
};

export default config;

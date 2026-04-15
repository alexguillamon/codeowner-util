import { team, own } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const alpha = team("@org/alpha");
const beta = team("@org/beta");
const gamma = team("@org/gamma");

// Order in the config should be preserved in the output
const config: CodeOwnersConfig = {
  own: [
    own(gamma, "libs/z-last"),
    own(alpha, "libs/a-first"),
    own(beta, "libs/m-middle"),
  ],
};

export default config;

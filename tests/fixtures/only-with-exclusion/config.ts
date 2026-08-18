import { team, own, only, add } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const bot = team("@ci-bot");
const commerceDev = team("@org/commerce-dev");
const airCars = team("@org/air-cars");
const stays = team("@org/stays");
const localization = team("@org/localization");

// A broad rule with a narrow carve-out.
//
// Locale files belong to the shared commerce team. English source strings do
// not: they stay with the team that owns the package, and localization
// reviews them as well.
//
// The `!` pattern is what makes this possible. Without it the only() rule
// would take the English files too, and no later rule could give them back an
// owner that differs per package.
const config: CodeOwnersConfig = {
  always: [bot],
  own: [
    own(commerceDev, "*"),
    own(airCars, "libs/air"),
    own(stays, "libs/stays"),
  ],
  rules: [
    only(commerceDev, ["**/locales/**/*.json", "!**/locales/en-US/**"]),
    add(localization, "**/locales/en-US/**/*.json"),
  ],
};

export default config;

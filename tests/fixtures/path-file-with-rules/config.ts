import { team, own, only } from "../../../src/index.js";
import type { CodeOwnersConfig } from "../../../src/index.js";

const teamA = team("@org/team-a");
const airCars = team("@org/air-cars");
const i18n = team("@org/i18n");

// File paths (e.g. .ts files) must NOT have match rules expanded against
// them — a file cannot contain subdirectories. Only directory-style paths
// should have match patterns appended.
const config: CodeOwnersConfig = {
  own: [
    own(teamA, "libs/auth"),
    own(airCars, "apps/portal/src/routes/cars.ts"),
  ],
  rules: [only(i18n, "**/locales/**/*.json")],
};

export default config;

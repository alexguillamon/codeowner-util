/**
 * Files on disk for this fixture.
 *
 * The generator resolves only()/add() rules against these paths, so every path
 * here is deliberate. Add a path to widen what a match rule can reach.
 */
const files: string[] = [
  "libs/billing/index.ts",
  "libs/billing/locales/en-US/sample.json",
  "libs/notifications/index.ts",
  "libs/notifications/locales/en-US/sample.json",
  "libs/search/index.ts",
  "libs/search/locales/en-US/deep/sample.json",
  "libs/search/locales/en-US/sample.json",
];

export default files;

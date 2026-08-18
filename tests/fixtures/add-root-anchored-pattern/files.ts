/**
 * Files on disk for this fixture.
 *
 * The generator resolves only()/add() rules against these paths, so every path
 * here is deliberate. Add a path to widen what a match rule can reach.
 */
const files: string[] = [
  // At the root, so `src/**/*.test.ts` matches it.
  "src/api.test.ts",
  // Below an owned path, so the root-anchored pattern must NOT match it.
  "libs/search/src/unit.test.ts",
  "libs/search/index.ts",
];

export default files;

/**
 * Files on disk for this fixture.
 *
 * The generator resolves only()/add() rules against these paths, so every path
 * here is deliberate. Add a path to widen what a match rule can reach.
 */
const files: string[] = [
  "apps/admin/config/settings/auth/index.ts",
  "apps/admin/index.ts",
  "apps/admin/settings/auth/sample.ts",
  "apps/web/config/settings/auth/index.ts",
  "apps/web/index.ts",
  "apps/web/settings/auth/deep/sample.ts",
  "apps/web/settings/auth/sample.ts",
];

export default files;

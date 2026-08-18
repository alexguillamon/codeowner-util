export { team, own, only, add, teamDescriptions } from "./api.js";
export { generate } from "./generate.js";
export { write } from "./write.js";
export type {
  Team,
  OwnershipRule,
  PolicyRule,
  OnlyRule,
  AddRule,
  CodeOwnersConfig,
  ResolvedRule,
  FsLike,
  GenerateOptions,
} from "./types.js";
export type { WriteOptions, WriteResult } from "./write.js";

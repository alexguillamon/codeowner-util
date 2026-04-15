import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { generate } from "./generate.js";
import type { CodeOwnersConfig } from "./types.js";

export interface WriteOptions {
  /** Path to write the CODEOWNERS file */
  outputPath: string;
  /** If true, compare against existing file instead of writing */
  check?: boolean;
}

export interface WriteResult {
  /** The generated content */
  content: string;
  /** Whether the file was written (false in check mode) */
  written: boolean;
  /** In check mode, whether the existing file matches the generated output */
  upToDate?: boolean;
}

/**
 * Generate a CODEOWNERS file from a config and write it to disk.
 *
 * In check mode, compares the generated output against the existing file
 * and returns whether it's up to date — without writing anything.
 */
export function write(
  config: CodeOwnersConfig,
  options: WriteOptions,
): WriteResult {
  const content = generate(config);

  if (options.check) {
    try {
      const existing = readFileSync(options.outputPath, "utf-8");
      return { content, written: false, upToDate: existing === content };
    } catch {
      return { content, written: false, upToDate: false };
    }
  }

  mkdirSync(dirname(options.outputPath), { recursive: true });
  writeFileSync(options.outputPath, content);
  return { content, written: true };
}

import { join } from "node:path";
import { Volume } from "memfs";

/**
 * Build a volume from the fixture's own `files.ts`.
 *
 * Every path is written by hand, so each fixture states exactly which files
 * its match rules can reach. A fixture without `files.ts` gets an empty
 * repository, which is all a config without match rules needs.
 */
export async function buildVolume(dir: string): Promise<Volume> {
  let files: string[] = [];
  try {
    files = (await import(join(dir, "files.ts"))).default;
  } catch {
    // No files.ts — this fixture needs no files on disk.
  }

  const json: Record<string, string | null> = {};
  for (const file of files) json[`/repo/${file}`] = "";
  if (files.length === 0) json["/repo"] = null;

  return Volume.fromJSON(json);
}

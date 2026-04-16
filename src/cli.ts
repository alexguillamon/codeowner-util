#!/usr/bin/env node

// Suppress Node's MODULE_TYPELESS_PACKAGE_JSON warning when importing .ts
// config files in projects without "type": "module" in their package.json.
const _origEmit = process.emit;
process.emit = function (event: string | symbol, ...args: unknown[]) {
  if (
    event === "warning" &&
    args[0] &&
    typeof args[0] === "object" &&
    "code" in args[0] &&
    args[0].code === "MODULE_TYPELESS_PACKAGE_JSON"
  ) {
    return false;
  }
  return _origEmit.apply(this, [event, ...args]);
};

import { resolve, dirname } from "node:path";
import { write } from "./write.js";

const DEFAULTS = {
  config: "codeowners.config.ts",
  output: ".github/CODEOWNERS",
} as const;

function printHelp(): void {
  console.log(`
Usage: codeowners-util [options]

Options:
  -c, --config <path>   Config file (default: ${DEFAULTS.config})
  -o, --output <path>   Output file (default: ${DEFAULTS.output})
      --check           Check if output is up to date (exit 1 if stale)
      --stdout          Print generated output to stdout
  -h, --help            Show this help message
`.trim());
}

function parseArgs(argv: string[]): {
  config: string;
  output: string;
  check: boolean;
  stdout: boolean;
} {
  let config: string = DEFAULTS.config;
  let output: string = DEFAULTS.output;
  let check = false;
  let stdout = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-c":
      case "--config":
        config = argv[++i];
        if (!config) {
          console.error("Error: --config requires a path argument");
          process.exit(2);
        }
        break;
      case "-o":
      case "--output":
        output = argv[++i];
        if (!output) {
          console.error("Error: --output requires a path argument");
          process.exit(2);
        }
        break;
      case "--check":
        check = true;
        break;
      case "--stdout":
        stdout = true;
        break;
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Error: unknown option "${arg}"`);
        printHelp();
        process.exit(2);
    }
  }

  return { config, output, check, stdout };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const configPath = resolve(opts.config);

  let configModule: { default?: unknown };
  try {
    configModule = await import(configPath);
  } catch (err) {
    console.error(`Error: could not load config file "${opts.config}"`);
    if (err instanceof Error) {
      console.error(err.message);
    }
    process.exit(2);
  }

  const config = configModule.default;
  if (!config || typeof config !== "object") {
    console.error(
      `Error: config file must have a default export of type CodeOwnersConfig`,
    );
    process.exit(2);
  }

  const rootDir = dirname(configPath);

  if (opts.stdout) {
    const { generate } = await import("./generate.js");
    const content = generate(config as Parameters<typeof generate>[0], {
      rootDir,
    });
    process.stdout.write(content);
    return;
  }

  const outputPath = resolve(opts.output);
  const result = write(config as Parameters<typeof write>[0], {
    outputPath,
    rootDir,
    check: opts.check,
  });

  if (opts.check) {
    if (result.upToDate) {
      console.log(`✓ ${opts.output} is up to date`);
    } else {
      console.error(`✗ ${opts.output} is out of date — run codeowners-util to update`);
      process.exit(1);
    }
    return;
  }

  console.log(`Wrote ${opts.output}`);
}

main();

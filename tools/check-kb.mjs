// Validates Markdown files in kb/.
// Design: pure function checkFile() for testability; the CLI walker is a thin
// shell around it so unit tests never touch the filesystem.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const KEBAB_MD = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

/**
 * Check a single kb file.
 * @param {string} name  — basename (e.g. "conventions.md")
 * @param {string} text  — full file contents
 * @returns {string[]}   — array of error strings; empty means valid
 */
export function checkFile(name, text) {
  const errors = [];

  if (!name.endsWith(".md")) {
    errors.push("filename must end in .md");
  } else if (!KEBAB_MD.test(name)) {
    errors.push("filename must be kebab-case (e.g. my-topic.md)");
  }

  if (text.trim() === "") {
    errors.push("file is empty");
    return errors; // further checks are meaningless on an empty file
  }

  const firstLine = text.split("\n")[0];
  if (!/^# .+/.test(firstLine)) {
    errors.push("first line must be an H1 (# followed by text)");
  }

  return errors;
}

// CLI: walk kb/ and report problems
async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield { full, name: entry.name };
  }
}

async function main() {
  const kbDir = new URL("../kb", import.meta.url).pathname;
  let count = 0;
  let hasError = false;

  for await (const { full, name } of walk(kbDir)) {
    const text = await readFile(full, "utf8");
    const errors = checkFile(name, text);
    if (errors.length) {
      for (const e of errors) console.error(`${full.replace(process.cwd() + "/", "")}: ${e}`);
      hasError = true;
    }
    count++;
  }

  if (hasError) {
    process.exit(1);
  } else {
    console.log(`kb ok (${count} files)`);
  }
}

// Run only when invoked directly (not when imported by tests)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

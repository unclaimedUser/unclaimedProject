import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkFile } from "./check-kb.mjs";

describe("checkFile", () => {
  it("accepts a valid file", () => {
    const errors = checkFile("my-topic.md", "# My Topic\n\nSome content.\n");
    assert.deepEqual(errors, []);
  });

  it("rejects an empty file", () => {
    const errors = checkFile("my-topic.md", "");
    assert.ok(errors.some((e) => e.includes("empty")));
  });

  it("rejects a file with no H1 on the first line", () => {
    const errors = checkFile("my-topic.md", "Some intro without a heading.\n");
    assert.ok(errors.some((e) => e.includes("H1")));
  });

  it("rejects a file whose first line is H2, not H1", () => {
    const errors = checkFile("my-topic.md", "## Not An H1\n\nContent.\n");
    assert.ok(errors.some((e) => e.includes("H1")));
  });

  it("rejects a non-kebab-case filename", () => {
    const errors = checkFile("MyTopic.md", "# My Topic\n\nContent.\n");
    assert.ok(errors.some((e) => e.includes("kebab-case")));
  });

  it("rejects a non-.md file", () => {
    const errors = checkFile("my-topic.txt", "# My Topic\n\nContent.\n");
    assert.ok(errors.some((e) => e.includes(".md")));
  });
});

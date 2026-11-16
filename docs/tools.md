# Tools

## kb linter (`tools/check-kb.mjs`)

Validates every Markdown file found under `kb/` against three rules:

1. The file is not empty.
2. The first line is an H1 (`# ` followed by text).
3. The filename is kebab-case and ends in `.md` (e.g. `conventions.md`, `my-topic.md`).

Prints one `path: error` line per problem and exits 1 if any errors were found,
or prints `kb ok (N files)` and exits 0 when everything is clean.

### How to run

```sh
# Run the linter against kb/
npm run check:kb

# Run the unit tests
npm test
```

### What the tests cover

| Test case | File checked |
|---|---|
| Valid file — no errors expected | `tools/check-kb.test.mjs` |
| Empty file — reports "empty" error | `tools/check-kb.test.mjs` |
| First line is plain text, no heading | `tools/check-kb.test.mjs` |
| First line is H2 (`##`), not H1 | `tools/check-kb.test.mjs` |
| Filename uses PascalCase (`MyTopic.md`) | `tools/check-kb.test.mjs` |
| Filename does not end in `.md` | `tools/check-kb.test.mjs` |

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Claude Code skill for finding citations in the works of Sri Aurobindo and The Mother via the [Incarnate Word](https://incarnateword.in) REST API.

## Running the Search Script

Requires [Bun](https://bun.sh) runtime. Run from the repo root:

```bash
bun run scripts/search.ts \
  --q "the divine life" --phrase true --stripHtml true
```

All flags: `--q` (required), `--phrase`, `--anyTerm`, `--auth` (`sa`|`m`|`any`), `--comp` (`cwsa`|`sabcl`|`arya`|`cwm`|`agenda`|`any`), `--vol`, `--page`, `--sortby`, `--searched`, `--priorityIndex`, `--stripHtml`, `--maxSnippet`.

Output: JSON to stdout (for piping), human-readable summary to stderr.

## Search Strategy

- `phrase=true` for exact quotes; `anyTerm=true` for partial/uncertain quotes.
- Author filter (`auth`): `sa` (Sri Aurobindo), `m` (The Mother), `any` (default).
- Compilation filter (`comp`): `cwsa`, `sabcl`, `arya`, `cwm`, `agenda`, `any` (default).
- For date-based searches, the API also supports `GET /api/v2/searchbyyear`.

---
name: incarnateword-citations
description: Find citations for Sri Aurobindo and The Mother quotes using the Incarnate Word (incarnateword.in) REST API. Use when a user provides a quote or fragment and asks for its source, citation, or matching passage across the full works of Sri Aurobindo and The Mother.
---

# Incarnate Word Citations

Use the Incarnate Word search API to locate matching passages and return verifiable citations.

## Quick Workflow

1. Normalize the query.
   - Trim whitespace, preserve punctuation when possible.
   - If the user provides an exact quote, prefer exact-phrase search (`phrase=true`, `anyTerm=false`).
   - If the quote is partial or uncertain, use `anyTerm=true` and `phrase=false` for recall, then narrow.
2. Call `GET /api/v2/search` with default scope covering both authors.
   - Default scope: `auth=any` and `comp=any`.
   - If the user asks for a specific author or compilation, set `auth`/`comp` accordingly.
3. Review top results and extract citations.
   - Prefer results with clear breadcrumbs (`path`) and stable `url`.
   - Use the returned `txt` snippet to verify the quote.
4. Return 3–5 best matches (or fewer if results are sparse).

## Output Expectations

Provide a short list of citations in Markdown. Each item should include:
- Author (Sri Aurobindo or The Mother)
- Work / compilation (e.g., CWSA, SABCL, CWM, Agenda, Arya)
- Volume (if present)
- Chapter / section (from `path` or title)
- Deep URL (preferred) or URL
- Short quote snippet (for verification)

If no strong matches are found, say so and suggest a refined query (shorter fragment, alternate spelling, or different phrasing).

## Script (Bun)

Use `scripts/search.ts` to query the API deterministically when needed.

Example:

```bash
bun run scripts/search.ts --q "the divine life" --phrase true --anyTerm false --auth any --comp any --page 1 --deepLink both
```

Helpful flags:
- `--stripHtml true` to remove HTML tags from snippets.
- `--maxSnippet 400` to truncate snippet length.
- `--deepLink <mode>` to generate deep links that highlight and scroll to the matching passage.

### Deep Link Modes (`--deepLink`)

- `search` — Appends `?search=<query>` to each URL. The site highlights all occurrences and scrolls to the first match. Fast (no extra API calls).
- `paragraph` — Fetches chapter content, identifies the matching paragraph, and appends `#pN`. The site scrolls to and highlights the paragraph background. Requires one extra API call per unique chapter.
- `both` — Combines both: `?search=<query>#pN`. Best user experience: scrolls to the paragraph and highlights the search terms within it.
- `none` — No deep linking (default, backward-compatible).

Always prefer `--deepLink both` when providing citations to the user, unless speed is critical (use `search`) or the query is too generic for text highlighting (use `paragraph`).

## Defaults and Heuristics

- Default search scope: all works of Sri Aurobindo and The Mother (`auth=any`, `comp=any`).
- Use `phrase=true` for direct quotes; fall back to `anyTerm=true` for paraphrases.
- If the quote includes a date, consider `GET /api/v2/searchbyyear`.
- Avoid over-filtering by volume unless the user requested it.

## Reference

See `references/api.md` for endpoint details and parameters.

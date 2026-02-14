# Incarnate Word API (from site bundle)

Base URL: `https://incarnateword.in`

## Search (primary)

`GET /api/v2/search`

Query params (observed in UI code):
- `q` (string, required): search query (URL-encoded)
- `page` (int, required)
- `auth` (string, optional): `sa` | `m` | `any`
- `comp` (string, optional): `cwsa` | `sabcl` | `arya` | `cwm` | `agenda` | `any`
- `vol` (string, optional): volume number or comma-separated list
- `phrase` (bool, optional): exact phrase search
- `anyTerm` (bool, optional): match any term
- `searched` (string, optional): `volumes` | `compilations` | `reference` | `conversation`
- `priorityIndex` (bool, optional): prioritize by index
- `sortby` (string, optional): `dateAsc` | `dateDesc` | `scoreAsc` | `scoreDesc` | `volumeChapterAsc` | `volumeChapterDesc`

Response (observed fields from a live query):
- `c`: array of results
  - `url`: string path like `/cwsa/13/mind-of-light`
  - `t`: string title
  - `txt`: string HTML snippet (includes tags like `<strong>` and line breaks)
  - `path`: array of `{ t: string; u?: string }` breadcrumbs
  - `searchedIn`: string (e.g., `volumes`)
- `Paging.TotalCount`: number
- `Paging.TotalPagesCount`: number
- `suggesters`: string[]
- `aggrs`: aggregates for filters (authors, compilations, volumes, searchedIn)

Example (conceptual):
`GET /api/v2/search?q=divine+life&page=1&auth=any&comp=any&phrase=true&anyTerm=false`

## Search By Date

`GET /api/v2/searchbyyear`

Query params (observed in UI code):
- `year` (start year)
- `yearEnd` (end year)
- `auth` (string)
- `month` (1–12)
- `date` (1–31)
- `page` (int)
- `sortby` (string)

Response:
- `c`: array of results (same structure as `/api/v2/search`)
- `Paging.TotalCount`, `Paging.TotalPagesCount`

## Search Within Book

`GET /api/v1/searchInBook`

Query params (observed in UI code):
- `q` (string)
- `page` (int)
- `comp` (string)
- `phrase` (bool)
- `anyTerm` (bool)
- `matchMulti` (bool)

Response:
- `c`: array of results with `txt`, `url`, `t`, `path`
- `Paging.TotalCount`, `Paging.TotalPagesCount`

## Chapter Content

`GET /api/{comp}/{vol}/{slug}`

Query params:
- `source` (string, optional): edition source
- `onlyOrignalText` (bool, optional): original text only

Response:
- `txt`: full chapter text (paragraphs separated by `\n\n`)
- `mot`: epigraph/motto (markdown blockquotes, rendered separately from `txt`)
- `t`: chapter title
- `paraByPara`: parallel translation data (if available)

Notes: Paragraphs in `txt` split on `\n\n` map 1:1 to the site's dynamic `p1`, `p2`, ... IDs (assigned by client-side JS to `<p>` elements inside `.text-bg`). The `mot` content renders in a separate `.motto` container and does not affect paragraph numbering.

## Deep Linking (site features)

The site supports paragraph-level deep links and text highlighting:

- `?search=<terms>` — highlights matching text (bold via mark.js) and scrolls to first match
- `#pN` — scrolls to and background-highlights paragraph N (1-indexed)
- `#pN-pM` — highlights a contiguous range of paragraphs
- `#pN,pM,pO` — highlights non-contiguous paragraphs
- Combined: `?search=<terms>#pN` — both text highlighting and paragraph anchoring

## Volumes / Metadata

- `GET /api/vnew/{auth}/{comp}` returns volume lists for a compilation
- `GET /api/v2/{comp}` returns compilation metadata

Notes:
- Use exact-phrase search for direct quotes; fall back to `anyTerm` for paraphrases.
- Prefer `deepUrl` (with `?search=` and/or `#pN`) from citations for the best user experience.
- Fall back to `url` from results for plain chapter-level citations.

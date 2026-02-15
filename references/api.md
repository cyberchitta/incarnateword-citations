# Incarnate Word API (from site bundle)

Base URL: `https://incarnateword.in`

## Search (primary)

`GET /api/v2/search`

Query params (observed in UI code):
- `q` (string, required): search query (URL-encoded)
- `page` (int, required)
- `auth` (string, optional): `sa` (Sri Aurobindo) | `m` (the Mother, NOT `mother`) | `any` (both authors)
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
- `onlyOrignalText` (bool, optional): original text only (note: typo "Orignal" is in actual API)

Response (two formats):

**Format 1: Direct text (simpler chapters)**
- `txt`: full chapter text (markdown format)
- `t`: chapter title
- `mot`: epigraph/motto (markdown blockquotes, rendered separately)
- `paraByPara`: parallel translation data (if available)

**Format 2: Items array (multi-section chapters)**
- `items`: array of section objects
  - `t`: section title (optional)
  - `txt`: section text (markdown format)
  - `dt`, `yr`, `mo`: date fields (optional)
- `t`: chapter title
- Other fields as in Format 1

### Browser Rendering Process (from incarnateword.in source)

The browser processes chapter content as follows:

1. **For items array:**
   ```javascript
   for (let l = 0; l < data.items.length; l++) {
       let finalData = "";
       if (data.items[l].hasOwnProperty("t")) {
           finalData += marked("##" + data.items[l].t);  // No options - creates H2
       }
       finalData += marked(data.items[l].txt,
           {breaks: true, smartypants: true, footnotes: true, gfm: true}) + "<hr>";
       bindhtml += finalData;
   }
   ```

2. **For direct txt:**
   ```javascript
   formedHtml = marked(data.txt,
       {breaks: true, smartypants: true, footnotes: true, gfm: true}) + "<hr>";
   ```

3. **Post-processing:**
   - Replace `[digit]` with `<strong>digit</strong>` (footnote markers)
   - Replace `@text@` with page number spans
   - Insert into `.text-bg` container

4. **Paragraph IDs:**
   - Paragraph IDs (`p1`, `p2`, ...) are assigned to `<p>` elements in DOM order
   - Only `<p>` tags count; `<h2>`, `<hr>`, and other elements are skipped
   - IDs are **1-indexed** (start at p1, not p0)

**Known Issue:** The script's paragraph counting for chapters with `items` arrays may be inaccurate due to subtle differences in markdown rendering. Manual verification recommended.

## Deep Linking (site features)

The site supports paragraph-level deep links and text highlighting:

- `?search=<terms>` — highlights matching text (bold via mark.js) and scrolls to first match
- `#pN` — scrolls to and background-highlights paragraph N (1-indexed)
- `#pN-pM` — highlights a contiguous range of paragraphs
- `#pN,pM,pO` — highlights non-contiguous paragraphs
- Combined: `?search=<terms>#pN` — both text highlighting and paragraph anchoring

**URL Encoding Caveats:**
- Search terms must be URL-encoded (spaces as `%20`, commas as `%2C`, etc.)
- Trailing punctuation is important for precise matching but can cause issues:
  - The `&` character can break URLs if not properly encoded as `%26`
  - Complex punctuation sequences (`,`, `-`, `&`) may need to be dropped for URL stability
- The script extracts search terms from `<strong>` tags in search results and attempts to preserve trailing punctuation (`.`, `,`, `;`, `:`, `!`, `?`)
- If a generated URL fails to load, try removing trailing punctuation from the search query

## Volumes / Metadata

- `GET /api/vnew/{auth}/{comp}` returns volume lists for a compilation
- `GET /api/v2/{comp}` returns compilation metadata

Notes:
- Use exact-phrase search for direct quotes; fall back to `anyTerm` for paraphrases.
- Prefer `deepUrl` (with `?search=` and/or `#pN`) from citations for the best user experience.
- Fall back to `url` from results for plain chapter-level citations.

#!/usr/bin/env bun

type DeepLinkMode = "search" | "paragraph" | "both" | "none";

type SearchParams = {
  q: string;
  page?: number;
  auth?: "sa" | "m" | "any";
  comp?: "cwsa" | "sabcl" | "arya" | "cwm" | "agenda" | "any";
  vol?: string;
  phrase?: boolean;
  anyTerm?: boolean;
  searched?: "volumes" | "compilations" | "reference" | "conversation";
  priorityIndex?: boolean;
  sortby?:
    | "dateAsc"
    | "dateDesc"
    | "scoreAsc"
    | "scoreDesc"
    | "volumeChapterAsc"
    | "volumeChapterDesc";
  stripHtml?: boolean;
  maxSnippet?: number;
  deepLink?: DeepLinkMode;
};

type ResultPath = { t: string; u?: string };

type SearchResult = {
  url: string;
  t: string;
  txt?: string;
  path?: ResultPath[];
  searchedIn?: string;
};

type SearchResponse = {
  c?: SearchResult[];
  Paging?: { TotalCount?: number; TotalPagesCount?: number };
  suggesters?: string[];
  aggrs?: unknown;
};

type ChapterResponse = {
  txt?: string;
};

const BASE_URL = "https://incarnateword.in";

function parseArgs(argv: string[]): SearchParams {
  const params: SearchParams = { q: "" };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "q") {
      params.q = next ?? "";
      i++;
      continue;
    }
    if (key === "page") {
      params.page = Number(next ?? 1);
      i++;
      continue;
    }
    if (key === "auth") {
      params.auth = (next as SearchParams["auth"]) ?? "any";
      i++;
      continue;
    }
    if (key === "comp") {
      params.comp = (next as SearchParams["comp"]) ?? "any";
      i++;
      continue;
    }
    if (key === "vol") {
      params.vol = next;
      i++;
      continue;
    }
    if (key === "phrase") {
      params.phrase = next === "true";
      i++;
      continue;
    }
    if (key === "anyTerm") {
      params.anyTerm = next === "true";
      i++;
      continue;
    }
    if (key === "searched") {
      params.searched = next as SearchParams["searched"];
      i++;
      continue;
    }
    if (key === "priorityIndex") {
      params.priorityIndex = next === "true";
      i++;
      continue;
    }
    if (key === "sortby") {
      params.sortby = next as SearchParams["sortby"];
      i++;
      continue;
    }
    if (key === "stripHtml") {
      params.stripHtml = next === "true";
      i++;
      continue;
    }
    if (key === "maxSnippet") {
      params.maxSnippet = Number(next ?? 0) || undefined;
      i++;
      continue;
    }
    if (key === "deepLink") {
      params.deepLink = (next as DeepLinkMode) ?? "search";
      i++;
      continue;
    }
  }
  return params;
}

function buildQuery(params: SearchParams): string {
  const q = new URLSearchParams();
  q.set("q", params.q);
  q.set("page", String(params.page ?? 1));
  if (params.auth && params.auth !== "any") q.set("auth", params.auth);
  if (params.comp && params.comp !== "any") q.set("comp", params.comp);
  if (params.vol) q.set("vol", params.vol);
  if (typeof params.phrase === "boolean") q.set("phrase", String(params.phrase));
  if (typeof params.anyTerm === "boolean") q.set("anyTerm", String(params.anyTerm));
  if (params.searched) q.set("searched", params.searched);
  if (typeof params.priorityIndex === "boolean") q.set("priorityIndex", String(params.priorityIndex));
  if (params.sortby) q.set("sortby", params.sortby);
  return q.toString();
}

function formatResult(r: SearchResult, deepUrl?: string): string {
  const title = r.t ?? "(untitled)";
  const url = r.url ?? "";
  const snippet = r.txt ? r.txt.replace(/\s+/g, " ").trim() : "";
  const crumbs = (r.path ?? []).map((p) => p.t).filter(Boolean).join(" > ");
  const lines = [
    `Title: ${title}`,
    crumbs ? `Path: ${crumbs}` : undefined,
    url ? `URL: ${BASE_URL}${url}` : undefined,
    deepUrl ? `Deep URL: ${deepUrl}` : undefined,
    snippet ? `Snippet: ${snippet}` : undefined,
  ].filter(Boolean);
  return lines.join("\n");
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalize text for fuzzy paragraph matching: strip HTML, collapse whitespace, lowercase. */
function normalizeText(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Fetch chapter content and return paragraphs split on double-newline. */
async function fetchChapterParagraphs(
  chapterUrl: string,
): Promise<string[] | null> {
  // chapterUrl is like /cwsa/22/the-divine-life
  const apiUrl = `${BASE_URL}/api${chapterUrl}?source=&onlyOrignalText=false`;
  try {
    const res = await fetch(apiUrl, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as ChapterResponse;
    if (!data.txt) return null;
    return data.txt.split(/\n\n+/).filter((s) => s.trim());
  } catch {
    return null;
  }
}

/** Find 1-indexed paragraph number(s) whose text contains the snippet. */
function findParagraphIds(
  paragraphs: string[],
  snippet: string,
): number[] {
  const norm = normalizeText(snippet);
  if (norm.length === 0) return [];

  // Try matching the full normalized snippet first
  const ids: number[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const paraNorm = normalizeText(paragraphs[i]);
    if (paraNorm.includes(norm)) {
      ids.push(i + 1); // 1-indexed to match site's p1, p2, ...
    }
  }
  if (ids.length > 0) return ids;

  // Fallback: use a contiguous substring from the middle of the snippet.
  // HTML stripping can introduce spacing artifacts at tag boundaries,
  // so take a clean interior substring that avoids edges.
  const len = norm.length;
  const start = Math.floor(len * 0.1);
  const end = Math.min(start + 80, len);
  const probe = norm.slice(start, end).trim();
  if (probe.length < 10) return [];

  for (let i = 0; i < paragraphs.length; i++) {
    const paraNorm = normalizeText(paragraphs[i]);
    if (paraNorm.includes(probe)) {
      ids.push(i + 1);
    }
  }
  return ids;
}

/** Build a deep link URL with ?search= and/or #pN based on mode. */
function buildDeepUrl(
  basePageUrl: string,
  query: string,
  paragraphIds: number[],
  mode: DeepLinkMode,
): string {
  let url = basePageUrl;
  if (mode === "search" || mode === "both") {
    url += `?search=${encodeURIComponent(query)}`;
  }
  if ((mode === "paragraph" || mode === "both") && paragraphIds.length > 0) {
    const anchor =
      paragraphIds.length === 1
        ? `p${paragraphIds[0]}`
        : paragraphIds.length === 2 &&
            paragraphIds[1] === paragraphIds[0] + 1
          ? `p${paragraphIds[0]}-p${paragraphIds[1]}`
          : paragraphIds.map((id) => `p${id}`).join(",");
    url += `#${anchor}`;
  }
  return url;
}

function toCitation(
  r: SearchResult,
  deepUrl?: string,
): Record<string, string> {
  const crumbs = (r.path ?? []).map((p) => p.t).filter(Boolean);
  const author = crumbs[0] ?? "";
  const work = crumbs[1] ?? "";
  const section = crumbs.slice(2).join(" > ");
  const pageUrl = r.url ? `${BASE_URL}${r.url}` : "";
  const citation: Record<string, string> = {
    author,
    work,
    section,
    title: r.t ?? "",
    url: pageUrl,
  };
  if (deepUrl) {
    citation.deepUrl = deepUrl;
  }
  return citation;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.q) {
    console.error("Missing --q. Example: bun run scripts/search.ts --q \"divine life\" --phrase true");
    process.exit(1);
  }
  const query = buildQuery(args);
  const url = `${BASE_URL}/api/v2/search?${query}`;
  const res = await fetch(url, { headers: { "accept": "application/json" } });
  if (!res.ok) {
    console.error(`Request failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const data = (await res.json()) as SearchResponse;
  const results = data.c ?? [];
  const cleanedResults = results.map((r) => {
    const txt = r.txt ?? "";
    const stripped = args.stripHtml ? stripHtml(txt) : txt;
    const trimmed =
      typeof args.maxSnippet === "number"
        ? stripped.slice(0, args.maxSnippet)
        : stripped;
    return { ...r, txt: trimmed };
  });

  const mode = args.deepLink ?? "none";
  const needsParagraphs = mode === "paragraph" || mode === "both";

  // For paragraph deep links, fetch chapter content per unique URL
  const chapterCache = new Map<string, string[] | null>();
  if (needsParagraphs) {
    const uniqueUrls = [...new Set(cleanedResults.map((r) => r.url).filter(Boolean))];
    // Fetch in parallel, limited to top 5 chapters to avoid excessive requests
    await Promise.all(
      uniqueUrls.slice(0, 5).map(async (chUrl) => {
        chapterCache.set(chUrl, await fetchChapterParagraphs(chUrl));
      }),
    );
  }

  // Build deep URLs for each result
  const deepUrls: (string | undefined)[] = cleanedResults.map((r) => {
    if (mode === "none" || !r.url) return undefined;
    const pageUrl = `${BASE_URL}${r.url}`;
    if (mode === "search") {
      return buildDeepUrl(pageUrl, args.q, [], mode);
    }
    const paragraphs = chapterCache.get(r.url);
    const paraIds =
      paragraphs && r.txt ? findParagraphIds(paragraphs, r.txt) : [];
    return buildDeepUrl(pageUrl, args.q, paraIds, mode);
  });

  const output = {
    query: args,
    total: data.Paging?.TotalCount ?? null,
    pages: data.Paging?.TotalPagesCount ?? null,
    results: cleanedResults,
    suggesters: data.suggesters ?? [],
    citations: cleanedResults.map((r, i) => toCitation(r, deepUrls[i])),
  };

  // Emit JSON to stdout (useful for piping) and a human summary to stderr.
  console.error(`Found ${cleanedResults.length} results (total: ${output.total ?? "?"}).`);
  if (cleanedResults.length) {
    console.error("\nTop results:\n");
    cleanedResults.slice(0, 5).forEach((r, i) => {
      console.error(`--- ${i + 1} ---`);
      console.error(formatResult(r, deepUrls[i]));
      console.error("");
    });
  }

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

#!/usr/bin/env bun

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

function formatResult(r: SearchResult): string {
  const title = r.t ?? "(untitled)";
  const url = r.url ?? "";
  const snippet = r.txt ? r.txt.replace(/\s+/g, " ").trim() : "";
  const crumbs = (r.path ?? []).map((p) => p.t).filter(Boolean).join(" > ");
  const lines = [
    `Title: ${title}`,
    crumbs ? `Path: ${crumbs}` : undefined,
    url ? `URL: ${BASE_URL}${url}` : undefined,
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

function toCitation(r: SearchResult): Record<string, string> {
  const crumbs = (r.path ?? []).map((p) => p.t).filter(Boolean);
  const author = crumbs[0] ?? "";
  const work = crumbs[1] ?? "";
  const section = crumbs.slice(2).join(" > ");
  return {
    author,
    work,
    section,
    title: r.t ?? "",
    url: r.url ? `${BASE_URL}${r.url}` : "",
  };
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

  const output = {
    query: args,
    total: data.Paging?.TotalCount ?? null,
    pages: data.Paging?.TotalPagesCount ?? null,
    results: cleanedResults,
    suggesters: data.suggesters ?? [],
    citations: cleanedResults.map(toCitation),
  };

  // Emit JSON to stdout (useful for piping) and a human summary to stderr.
  console.error(`Found ${cleanedResults.length} results (total: ${output.total ?? "?"}).`);
  if (cleanedResults.length) {
    console.error("\nTop results:\n");
    cleanedResults.slice(0, 5).forEach((r, i) => {
      console.error(`--- ${i + 1} ---`);
      console.error(formatResult(r));
      console.error("");
    });
  }

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

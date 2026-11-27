import type { Language } from "./companion";

export const pagePaths = {
  dashboard: "/dashboard",
  companion: "/companion",
  reading: "/reading",
  notes: "/notes",
  spanish: "/companion/maria",
  japanese: "/companion/akira",
} as const;

export type Page = keyof typeof pagePaths;
type Route = Page | "not-found";

export function pageAt(pathname: string): Route {
  if (readingArticleAt(pathname)) return "reading";
  if (pathname === "/") return "dashboard";
  const path = pathname.replace(/\/$/, "");
  return (Object.keys(pagePaths) as Page[]).find(page => pagePaths[page] === path) ?? "not-found";
}

export function readingArticleAt(pathname: string) {
  return /^\/reading\/([^/]+)\/?$/.exec(pathname)?.[1] ?? null;
}

export function readingPath(articleId: string) {
  return `${pagePaths.reading}/${articleId}`;
}

export function validReadingId(id: string) {
  return /^[a-f\d]{24}$/i.test(id);
}

export function roomFor(page: Route): Language | null {
  return page === "spanish" || page === "japanese" ? page : null;
}

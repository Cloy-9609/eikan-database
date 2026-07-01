/**
 * Minimal History API URL helpers.
 *
 * Keep this module pure: no DOM access, no global window access, and no URL
 * state normalization. Page modules remain responsible for canonical query
 * generation and pass the resulting pathname/search/hash parts here.
 */

function normalizeSearch(search = "") {
  const value = String(search ?? "");
  if (!value) {
    return "";
  }

  return value.startsWith("?") ? value : `?${value}`;
}

function normalizeHash(hash = "") {
  const value = String(hash ?? "");
  if (!value) {
    return "";
  }

  return value.startsWith("#") ? value : `#${value}`;
}

export function buildRelativeUrl({ pathname, search = "", hash = "" }) {
  return `${pathname}${normalizeSearch(search)}${normalizeHash(hash)}`;
}

export function writeHistoryUrl({ history, pathname, search = "", hash = "", replace = false, state = {} }) {
  const method = replace ? "replaceState" : "pushState";
  const nextUrl = buildRelativeUrl({ pathname, search, hash });

  history[method](state, "", nextUrl);

  return { method, nextUrl };
}

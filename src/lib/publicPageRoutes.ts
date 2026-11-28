// Static pages are canonical directory URLs. Handle SPA fallbacks for slashless links.
export function publicPageRedirect(pathname: string, search = "", hash = ""): string | null {
  return /^\/(support|privacy|terms)$/.test(pathname)
    ? `${pathname}/${search}${hash}`
    : null;
}

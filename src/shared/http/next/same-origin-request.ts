export function isSameOriginRequest(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null) return fetchSite === "same-origin";

  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(request.url).origin;
}
